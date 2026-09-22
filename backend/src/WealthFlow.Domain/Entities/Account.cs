using WealthFlow.Domain.Common;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Represents a financial depository account (Bank, Physical Cash, Digital Wallet, Savings).
/// Enforces Zero-Trust Banking Boundary (no credentials, masked display only) and tracks materialized reconciled balance.
/// </summary>
public class Account : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public AccountType AccountType { get; private set; }
    public decimal OpeningBalance { get; private set; }
    public decimal CurrentBalance { get; private set; }
    public string Currency { get; private set; } = "INR";
    public string? AccountNumberMask { get; private set; }
    public string? ColorTag { get; private set; }
    public bool IsActive { get; private set; } = true;
    public int SortOrder { get; private set; } = 0;

    protected Account() { }

    public Account(
        Guid userId,
        string name,
        AccountType accountType,
        decimal openingBalance,
        string? accountNumberMask = null,
        int sortOrder = 0,
        string? colorTag = null,
        string currency = "INR")
    {
        UserId = userId;
        Name = name;
        AccountType = accountType;
        OpeningBalance = openingBalance;
        CurrentBalance = openingBalance;
        AccountNumberMask = accountNumberMask;
        SortOrder = sortOrder;
        ColorTag = colorTag;
        Currency = string.IsNullOrWhiteSpace(currency) ? "INR" : currency.Trim().ToUpperInvariant();
        IsActive = true;
    }

    public void AdjustBalance(decimal netDelta)
    {
        CurrentBalance += netDelta;
        SetUpdated();
    }

    public void Reconcile(decimal reconciledBalance)
    {
        CurrentBalance = reconciledBalance;
        SetUpdated();
    }

    public void UpdateDetails(
        string name,
        AccountType accountType,
        string? accountNumberMask,
        int sortOrder,
        string? colorTag = null,
        string currency = "INR")
    {
        Name = name;
        AccountType = accountType;
        AccountNumberMask = accountNumberMask;
        SortOrder = sortOrder;
        ColorTag = colorTag;
        Currency = string.IsNullOrWhiteSpace(currency) ? "INR" : currency.Trim().ToUpperInvariant();
        SetUpdated();
    }

    public void Archive()
    {
        IsActive = false;
        SetUpdated();
    }

    public void Activate()
    {
        IsActive = true;
        SetUpdated();
    }
}
