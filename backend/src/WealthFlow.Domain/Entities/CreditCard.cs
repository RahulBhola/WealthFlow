using WealthFlow.Domain.Common;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Credit card facility tracking available credit limits, billing cycle days, and outstanding liability.
/// </summary>
public class CreditCard : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public string CardName { get; private set; } = string.Empty;
    public string Issuer { get; private set; } = string.Empty;
    public string Last4Digits { get; private set; } = string.Empty;
    public decimal CreditLimit { get; private set; }
    public int BillingCycleDay { get; private set; }
    public int DueDay { get; private set; }
    public decimal CurrentOutstanding { get; private set; }
    public bool IsActive { get; private set; } = true;

    protected CreditCard() { }

    public CreditCard(
        Guid userId,
        string cardName,
        string issuer,
        string last4Digits,
        decimal creditLimit,
        int billingCycleDay,
        int dueDay)
    {
        UserId = userId;
        CardName = cardName;
        Issuer = issuer;
        Last4Digits = last4Digits;
        CreditLimit = creditLimit;
        BillingCycleDay = billingCycleDay;
        DueDay = dueDay;
        CurrentOutstanding = 0m;
        IsActive = true;
    }

    public void AdjustOutstanding(decimal netDelta)
    {
        CurrentOutstanding += netDelta;
        SetUpdated();
    }

    public void UpdateDetails(string cardName, string issuer, decimal creditLimit, int billingCycleDay, int dueDay)
    {
        CardName = cardName;
        Issuer = issuer;
        CreditLimit = creditLimit;
        BillingCycleDay = billingCycleDay;
        DueDay = dueDay;
        SetUpdated();
    }
}
