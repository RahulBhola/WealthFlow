using WealthFlow.Domain.Common;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Investment portfolio asset tracking invested capital, current valuation, and units.
/// </summary>
public class Investment : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public AssetClass AssetClass { get; private set; }
    public decimal InvestedAmount { get; private set; }
    public decimal CurrentValue { get; private set; }
    public decimal Units { get; private set; }
    public DateTime? LastValuationDate { get; private set; }

    protected Investment() { }

    public Investment(
        Guid userId,
        string name,
        AssetClass assetClass,
        decimal investedAmount,
        decimal currentValue,
        decimal units = 0m,
        DateTime? lastValuationDate = null)
    {
        UserId = userId;
        Name = name;
        AssetClass = assetClass;
        InvestedAmount = investedAmount;
        CurrentValue = currentValue;
        Units = units;
        LastValuationDate = lastValuationDate.HasValue 
            ? (lastValuationDate.Value.Kind == DateTimeKind.Utc ? lastValuationDate.Value : DateTime.SpecifyKind(lastValuationDate.Value, DateTimeKind.Utc)) 
            : null;
    }

    public void UpdateValuation(decimal currentValue, decimal units, DateTime valuationDate)
    {
        CurrentValue = currentValue;
        Units = units;
        LastValuationDate = valuationDate.Kind == DateTimeKind.Utc ? valuationDate : DateTime.SpecifyKind(valuationDate, DateTimeKind.Utc);
        SetUpdated();
    }

    public void AddInvestment(decimal additionalInvestedAmount)
    {
        InvestedAmount += additionalInvestedAmount;
        SetUpdated();
    }
}
