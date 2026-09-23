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
    public string ColorTag { get; private set; } = "#1E293B";
    public bool IsActive { get; private set; } = true;

    // Domain Computations
    public string BankName => Issuer;
    public decimal CurrentBalance => CurrentOutstanding;
    public string MaskedNumber => string.IsNullOrWhiteSpace(Last4Digits) ? "•••• ••••" : $"•••• {Last4Digits}";
    public decimal AvailableCredit => Math.Max(0m, CreditLimit - CurrentOutstanding);
    public decimal UtilizationPercentage => CreditLimit > 0m ? Math.Round((CurrentOutstanding / CreditLimit) * 100m, 2) : 0m;

    protected CreditCard() { }

    public CreditCard(
        Guid userId,
        string cardName,
        string issuer,
        string last4Digits,
        decimal creditLimit,
        int billingCycleDay,
        int dueDay,
        string? colorTag = null)
    {
        UserId = userId;
        CardName = cardName;
        Issuer = issuer;
        Last4Digits = last4Digits;
        CreditLimit = creditLimit;
        BillingCycleDay = Math.Clamp(billingCycleDay, 1, 31);
        DueDay = Math.Clamp(dueDay, 1, 31);
        CurrentOutstanding = 0m;
        ColorTag = string.IsNullOrWhiteSpace(colorTag) ? "#1E293B" : colorTag;
        IsActive = true;
    }

    public void RecordPayment(decimal amount)
    {
        if (amount <= 0)
        {
            throw new ArgumentException("Payment amount must be greater than zero.", nameof(amount));
        }

        CurrentOutstanding = Math.Max(0m, CurrentOutstanding - amount);
        SetUpdated();
    }

    public void RecordPurchase(decimal amount)
    {
        if (amount <= 0)
        {
            throw new ArgumentException("Purchase amount must be greater than zero.", nameof(amount));
        }

        CurrentOutstanding += amount;
        SetUpdated();
    }

    public void AdjustOutstanding(decimal netDelta)
    {
        CurrentOutstanding += netDelta;
        SetUpdated();
    }

    public void UpdateDetails(string cardName, string issuer, decimal creditLimit, int billingCycleDay, int dueDay, string? colorTag = null)
    {
        CardName = cardName;
        Issuer = issuer;
        CreditLimit = creditLimit;
        BillingCycleDay = Math.Clamp(billingCycleDay, 1, 31);
        DueDay = Math.Clamp(dueDay, 1, 31);
        if (!string.IsNullOrWhiteSpace(colorTag))
        {
            ColorTag = colorTag;
        }
        SetUpdated();
    }

    public void SetActive(bool isActive)
    {
        IsActive = isActive;
        SetUpdated();
    }
}
