using WealthFlow.Domain.Common;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Spending threshold budget entity establishing monthly or annual caps per category.
/// </summary>
public class Budget : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public Guid CategoryId { get; private set; }
    public decimal MonthlyLimit { get; private set; }
    public BudgetPeriod Period { get; private set; } = BudgetPeriod.Month;
    public DateTime StartDate { get; private set; }
    public bool IsActive { get; private set; } = true;

    protected Budget() { }

    public Budget(
        Guid userId,
        Guid categoryId,
        decimal monthlyLimit,
        BudgetPeriod period = BudgetPeriod.Month,
        DateTime? startDate = null)
    {
        if (monthlyLimit <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(monthlyLimit), "Budget limit must be greater than zero.");
        }

        UserId = userId;
        CategoryId = categoryId;
        MonthlyLimit = monthlyLimit;
        Period = period;
        var start = startDate ?? DateTime.UtcNow;
        StartDate = start.Kind == DateTimeKind.Utc ? start : DateTime.SpecifyKind(start, DateTimeKind.Utc);
        IsActive = true;
    }

    public void UpdateLimit(decimal newLimit)
    {
        if (newLimit <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(newLimit), "Budget limit must be greater than zero.");
        }

        MonthlyLimit = newLimit;
        SetUpdated();
    }

    public void SetActive(bool isActive)
    {
        IsActive = isActive;
        SetUpdated();
    }
}
