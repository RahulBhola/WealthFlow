using WealthFlow.Domain.Common;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Represents a financial depository account (Bank, Physical Cash, Digital Wallet).
/// Tracks opening balance and reconciled materialized current balance.
/// </summary>
public class Account : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public AccountType AccountType { get; private set; }
    public decimal OpeningBalance { get; private set; }
    public decimal CurrentBalance { get; private set; }
    public string? AccountNumberMask { get; private set; }
    public bool IsActive { get; private set; } = true;
    public int SortOrder { get; private set; } = 0;

    protected Account() { }

    public Account(
        Guid userId,
        string name,
        AccountType accountType,
        decimal openingBalance,
        string? accountNumberMask = null,
        int sortOrder = 0)
    {
        UserId = userId;
        Name = name;
        AccountType = accountType;
        OpeningBalance = openingBalance;
        CurrentBalance = openingBalance;
        AccountNumberMask = accountNumberMask;
        SortOrder = sortOrder;
        IsActive = true;
    }

    public void AdjustBalance(decimal netDelta)
    {
        CurrentBalance += netDelta;
        SetUpdated();
    }

    public void UpdateDetails(string name, AccountType accountType, string? accountNumberMask, int sortOrder)
    {
        Name = name;
        AccountType = accountType;
        AccountNumberMask = accountNumberMask;
        SortOrder = sortOrder;
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
