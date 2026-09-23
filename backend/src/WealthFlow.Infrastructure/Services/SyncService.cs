using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Sync.DTOs;
using WealthFlow.Application.Features.Sync.Interfaces;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;
using WealthFlow.Infrastructure.Persistence;

namespace WealthFlow.Infrastructure.Services;

/// <summary>
/// Service responsible for reconciling offline client outbox mutations.
/// Enforces idempotent duplicate suppression, client GUID preservation, and ServerWins conflict resolution.
/// </summary>
public class SyncService : ISyncService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _dbContext;

    public SyncService(IUnitOfWork unitOfWork, ApplicationDbContext dbContext)
    {
        _unitOfWork = unitOfWork;
        _dbContext = dbContext;
    }

    public async Task<SyncBatchResponse> ProcessBatchAsync(
        Guid userId,
        SyncBatchRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Mutations == null || request.Mutations.Count == 0)
        {
            return new SyncBatchResponse(
                ProcessedCount: 0,
                SuccessCount: 0,
                ConflictCount: 0,
                FailureCount: 0,
                Results: Array.Empty<MutationResultDto>(),
                ServerTimestampUtc: DateTime.UtcNow
            );
        }

        var results = new List<MutationResultDto>();
        int successCount = 0;
        int conflictCount = 0;
        int failureCount = 0;

        await _unitOfWork.BeginTransactionAsync(cancellationToken);

        try
        {
            foreach (var mutation in request.Mutations)
            {
                // 1. Idempotency Check: suppress duplicate requests returning cached outcome
                var existingLog = await _unitOfWork.SyncOperationLogs.GetByIdempotencyKeyAsync(
                    mutation.IdempotencyKey,
                    cancellationToken);

                if (existingLog != null)
                {
                    results.Add(new MutationResultDto(
                        MutationId: mutation.Id,
                        IdempotencyKey: mutation.IdempotencyKey,
                        EntityName: mutation.EntityName,
                        EntityId: mutation.EntityId,
                        Status: "Duplicate",
                        ConflictReason: null,
                        Resolution: "CachedOutcome",
                        ServerTimestampUtc: DateTime.UtcNow,
                        ServerEntityStateJson: existingLog.ResultJson
                    ));
                    successCount++;
                    continue;
                }

                // 2. Process Mutation per Entity Type
                try
                {
                    var result = await ProcessSingleMutationAsync(userId, mutation, cancellationToken);
                    results.Add(result);

                    if (result.Status == "Synced")
                    {
                        successCount++;
                    }
                    else if (result.Status == "Conflict")
                    {
                        conflictCount++;
                    }
                    else
                    {
                        failureCount++;
                    }
                }
                catch (Exception ex)
                {
                    failureCount++;
                    var errorResult = new MutationResultDto(
                        MutationId: mutation.Id,
                        IdempotencyKey: mutation.IdempotencyKey,
                        EntityName: mutation.EntityName,
                        EntityId: mutation.EntityId,
                        Status: "Failed",
                        ConflictReason: null,
                        Resolution: null,
                        ServerTimestampUtc: DateTime.UtcNow,
                        ErrorMessage: ex.Message
                    );
                    results.Add(errorResult);

                    var failLog = new SyncOperationLog(
                        userId: userId,
                        idempotencyKey: mutation.IdempotencyKey,
                        entityName: mutation.EntityName,
                        operation: mutation.Operation,
                        entityId: mutation.EntityId,
                        clientTimestampUtc: mutation.ClientTimestampUtc,
                        status: "Failed",
                        payloadJson: mutation.PayloadJson,
                        conflictReason: ex.Message
                    );
                    await _unitOfWork.SyncOperationLogs.AddAsync(failLog, cancellationToken);
                }
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitTransactionAsync(cancellationToken);
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync(cancellationToken);
            throw;
        }

        return new SyncBatchResponse(
            ProcessedCount: results.Count,
            SuccessCount: successCount,
            ConflictCount: conflictCount,
            FailureCount: failureCount,
            Results: results,
            ServerTimestampUtc: DateTime.UtcNow
        );
    }

    private async Task<MutationResultDto> ProcessSingleMutationAsync(
        Guid userId,
        ClientMutationDto mutation,
        CancellationToken cancellationToken)
    {
        var op = mutation.Operation.ToUpperInvariant();
        var entityName = mutation.EntityName.ToLowerInvariant();

        switch (entityName)
        {
            case "transaction":
                return await HandleTransactionMutationAsync(userId, mutation, op, cancellationToken);

            case "trip":
                return await HandleTripMutationAsync(userId, mutation, op, cancellationToken);

            case "account":
                return await HandleAccountMutationAsync(userId, mutation, op, cancellationToken);

            case "category":
                return await HandleCategoryMutationAsync(userId, mutation, op, cancellationToken);

            default:
                throw new NotSupportedException($"Entity type '{mutation.EntityName}' is not supported for background synchronization.");
        }
    }

    private async Task<MutationResultDto> HandleTransactionMutationAsync(
        Guid userId,
        ClientMutationDto mutation,
        string op,
        CancellationToken cancellationToken)
    {
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(mutation.PayloadJson) ? "{}" : mutation.PayloadJson);
        var root = doc.RootElement;

        if (op == "CREATE")
        {
            // Verify if transaction already exists with client-generated GUID
            var existingTx = await _unitOfWork.Transactions.GetByIdAsync(mutation.EntityId, cancellationToken);
            if (existingTx != null)
            {
                return new MutationResultDto(
                    MutationId: mutation.Id,
                    IdempotencyKey: mutation.IdempotencyKey,
                    EntityName: "Transaction",
                    EntityId: mutation.EntityId,
                    Status: "Duplicate",
                    ConflictReason: null,
                    Resolution: "AlreadyExists",
                    ServerTimestampUtc: DateTime.UtcNow
                );
            }

            var accountId = GetGuid(root, "accountId", "account_id") ?? throw new ArgumentException("accountId is required for Transaction.");
            var amount = GetDecimal(root, "amount") ?? throw new ArgumentException("amount is required for Transaction.");
            var txDate = GetDateTime(root, "transactionDate", "date", "txDate") ?? DateTime.UtcNow;
            var eventTypeStr = GetString(root, "eventType", "type") ?? "Expense";
            var description = GetString(root, "description", "desc") ?? "Offline Transaction";
            var categoryId = GetGuid(root, "categoryId", "category_id");
            var merchant = GetString(root, "merchant");
            var notes = GetString(root, "notes");
            var tags = GetString(root, "tags");

            if (!Enum.TryParse<TransactionEventType>(eventTypeStr, true, out var eventType))
            {
                eventType = TransactionEventType.Expense;
            }

            var account = await _unitOfWork.Accounts.GetByIdAsync(accountId, cancellationToken);
            if (account == null || account.UserId != userId)
            {
                throw new KeyNotFoundException($"Account with ID {accountId} does not belong to user.");
            }

            // Adjust balance
            if (IsCreditEvent(eventType))
            {
                account.AdjustBalance(amount);
            }
            else
            {
                account.AdjustBalance(-amount);
            }

            // Client GUID Preservation: use mutation.EntityId
            var tx = new Transaction(
                userId: userId,
                accountId: accountId,
                amount: amount,
                transactionDate: txDate,
                eventType: eventType,
                description: description,
                categoryId: categoryId,
                merchant: merchant,
                notes: notes,
                tags: tags,
                linkedEntityId: null,
                idempotencyKey: mutation.IdempotencyKey,
                syncStatus: SyncStatus.Synced,
                id: mutation.EntityId
            );

            await _unitOfWork.Transactions.AddAsync(tx, cancellationToken);

            var log = new SyncOperationLog(
                userId: userId,
                idempotencyKey: mutation.IdempotencyKey,
                entityName: "Transaction",
                operation: op,
                entityId: mutation.EntityId,
                clientTimestampUtc: mutation.ClientTimestampUtc,
                status: "Synced",
                payloadJson: mutation.PayloadJson
            );
            await _unitOfWork.SyncOperationLogs.AddAsync(log, cancellationToken);

            return new MutationResultDto(
                MutationId: mutation.Id,
                IdempotencyKey: mutation.IdempotencyKey,
                EntityName: "Transaction",
                EntityId: mutation.EntityId,
                Status: "Synced",
                ConflictReason: null,
                Resolution: null,
                ServerTimestampUtc: DateTime.UtcNow
            );
        }
        else if (op == "UPDATE")
        {
            var tx = await _unitOfWork.Transactions.GetByIdAsync(mutation.EntityId, cancellationToken);
            if (tx == null || tx.UserId != userId)
            {
                throw new KeyNotFoundException($"Transaction {mutation.EntityId} not found.");
            }

            // ServerWins Conflict Detection: If server has a newer update than client's edit time
            var lastModified = tx.UpdatedAtUtc ?? tx.CreatedAtUtc;
            if (lastModified > mutation.ClientTimestampUtc)
            {
                var serverState = JsonSerializer.Serialize(new
                {
                    tx.Id,
                    tx.AccountId,
                    tx.Amount,
                    tx.TransactionDate,
                    EventType = tx.EventType.ToString(),
                    tx.Description,
                    tx.CategoryId,
                    tx.UpdatedAtUtc
                });

                var conflictLog = new SyncOperationLog(
                    userId: userId,
                    idempotencyKey: mutation.IdempotencyKey,
                    entityName: "Transaction",
                    operation: op,
                    entityId: mutation.EntityId,
                    clientTimestampUtc: mutation.ClientTimestampUtc,
                    status: "Conflict",
                    payloadJson: mutation.PayloadJson,
                    conflictReason: "ConcurrentEdit",
                    resolution: "ServerWins",
                    resultJson: serverState
                );
                await _unitOfWork.SyncOperationLogs.AddAsync(conflictLog, cancellationToken);

                return new MutationResultDto(
                    MutationId: mutation.Id,
                    IdempotencyKey: mutation.IdempotencyKey,
                    EntityName: "Transaction",
                    EntityId: mutation.EntityId,
                    Status: "Conflict",
                    ConflictReason: "ConcurrentEdit",
                    Resolution: "ServerWins",
                    ServerTimestampUtc: DateTime.UtcNow,
                    ServerEntityStateJson: serverState
                );
            }

            // Apply Update
            var newAccountId = GetGuid(root, "accountId", "account_id") ?? tx.AccountId;
            var newAmount = GetDecimal(root, "amount") ?? tx.Amount;
            var newTxDate = GetDateTime(root, "transactionDate", "date", "txDate") ?? tx.TransactionDate;
            var newDesc = GetString(root, "description", "desc") ?? tx.Description;
            var newCatId = GetGuid(root, "categoryId", "category_id") ?? tx.CategoryId;
            var newMerchant = GetString(root, "merchant") ?? tx.Merchant;
            var newNotes = GetString(root, "notes") ?? tx.Notes;
            var newTags = GetString(root, "tags") ?? tx.Tags;

            // Revert old impact on account
            var currentAccount = await _unitOfWork.Accounts.GetByIdAsync(tx.AccountId, cancellationToken);
            if (currentAccount != null)
            {
                if (IsCreditEvent(tx.EventType)) currentAccount.AdjustBalance(-tx.Amount);
                else currentAccount.AdjustBalance(tx.Amount);
            }

            // Apply new impact
            var targetAccount = (newAccountId == tx.AccountId) ? currentAccount : await _unitOfWork.Accounts.GetByIdAsync(newAccountId, cancellationToken);
            if (targetAccount != null)
            {
                if (IsCreditEvent(tx.EventType)) targetAccount.AdjustBalance(newAmount);
                else targetAccount.AdjustBalance(-newAmount);
            }

            tx.Update(newAccountId, newCatId, newAmount, newTxDate, newDesc, newMerchant, newNotes, newTags);

            var log = new SyncOperationLog(
                userId: userId,
                idempotencyKey: mutation.IdempotencyKey,
                entityName: "Transaction",
                operation: op,
                entityId: mutation.EntityId,
                clientTimestampUtc: mutation.ClientTimestampUtc,
                status: "Synced",
                payloadJson: mutation.PayloadJson
            );
            await _unitOfWork.SyncOperationLogs.AddAsync(log, cancellationToken);

            return new MutationResultDto(
                MutationId: mutation.Id,
                IdempotencyKey: mutation.IdempotencyKey,
                EntityName: "Transaction",
                EntityId: mutation.EntityId,
                Status: "Synced",
                ConflictReason: null,
                Resolution: null,
                ServerTimestampUtc: DateTime.UtcNow
            );
        }
        else if (op == "DELETE")
        {
            var tx = await _unitOfWork.Transactions.GetByIdAsync(mutation.EntityId, cancellationToken);
            if (tx != null && tx.UserId == userId)
            {
                var account = await _unitOfWork.Accounts.GetByIdAsync(tx.AccountId, cancellationToken);
                if (account != null)
                {
                    if (IsCreditEvent(tx.EventType)) account.AdjustBalance(-tx.Amount);
                    else account.AdjustBalance(tx.Amount);
                }
                tx.SoftDelete();
            }

            var log = new SyncOperationLog(
                userId: userId,
                idempotencyKey: mutation.IdempotencyKey,
                entityName: "Transaction",
                operation: op,
                entityId: mutation.EntityId,
                clientTimestampUtc: mutation.ClientTimestampUtc,
                status: "Synced",
                payloadJson: mutation.PayloadJson
            );
            await _unitOfWork.SyncOperationLogs.AddAsync(log, cancellationToken);

            return new MutationResultDto(
                MutationId: mutation.Id,
                IdempotencyKey: mutation.IdempotencyKey,
                EntityName: "Transaction",
                EntityId: mutation.EntityId,
                Status: "Synced",
                ConflictReason: null,
                Resolution: null,
                ServerTimestampUtc: DateTime.UtcNow
            );
        }

        throw new InvalidOperationException($"Operation '{op}' not supported for Transaction.");
    }

    private async Task<MutationResultDto> HandleTripMutationAsync(
        Guid userId,
        ClientMutationDto mutation,
        string op,
        CancellationToken cancellationToken)
    {
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(mutation.PayloadJson) ? "{}" : mutation.PayloadJson);
        var root = doc.RootElement;

        if (op == "CREATE")
        {
            var existingTrip = await _unitOfWork.Trips.GetByIdAsync(mutation.EntityId, cancellationToken);
            if (existingTrip != null)
            {
                return new MutationResultDto(
                    MutationId: mutation.Id,
                    IdempotencyKey: mutation.IdempotencyKey,
                    EntityName: "Trip",
                    EntityId: mutation.EntityId,
                    Status: "Duplicate",
                    ConflictReason: null,
                    Resolution: "AlreadyExists",
                    ServerTimestampUtc: DateTime.UtcNow
                );
            }

            var name = GetString(root, "name") ?? "Offline Trip";
            var destination = GetString(root, "destination") ?? "";
            var startDate = GetDateTime(root, "startDate", "start_date") ?? DateTime.UtcNow;
            var endDate = GetDateTime(root, "endDate", "end_date") ?? DateTime.UtcNow.AddDays(4);
            var budget = GetDecimal(root, "budget");

            // Preserve client-generated GUID
            var trip = new Trip(
                hostUserId: userId,
                name: name,
                destination: destination,
                startDate: startDate,
                endDate: endDate,
                budget: budget,
                status: TripStatus.Planning,
                id: mutation.EntityId
            );
            await _unitOfWork.Trips.AddAsync(trip, cancellationToken);

            // Add host participant
            var hostMember = new TripMember(
                tripId: mutation.EntityId,
                guestName: "You (Host)",
                registeredUserId: userId,
                canAddExpenses: true
            );
            await _unitOfWork.TripMembers.AddAsync(hostMember, cancellationToken);

            var log = new SyncOperationLog(
                userId: userId,
                idempotencyKey: mutation.IdempotencyKey,
                entityName: "Trip",
                operation: op,
                entityId: mutation.EntityId,
                clientTimestampUtc: mutation.ClientTimestampUtc,
                status: "Synced",
                payloadJson: mutation.PayloadJson
            );
            await _unitOfWork.SyncOperationLogs.AddAsync(log, cancellationToken);

            return new MutationResultDto(
                MutationId: mutation.Id,
                IdempotencyKey: mutation.IdempotencyKey,
                EntityName: "Trip",
                EntityId: mutation.EntityId,
                Status: "Synced",
                ConflictReason: null,
                Resolution: null,
                ServerTimestampUtc: DateTime.UtcNow
            );
        }
        else if (op == "UPDATE")
        {
            var trip = await _unitOfWork.Trips.GetByIdAsync(mutation.EntityId, cancellationToken);
            if (trip == null || trip.HostUserId != userId)
            {
                throw new KeyNotFoundException($"Trip {mutation.EntityId} not found.");
            }

            var lastModified = trip.UpdatedAtUtc ?? trip.CreatedAtUtc;
            if (lastModified > mutation.ClientTimestampUtc)
            {
                var serverState = JsonSerializer.Serialize(new
                {
                    trip.Id,
                    trip.Name,
                    trip.Destination,
                    trip.StartDate,
                    trip.EndDate,
                    trip.Budget,
                    Status = trip.Status.ToString(),
                    trip.UpdatedAtUtc
                });

                var conflictLog = new SyncOperationLog(
                    userId: userId,
                    idempotencyKey: mutation.IdempotencyKey,
                    entityName: "Trip",
                    operation: op,
                    entityId: mutation.EntityId,
                    clientTimestampUtc: mutation.ClientTimestampUtc,
                    status: "Conflict",
                    payloadJson: mutation.PayloadJson,
                    conflictReason: "ConcurrentEdit",
                    resolution: "ServerWins",
                    resultJson: serverState
                );
                await _unitOfWork.SyncOperationLogs.AddAsync(conflictLog, cancellationToken);

                return new MutationResultDto(
                    MutationId: mutation.Id,
                    IdempotencyKey: mutation.IdempotencyKey,
                    EntityName: "Trip",
                    EntityId: mutation.EntityId,
                    Status: "Conflict",
                    ConflictReason: "ConcurrentEdit",
                    Resolution: "ServerWins",
                    ServerTimestampUtc: DateTime.UtcNow,
                    ServerEntityStateJson: serverState
                );
            }

            var name = GetString(root, "name") ?? trip.Name;
            var destination = GetString(root, "destination") ?? trip.Destination;
            var startDate = GetDateTime(root, "startDate", "start_date") ?? trip.StartDate;
            var endDate = GetDateTime(root, "endDate", "end_date") ?? trip.EndDate;
            var budget = GetDecimal(root, "budget") ?? trip.Budget;

            trip.UpdateDetails(name, destination, startDate, endDate, budget);

            var log = new SyncOperationLog(
                userId: userId,
                idempotencyKey: mutation.IdempotencyKey,
                entityName: "Trip",
                operation: op,
                entityId: mutation.EntityId,
                clientTimestampUtc: mutation.ClientTimestampUtc,
                status: "Synced",
                payloadJson: mutation.PayloadJson
            );
            await _unitOfWork.SyncOperationLogs.AddAsync(log, cancellationToken);

            return new MutationResultDto(
                MutationId: mutation.Id,
                IdempotencyKey: mutation.IdempotencyKey,
                EntityName: "Trip",
                EntityId: mutation.EntityId,
                Status: "Synced",
                ConflictReason: null,
                Resolution: null,
                ServerTimestampUtc: DateTime.UtcNow
            );
        }
        else if (op == "DELETE")
        {
            var trip = await _unitOfWork.Trips.GetByIdAsync(mutation.EntityId, cancellationToken);
            if (trip != null && trip.HostUserId == userId)
            {
                trip.SoftDelete();
            }

            var log = new SyncOperationLog(
                userId: userId,
                idempotencyKey: mutation.IdempotencyKey,
                entityName: "Trip",
                operation: op,
                entityId: mutation.EntityId,
                clientTimestampUtc: mutation.ClientTimestampUtc,
                status: "Synced",
                payloadJson: mutation.PayloadJson
            );
            await _unitOfWork.SyncOperationLogs.AddAsync(log, cancellationToken);

            return new MutationResultDto(
                MutationId: mutation.Id,
                IdempotencyKey: mutation.IdempotencyKey,
                EntityName: "Trip",
                EntityId: mutation.EntityId,
                Status: "Synced",
                ConflictReason: null,
                Resolution: null,
                ServerTimestampUtc: DateTime.UtcNow
            );
        }

        throw new InvalidOperationException($"Operation '{op}' not supported for Trip.");
    }

    private async Task<MutationResultDto> HandleAccountMutationAsync(
        Guid userId,
        ClientMutationDto mutation,
        string op,
        CancellationToken cancellationToken)
    {
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(mutation.PayloadJson) ? "{}" : mutation.PayloadJson);
        var root = doc.RootElement;

        if (op == "CREATE")
        {
            var name = GetString(root, "name") ?? "Offline Account";
            var typeStr = GetString(root, "accountType", "type") ?? "Bank";
            var openingBalance = GetDecimal(root, "openingBalance", "initialBalance", "balance") ?? 0m;
            var mask = GetString(root, "accountNumberMask", "mask");

            if (!Enum.TryParse<AccountType>(typeStr, true, out var accountType))
            {
                accountType = AccountType.Bank;
            }

            var account = new Account(
                userId: userId,
                name: name,
                accountType: accountType,
                openingBalance: openingBalance,
                accountNumberMask: mask,
                id: mutation.EntityId
            );
            await _unitOfWork.Accounts.AddAsync(account, cancellationToken);

            var log = new SyncOperationLog(
                userId: userId,
                idempotencyKey: mutation.IdempotencyKey,
                entityName: "Account",
                operation: op,
                entityId: mutation.EntityId,
                clientTimestampUtc: mutation.ClientTimestampUtc,
                status: "Synced",
                payloadJson: mutation.PayloadJson
            );
            await _unitOfWork.SyncOperationLogs.AddAsync(log, cancellationToken);

            return new MutationResultDto(
                MutationId: mutation.Id,
                IdempotencyKey: mutation.IdempotencyKey,
                EntityName: "Account",
                EntityId: mutation.EntityId,
                Status: "Synced",
                ConflictReason: null,
                Resolution: null,
                ServerTimestampUtc: DateTime.UtcNow
            );
        }

        return new MutationResultDto(
            MutationId: mutation.Id,
            IdempotencyKey: mutation.IdempotencyKey,
            EntityName: "Account",
            EntityId: mutation.EntityId,
            Status: "Synced",
            ConflictReason: null,
            Resolution: null,
            ServerTimestampUtc: DateTime.UtcNow
        );
    }

    private async Task<MutationResultDto> HandleCategoryMutationAsync(
        Guid userId,
        ClientMutationDto mutation,
        string op,
        CancellationToken cancellationToken)
    {
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(mutation.PayloadJson) ? "{}" : mutation.PayloadJson);
        var root = doc.RootElement;

        if (op == "CREATE")
        {
            var name = GetString(root, "name") ?? "Offline Category";
            var icon = GetString(root, "icon");
            var color = GetString(root, "colorHex", "color");

            var cat = new Category(
                name: name,
                userId: userId,
                icon: icon,
                colorHex: color,
                id: mutation.EntityId
            );
            await _unitOfWork.Categories.AddAsync(cat, cancellationToken);
        }

        var log = new SyncOperationLog(
            userId: userId,
            idempotencyKey: mutation.IdempotencyKey,
            entityName: "Category",
            operation: op,
            entityId: mutation.EntityId,
            clientTimestampUtc: mutation.ClientTimestampUtc,
            status: "Synced",
            payloadJson: mutation.PayloadJson
        );
        await _unitOfWork.SyncOperationLogs.AddAsync(log, cancellationToken);

        return new MutationResultDto(
            MutationId: mutation.Id,
            IdempotencyKey: mutation.IdempotencyKey,
            EntityName: "Category",
            EntityId: mutation.EntityId,
            Status: "Synced",
            ConflictReason: null,
            Resolution: null,
            ServerTimestampUtc: DateTime.UtcNow
        );
    }

    public async Task<IReadOnlyList<SyncOperationLogDto>> GetConflictLogsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var logs = await _unitOfWork.SyncOperationLogs.GetConflictLogsByUserAsync(userId, cancellationToken);
        return logs.Select(l => new SyncOperationLogDto(
            Id: l.Id,
            UserId: l.UserId,
            IdempotencyKey: l.IdempotencyKey,
            EntityName: l.EntityName,
            Operation: l.Operation,
            EntityId: l.EntityId,
            ClientTimestampUtc: l.ClientTimestampUtc,
            ServerTimestampUtc: l.ServerTimestampUtc,
            Status: l.Status,
            ConflictReason: l.ConflictReason,
            Resolution: l.Resolution,
            PayloadJson: l.PayloadJson
        )).ToList();
    }

    public async Task<SyncTelemetryDto> GetSyncTelemetryAsync(
        CancellationToken cancellationToken = default)
    {
        var (totalToday, conflictToday, deadLetter) = await _unitOfWork.SyncOperationLogs.GetTelemetryStatsAsync(cancellationToken);
        var recent = await _unitOfWork.SyncOperationLogs.GetRecentLogsAsync(50, cancellationToken);

        return new SyncTelemetryDto(
            TotalProcessedToday: totalToday,
            ConflictCountToday: conflictToday,
            DeadLetterCount: deadLetter,
            RecentOperations: recent.Select(l => new SyncOperationLogDto(
                Id: l.Id,
                UserId: l.UserId,
                IdempotencyKey: l.IdempotencyKey,
                EntityName: l.EntityName,
                Operation: l.Operation,
                EntityId: l.EntityId,
                ClientTimestampUtc: l.ClientTimestampUtc,
                ServerTimestampUtc: l.ServerTimestampUtc,
                Status: l.Status,
                ConflictReason: l.ConflictReason,
                Resolution: l.Resolution,
                PayloadJson: l.PayloadJson
            )).ToList()
        );
    }

    private static bool IsCreditEvent(TransactionEventType eventType) =>
        eventType is TransactionEventType.Income or TransactionEventType.Refund or TransactionEventType.LoanReceived;

    private static bool TryGetProperty(JsonElement element, string[] possibleNames, out JsonElement value)
    {
        foreach (var name in possibleNames)
        {
            if (element.TryGetProperty(name, out value)) return true;
            foreach (var prop in element.EnumerateObject())
            {
                if (string.Equals(prop.Name, name, StringComparison.OrdinalIgnoreCase))
                {
                    value = prop.Value;
                    return true;
                }
            }
        }
        value = default;
        return false;
    }

    private static Guid? GetGuid(JsonElement element, params string[] names)
    {
        if (TryGetProperty(element, names, out var prop))
        {
            if (prop.ValueKind == JsonValueKind.String && Guid.TryParse(prop.GetString(), out var g)) return g;
        }
        return null;
    }

    private static decimal? GetDecimal(JsonElement element, params string[] names)
    {
        if (TryGetProperty(element, names, out var prop))
        {
            if (prop.ValueKind == JsonValueKind.Number && prop.TryGetDecimal(out var d)) return d;
            if (prop.ValueKind == JsonValueKind.String && decimal.TryParse(prop.GetString(), out var d2)) return d2;
        }
        return null;
    }

    private static string? GetString(JsonElement element, params string[] names)
    {
        if (TryGetProperty(element, names, out var prop))
        {
            return prop.GetString();
        }
        return null;
    }

    private static DateTime? GetDateTime(JsonElement element, params string[] names)
    {
        if (TryGetProperty(element, names, out var prop))
        {
            if (prop.ValueKind == JsonValueKind.String && DateTime.TryParse(prop.GetString(), out var dt)) return dt;
        }
        return null;
    }
}
