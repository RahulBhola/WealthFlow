using Microsoft.EntityFrameworkCore;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Transactions.DTOs;
using WealthFlow.Application.Features.Transactions.Interfaces;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;
using WealthFlow.Infrastructure.Persistence;

namespace WealthFlow.Infrastructure.Services;

/// <summary>
/// Application service implementing atomic transactional mutations, transfers, and balance consistency.
/// </summary>
public class TransactionService : ITransactionService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _dbContext;

    public TransactionService(IUnitOfWork unitOfWork, ApplicationDbContext dbContext)
    {
        _unitOfWork = unitOfWork;
        _dbContext = dbContext;
    }

    public async Task<PagedResult<TransactionDto>> GetTransactionsAsync(
        Guid userId,
        int page = 1,
        int pageSize = 20,
        DateTime? startDate = null,
        DateTime? endDate = null,
        Guid? accountId = null,
        Guid? categoryId = null,
        string? eventType = null,
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        TransactionEventType? parsedEventType = null;
        if (!string.IsNullOrWhiteSpace(eventType) && Enum.TryParse<TransactionEventType>(eventType, ignoreCase: true, out var et))
        {
            parsedEventType = et;
        }

        var (items, totalCount) = await _unitOfWork.Transactions.GetPagedTransactionsAsync(
            userId,
            page,
            pageSize,
            startDate,
            endDate,
            accountId,
            categoryId,
            parsedEventType,
            search,
            cancellationToken);

        // Fetch accounts and categories to resolve names
        var userAccounts = await _unitOfWork.Accounts.GetAccountsByUserAsync(userId, includeArchived: true, cancellationToken);
        var accountsDict = userAccounts.ToDictionary(a => a.Id, a => a.Name);

        var userCategories = await _unitOfWork.Categories.GetCategoriesByUserAsync(userId, cancellationToken);
        var categoriesDict = userCategories.ToDictionary(c => c.Id, c => c.Name);

        var dtos = items.Select(t => MapToDto(t, accountsDict, categoriesDict)).ToList();
        var safePageSize = pageSize < 1 ? 20 : pageSize;
        var totalPages = (int)Math.Ceiling((double)totalCount / safePageSize);

        return new PagedResult<TransactionDto>(
            Items: dtos,
            TotalCount: totalCount,
            Page: page < 1 ? 1 : page,
            PageSize: safePageSize,
            TotalPages: totalPages
        );
    }

    public async Task<TransactionDto?> GetTransactionByIdAsync(
        Guid userId,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var tx = await _unitOfWork.Transactions.GetByIdAsync(id, cancellationToken);
        if (tx == null || tx.UserId != userId)
        {
            return null;
        }

        var userAccounts = await _unitOfWork.Accounts.GetAccountsByUserAsync(userId, includeArchived: true, cancellationToken);
        var accountsDict = userAccounts.ToDictionary(a => a.Id, a => a.Name);

        var userCategories = await _unitOfWork.Categories.GetCategoriesByUserAsync(userId, cancellationToken);
        var categoriesDict = userCategories.ToDictionary(c => c.Id, c => c.Name);

        return MapToDto(tx, accountsDict, categoriesDict);
    }

    public async Task<TransactionDto> CreateTransactionAsync(
        Guid userId,
        CreateTransactionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Amount <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(request.Amount), "Transaction amount must be greater than zero.");
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            throw new ArgumentException("Transaction description is required.", nameof(request.Description));
        }

        var eventType = ParseEventType(request.EventType);

        // Fetch and validate source account
        var sourceAccount = await _unitOfWork.Accounts.GetByIdAsync(request.AccountId, cancellationToken);
        if (sourceAccount == null || sourceAccount.UserId != userId)
        {
            throw new KeyNotFoundException($"Account with ID {request.AccountId} was not found.");
        }

        Account? targetAccount = null;
        if (eventType == TransactionEventType.Transfer)
        {
            if (!request.TargetAccountId.HasValue)
            {
                throw new ArgumentException("Target account is required for transfers.", nameof(request.TargetAccountId));
            }

            if (request.TargetAccountId.Value == request.AccountId)
            {
                throw new ArgumentException("Source and target accounts cannot be identical for transfers.");
            }

            targetAccount = await _unitOfWork.Accounts.GetByIdAsync(request.TargetAccountId.Value, cancellationToken);
            if (targetAccount == null || targetAccount.UserId != userId)
            {
                throw new KeyNotFoundException($"Target account with ID {request.TargetAccountId.Value} was not found.");
            }
        }

        // Validate category if provided
        if (request.CategoryId.HasValue)
        {
            var category = await _unitOfWork.Categories.GetByIdAsync(request.CategoryId.Value, cancellationToken);
            if (category == null)
            {
                throw new KeyNotFoundException($"Category with ID {request.CategoryId.Value} was not found.");
            }
        }

        // Apply Atomic Balance Mutations
        if (eventType == TransactionEventType.Transfer)
        {
            sourceAccount.AdjustBalance(-request.Amount);
            targetAccount!.AdjustBalance(request.Amount);

            // Record Transfer entity in DbContext
            var transfer = new Transfer(
                userId: userId,
                sourceAccountId: sourceAccount.Id,
                destinationAccountId: targetAccount.Id,
                amount: request.Amount,
                transferDate: request.TransactionDate,
                feeAmount: 0m,
                notes: request.Notes
            );
            await _dbContext.Transfers.AddAsync(transfer, cancellationToken);
        }
        else if (IsCreditEvent(eventType))
        {
            sourceAccount.AdjustBalance(request.Amount);
        }
        else
        {
            sourceAccount.AdjustBalance(-request.Amount);
        }

        // Create Transaction entity
        var transaction = new Transaction(
            userId: userId,
            accountId: sourceAccount.Id,
            amount: request.Amount,
            transactionDate: request.TransactionDate,
            eventType: eventType,
            description: request.Description.Trim(),
            categoryId: request.CategoryId,
            merchant: request.Merchant?.Trim(),
            notes: request.Notes?.Trim(),
            tags: request.Tags?.Trim(),
            linkedEntityId: targetAccount?.Id,
            idempotencyKey: request.IdempotencyKey
        );

        await _unitOfWork.Transactions.AddAsync(transaction, cancellationToken);

        // Commit All Changes in Single Atomic Transaction
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var accountsDict = new Dictionary<Guid, string>
        {
            [sourceAccount.Id] = sourceAccount.Name
        };
        if (targetAccount != null)
        {
            accountsDict[targetAccount.Id] = targetAccount.Name;
        }

        string? categoryName = null;
        if (request.CategoryId.HasValue)
        {
            var cat = await _unitOfWork.Categories.GetByIdAsync(request.CategoryId.Value, cancellationToken);
            categoryName = cat?.Name;
        }

        return MapToDto(transaction, accountsDict, categoryName != null ? new Dictionary<Guid, string> { [request.CategoryId!.Value] = categoryName } : new Dictionary<Guid, string>());
    }

    public async Task<TransactionDto> UpdateTransactionAsync(
        Guid userId,
        Guid id,
        UpdateTransactionRequest request,
        CancellationToken cancellationToken = default)
    {
        var existingTx = await _unitOfWork.Transactions.GetByIdAsync(id, cancellationToken);
        if (existingTx == null || existingTx.UserId != userId)
        {
            throw new KeyNotFoundException($"Transaction with ID {id} was not found.");
        }

        if (request.Amount <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(request.Amount), "Transaction amount must be greater than zero.");
        }

        // 1. Revert Old Balance Impact
        await RevertBalanceImpactAsync(existingTx, cancellationToken);

        // 2. Validate new account(s)
        var sourceAccount = await _unitOfWork.Accounts.GetByIdAsync(request.AccountId, cancellationToken);
        if (sourceAccount == null || sourceAccount.UserId != userId)
        {
            throw new KeyNotFoundException($"Account with ID {request.AccountId} was not found.");
        }

        var newEventType = ParseEventType(request.EventType);
        Account? targetAccount = null;
        if (newEventType == TransactionEventType.Transfer)
        {
            if (!request.TargetAccountId.HasValue)
            {
                throw new ArgumentException("Target account is required for transfers.", nameof(request.TargetAccountId));
            }
            if (request.TargetAccountId.Value == request.AccountId)
            {
                throw new ArgumentException("Source and target accounts cannot be identical for transfers.");
            }

            targetAccount = await _unitOfWork.Accounts.GetByIdAsync(request.TargetAccountId.Value, cancellationToken);
            if (targetAccount == null || targetAccount.UserId != userId)
            {
                throw new KeyNotFoundException($"Target account with ID {request.TargetAccountId.Value} was not found.");
            }
        }

        // 3. Apply New Balance Impact
        if (newEventType == TransactionEventType.Transfer)
        {
            sourceAccount.AdjustBalance(-request.Amount);
            targetAccount!.AdjustBalance(request.Amount);
        }
        else if (IsCreditEvent(newEventType))
        {
            sourceAccount.AdjustBalance(request.Amount);
        }
        else
        {
            sourceAccount.AdjustBalance(-request.Amount);
        }

        // 4. Update Transaction
        existingTx.Update(
            accountId: sourceAccount.Id,
            categoryId: request.CategoryId,
            amount: request.Amount,
            transactionDate: request.TransactionDate,
            description: request.Description.Trim(),
            merchant: request.Merchant?.Trim(),
            notes: request.Notes?.Trim(),
            tags: request.Tags?.Trim()
        );

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var userAccounts = await _unitOfWork.Accounts.GetAccountsByUserAsync(userId, includeArchived: true, cancellationToken);
        var accountsDict = userAccounts.ToDictionary(a => a.Id, a => a.Name);
        var userCategories = await _unitOfWork.Categories.GetCategoriesByUserAsync(userId, cancellationToken);
        var categoriesDict = userCategories.ToDictionary(c => c.Id, c => c.Name);

        return MapToDto(existingTx, accountsDict, categoriesDict);
    }

    public async Task DeleteTransactionAsync(Guid userId, Guid id, CancellationToken cancellationToken = default)
    {
        var existingTx = await _unitOfWork.Transactions.GetByIdAsync(id, cancellationToken);
        if (existingTx == null || existingTx.UserId != userId)
        {
            throw new KeyNotFoundException($"Transaction with ID {id} was not found.");
        }

        // Revert Balance Impact atomically
        await RevertBalanceImpactAsync(existingTx, cancellationToken);

        existingTx.SoftDelete();
        await _unitOfWork.Transactions.UpdateAsync(existingTx, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<TransactionSummaryDto> GetSummaryAsync(
        Guid userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId);

        if (startDate.HasValue)
        {
            query = query.Where(t => t.TransactionDate >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(t => t.TransactionDate <= endDate.Value);
        }

        var allTx = await query.ToListAsync(cancellationToken);

        // Calculate Inflows and Outflows (strictly excluding Transfers to preserve neutrality)
        var totalInflows = allTx.Where(t => IsCreditEvent(t.EventType)).Sum(t => t.Amount);
        var totalOutflows = allTx.Where(t => IsDebitEvent(t.EventType)).Sum(t => t.Amount);
        var netCashFlow = totalInflows - totalOutflows;

        return new TransactionSummaryDto(
            TotalInflows: totalInflows,
            TotalOutflows: totalOutflows,
            NetCashFlow: netCashFlow,
            TotalCount: allTx.Count
        );
    }

    private async Task RevertBalanceImpactAsync(Transaction tx, CancellationToken cancellationToken)
    {
        var account = await _unitOfWork.Accounts.GetByIdAsync(tx.AccountId, cancellationToken);
        if (account != null)
        {
            if (tx.EventType == TransactionEventType.Transfer)
            {
                account.AdjustBalance(tx.Amount); // Revert source deduction
                if (tx.LinkedEntityId.HasValue)
                {
                    var targetAccount = await _unitOfWork.Accounts.GetByIdAsync(tx.LinkedEntityId.Value, cancellationToken);
                    targetAccount?.AdjustBalance(-tx.Amount); // Revert target addition
                }
            }
            else if (IsCreditEvent(tx.EventType))
            {
                account.AdjustBalance(-tx.Amount); // Revert credit
            }
            else
            {
                account.AdjustBalance(tx.Amount); // Revert debit
            }
        }
    }

    private static TransactionDto MapToDto(
        Transaction t,
        IReadOnlyDictionary<Guid, string> accountsDict,
        IReadOnlyDictionary<Guid, string> categoriesDict)
    {
        accountsDict.TryGetValue(t.AccountId, out var accountName);
        string? targetAccountName = null;
        if (t.LinkedEntityId.HasValue && accountsDict.TryGetValue(t.LinkedEntityId.Value, out var tan))
        {
            targetAccountName = tan;
        }

        string? categoryName = null;
        if (t.CategoryId.HasValue && categoriesDict.TryGetValue(t.CategoryId.Value, out var cn))
        {
            categoryName = cn;
        }
        else if (t.EventType == TransactionEventType.Transfer)
        {
            categoryName = "Transfer to self";
        }

        return new TransactionDto(
            Id: t.Id,
            UserId: t.UserId,
            AccountId: t.AccountId,
            AccountName: accountName ?? "Unknown Account",
            CategoryId: t.CategoryId,
            CategoryName: categoryName,
            Amount: t.Amount,
            TransactionDate: t.TransactionDate,
            EventType: t.EventType.ToString(),
            Description: t.Description,
            Merchant: t.Merchant,
            Notes: t.Notes,
            Tags: t.Tags,
            TargetAccountId: t.LinkedEntityId,
            TargetAccountName: targetAccountName,
            IdempotencyKey: t.IdempotencyKey,
            SyncStatus: t.SyncStatus.ToString(),
            CreatedAtUtc: t.CreatedAtUtc
        );
    }

    private static TransactionEventType ParseEventType(string eventTypeStr)
    {
        if (Enum.TryParse<TransactionEventType>(eventTypeStr, ignoreCase: true, out var parsed))
        {
            return parsed;
        }

        return TransactionEventType.Expense;
    }

    private static bool IsCreditEvent(TransactionEventType type) =>
        type is TransactionEventType.Income or TransactionEventType.Refund or TransactionEventType.LoanReceived;

    private static bool IsDebitEvent(TransactionEventType type) =>
        type is TransactionEventType.Expense or TransactionEventType.Investment or TransactionEventType.LoanGiven or TransactionEventType.CreditCardPayment or TransactionEventType.TripSettlement;
}
