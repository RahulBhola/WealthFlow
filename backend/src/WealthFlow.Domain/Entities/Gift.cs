using WealthFlow.Domain.Common;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// One-way gift tracking with recipient/giver attribution and occasion without creating debt liabilities or receivables.
/// </summary>
public class Gift : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public GiftDirection Direction { get; private set; }
    public string RecipientOrGiver { get; private set; } = string.Empty;
    public string Occasion { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public Guid AccountId { get; private set; }
    public DateTime Date { get; private set; }
    public string? Notes { get; private set; }
    public Guid? TransactionId { get; private set; }

    protected Gift() { }

    public Gift(
        Guid userId,
        GiftDirection direction,
        string recipientOrGiver,
        string occasion,
        decimal amount,
        Guid accountId,
        DateTime date,
        string? notes = null,
        Guid? transactionId = null)
    {
        if (amount <= 0)
        {
            throw new ArgumentException("Gift amount must be greater than zero.", nameof(amount));
        }

        UserId = userId;
        Direction = direction;
        RecipientOrGiver = recipientOrGiver;
        Occasion = occasion;
        Amount = amount;
        AccountId = accountId;
        Date = date.Kind == DateTimeKind.Utc ? date : DateTime.SpecifyKind(date, DateTimeKind.Utc);
        Notes = notes;
        TransactionId = transactionId;
    }

    public void LinkTransaction(Guid transactionId)
    {
        TransactionId = transactionId;
        SetUpdated();
    }
}
