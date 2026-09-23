using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using WealthFlow.Application.Features.Sync.DTOs;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;
using WealthFlow.Infrastructure.Persistence;
using WealthFlow.Infrastructure.Services;
using Xunit;

namespace WealthFlow.UnitTests.Sync;

public class SyncProcessorTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task ProcessBatchAsync_ShouldPreserveClientGeneratedGuid_WhenCreatingTransactionOffline()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var unitOfWork = new UnitOfWork(context);
        var syncService = new SyncService(unitOfWork, context);

        var userId = Guid.NewGuid();
        var account = new Account(userId, "Checking", AccountType.Bank, 5000m, "INR");
        await context.Accounts.AddAsync(account);
        await context.SaveChangesAsync();

        var clientGeneratedGuid = Guid.NewGuid();
        var idempotencyKey = Guid.NewGuid();

        var payload = JsonSerializer.Serialize(new
        {
            AccountId = account.Id,
            Amount = 1200m,
            Type = "Expense",
            Date = DateTime.UtcNow,
            Description = "Offline Groceries"
        });

        var request = new SyncBatchRequest(
            ClientId: "test-client",
            Mutations: new List<ClientMutationDto>
            {
                new ClientMutationDto(
                    Id: Guid.NewGuid(),
                    IdempotencyKey: idempotencyKey,
                    EntityName: "Transaction",
                    Operation: "Create",
                    EntityId: clientGeneratedGuid,
                    ClientTimestampUtc: DateTime.UtcNow,
                    PayloadJson: payload
                )
            }
        );

        // Act
        var response = await syncService.ProcessBatchAsync(userId, request);

        // Assert
        response.Results.Should().HaveCount(1);
        response.Results[0].Status.Should().Be("Synced");
        response.Results[0].EntityId.Should().Be(clientGeneratedGuid);

        var persistedTx = await context.Transactions.FirstOrDefaultAsync(t => t.Id == clientGeneratedGuid);
        persistedTx.Should().NotBeNull();
        persistedTx!.Id.Should().Be(clientGeneratedGuid, "Entity MUST retain client-generated GUID as primary key");
        persistedTx.Amount.Should().Be(1200m);

        var updatedAccount = await context.Accounts.FindAsync(account.Id);
        updatedAccount!.CurrentBalance.Should().Be(3800m, "Account balance should be debited by 1200");
    }

    [Fact]
    public async Task ProcessBatchAsync_ShouldDeduplicateAndReturnCachedResult_WhenDuplicateIdempotencyKeyProvided()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var unitOfWork = new UnitOfWork(context);
        var syncService = new SyncService(unitOfWork, context);

        var userId = Guid.NewGuid();
        var account = new Account(userId, "Savings", AccountType.Savings, 10000m, "INR");
        await context.Accounts.AddAsync(account);
        await context.SaveChangesAsync();

        var clientGuid = Guid.NewGuid();
        var idempotencyKey = Guid.NewGuid();

        var payload = JsonSerializer.Serialize(new
        {
            AccountId = account.Id,
            Amount = 2500m,
            Type = "Expense",
            Date = DateTime.UtcNow,
            Description = "Restaurant"
        });

        var request = new SyncBatchRequest(
            ClientId: "test-client",
            Mutations: new List<ClientMutationDto>
            {
                new ClientMutationDto(
                    Id: Guid.NewGuid(),
                    IdempotencyKey: idempotencyKey,
                    EntityName: "Transaction",
                    Operation: "Create",
                    EntityId: clientGuid,
                    ClientTimestampUtc: DateTime.UtcNow,
                    PayloadJson: payload
                )
            }
        );

        // Act 1: Initial sync
        var firstResponse = await syncService.ProcessBatchAsync(userId, request);
        firstResponse.Results[0].Status.Should().Be("Synced");

        // Act 2: Duplicate sync replay
        var secondResponse = await syncService.ProcessBatchAsync(userId, request);

        // Assert
        secondResponse.Results.Should().HaveCount(1);
        secondResponse.Results[0].Status.Should().Be("Duplicate");
        secondResponse.Results[0].Resolution.Should().Be("CachedOutcome");

        // Verify only 1 transaction was inserted and balance was only debited once
        var txCount = await context.Transactions.CountAsync(t => t.Id == clientGuid);
        txCount.Should().Be(1);

        var updatedAccount = await context.Accounts.FindAsync(account.Id);
        updatedAccount!.CurrentBalance.Should().Be(7500m, "Balance must only be debited once despite duplicated requests");
    }

    [Fact]
    public async Task ProcessBatchAsync_ShouldTriggerServerWinsConflict_WhenClientTimestampIsStale()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var unitOfWork = new UnitOfWork(context);
        var syncService = new SyncService(unitOfWork, context);

        var userId = Guid.NewGuid();
        var account = new Account(userId, "Checking", AccountType.Bank, 5000m, "INR");
        await context.Accounts.AddAsync(account);

        var txId = Guid.NewGuid();
        var tx = new Transaction(
            userId: userId,
            accountId: account.Id,
            amount: 1000m,
            transactionDate: DateTime.UtcNow,
            eventType: TransactionEventType.Expense,
            description: "Server Description",
            id: txId
        );
        await context.Transactions.AddAsync(tx);
        await context.SaveChangesAsync();

        // Simulate server updated more recently
        var staleClientTimestamp = tx.UpdatedAtUtc?.AddMinutes(-30) ?? DateTime.UtcNow.AddMinutes(-30);

        var stalePayload = JsonSerializer.Serialize(new
        {
            Amount = 1500m,
            Description = "Stale Client Edit"
        });

        var request = new SyncBatchRequest(
            ClientId: "test-client",
            Mutations: new List<ClientMutationDto>
            {
                new ClientMutationDto(
                    Id: Guid.NewGuid(),
                    IdempotencyKey: Guid.NewGuid(),
                    EntityName: "Transaction",
                    Operation: "Update",
                    EntityId: txId,
                    ClientTimestampUtc: staleClientTimestamp,
                    PayloadJson: stalePayload
                )
            }
        );

        // Act
        var response = await syncService.ProcessBatchAsync(userId, request);

        // Assert
        response.Results.Should().HaveCount(1);
        response.Results[0].Status.Should().Be("Conflict");
        response.Results[0].Resolution.Should().Be("ServerWins");
        response.Results[0].ServerEntityStateJson.Should().NotBeNull();

        // Verify entity on server kept server authoritative state
        var currentTx = await context.Transactions.FindAsync(txId);
        currentTx!.Description.Should().Be("Server Description", "ServerWins preserves authoritative server state");
    }
}
