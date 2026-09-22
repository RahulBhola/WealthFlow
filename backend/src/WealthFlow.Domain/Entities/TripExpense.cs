using WealthFlow.Domain.Common;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Group expense incurred during a collaborative trip, paid by a single member and apportioned to participants.
/// </summary>
public class TripExpense : BaseEntity, IAggregateRoot
{
    public Guid TripId { get; private set; }
    public Guid PayerMemberId { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime ExpenseDate { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public Guid? CategoryId { get; private set; }
    public SplitType SplitType { get; private set; } = SplitType.Equal;

    protected TripExpense() { }

    public TripExpense(
        Guid tripId,
        Guid payerMemberId,
        decimal amount,
        DateTime expenseDate,
        string description,
        Guid? categoryId = null,
        SplitType splitType = SplitType.Equal)
    {
        TripId = tripId;
        PayerMemberId = payerMemberId;
        Amount = amount;
        ExpenseDate = expenseDate.Kind == DateTimeKind.Utc ? expenseDate : DateTime.SpecifyKind(expenseDate, DateTimeKind.Utc);
        Description = description;
        CategoryId = categoryId;
        SplitType = splitType;
    }

    public void Update(decimal amount, DateTime expenseDate, string description, Guid? categoryId, SplitType splitType)
    {
        Amount = amount;
        ExpenseDate = expenseDate.Kind == DateTimeKind.Utc ? expenseDate : DateTime.SpecifyKind(expenseDate, DateTimeKind.Utc);
        Description = description;
        CategoryId = categoryId;
        SplitType = splitType;
        SetUpdated();
    }
}
