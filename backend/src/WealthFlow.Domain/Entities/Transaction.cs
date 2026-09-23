using WealthFlow.Domain.Common;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Authoritative ledger record representing an immutable financial mutation or event.
/// </summary>
public class Transaction : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public Guid AccountId { get; private set; }
    public Guid? CategoryId { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime TransactionDate { get; private set; }
    public TransactionEventType EventType { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public string? Merchant { get; private set; }
    public string? Notes { get; private set; }
    public string? Tags { get; private set; } // Comma-delimited or JSON string
    public Guid? LinkedEntityId { get; private set; }
    public Guid IdempotencyKey { get; private set; }
    public SyncStatus SyncStatus { get; private set; } = SyncStatus.Synced;

    protected Transaction() { }

    public Transaction(
        Guid userId,
        Guid accountId,
        decimal amount,
        DateTime transactionDate,
        TransactionEventType eventType,
        string description,
        Guid? categoryId = null,
        string? merchant = null,
        string? notes = null,
        string? tags = null,
        Guid? linkedEntityId = null,
        Guid? idempotencyKey = null,
        SyncStatus syncStatus = SyncStatus.Synced,
        Guid? id = null)
    {
        if (id.HasValue && id.Value != Guid.Empty)
        {
            Id = id.Value;
        }

        UserId = userId;
        AccountId = accountId;
        Amount = amount;
        TransactionDate = transactionDate.Kind == DateTimeKind.Utc ? transactionDate : DateTime.SpecifyKind(transactionDate, DateTimeKind.Utc);
        EventType = eventType;
        Description = description;
        CategoryId = categoryId;
        Merchant = merchant;
        Notes = notes;
        Tags = tags;
        LinkedEntityId = linkedEntityId;
        IdempotencyKey = idempotencyKey ?? Guid.NewGuid();
        SyncStatus = syncStatus;
    }

    public void Update(
        Guid accountId,
        Guid? categoryId,
        decimal amount,
        DateTime transactionDate,
        string description,
        string? merchant,
        string? notes,
        string? tags)
    {
        AccountId = accountId;
        CategoryId = categoryId;
        Amount = amount;
        TransactionDate = transactionDate.Kind == DateTimeKind.Utc ? transactionDate : DateTime.SpecifyKind(transactionDate, DateTimeKind.Utc);
        Description = description;
        Merchant = merchant;
        Notes = notes;
        Tags = tags;
        SetUpdated();
    }

    public void UpdateSyncStatus(SyncStatus status)
    {
        SyncStatus = status;
        SetUpdated();
    }
}
