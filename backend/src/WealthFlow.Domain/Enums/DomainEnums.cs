namespace WealthFlow.Domain.Enums;

/// <summary>
/// Categorizes the type of financial depository account.
/// </summary>
public enum AccountType
{
    Bank = 1,
    Cash = 2,
    Wallet = 3,
    Savings = 4,
    Other = 5
}

/// <summary>
/// Defines the specific classification of a financial event in the double-entry transactional ledger.
/// </summary>
public enum TransactionEventType
{
    Income = 1,
    Expense = 2,
    Transfer = 3,
    Investment = 4,
    LoanGiven = 5,
    LoanReceived = 6,
    Gift = 7,
    Refund = 8,
    CreditCardPayment = 9,
    TripSettlement = 10
}

/// <summary>
/// Offline-first synchronization status between local client storage and central database.
/// </summary>
public enum SyncStatus
{
    Synced = 1,
    Pending = 2,
    Failed = 3
}

/// <summary>
/// Asset classification for investment portfolio tracking.
/// </summary>
public enum AssetClass
{
    MutualFund = 1,
    Stock = 2,
    FixedDeposit = 3,
    PPF = 4,
    NPS = 5,
    Gold = 6
}

/// <summary>
/// Operational status of a recurring Systematic Investment Plan (SIP).
/// </summary>
public enum SipStatus
{
    Active = 1,
    Paused = 2,
    Stopped = 3
}

/// <summary>
/// Direction of a peer debt or loan record.
/// </summary>
public enum LoanDirection
{
    Given = 1,
    Received = 2
}

/// <summary>
/// Lifecycle state of a collaborative trip workspace.
/// </summary>
public enum TripStatus
{
    Planning = 1,
    Active = 2,
    Archived = 3,
    Settled = 4
}

/// <summary>
/// Method used to apportion an expense among trip participants.
/// </summary>
public enum SplitType
{
    Equal = 1,
    Unequal = 2,
    Percentage = 3,
    Shares = 4,
    Itemized = 5
}

/// <summary>
/// Device form-factor categorization for multi-device session tracking.
/// </summary>
public enum DeviceType
{
    Desktop = 1,
    Mobile = 2,
    Tablet = 3
}

/// <summary>
/// Settlement status of a bilateral joint SIP cycle.
/// </summary>
public enum SettlementStatus
{
    Pending = 1,
    PartiallySettled = 2,
    Settled = 3
}

/// <summary>
/// Authorization role in the system.
/// </summary>
public enum UserRole
{
    User = 1,
    Admin = 2
}

/// <summary>
/// Timeframe period for financial budget caps.
/// </summary>
public enum BudgetPeriod
{
    Month = 1,
    Year = 2
}

/// <summary>
/// Real-time health threshold indicator for budget utilization.
/// </summary>
public enum BudgetThresholdStatus
{
    Normal = 1,   // < 80% (Green)
    Warning = 2,  // 80% - 89.9% (Amber)
    Critical = 3, // 90% - 99.9% (Orange)
    Exceeded = 4  // >= 100% (Rose)
}

/// <summary>
/// Direction of a one-way gift transfer.
/// </summary>
public enum GiftDirection
{
    Given = 1,
    Received = 2
}

/// <summary>
/// Status of a bilateral peer loan.
/// </summary>
public enum LoanStatus
{
    Open = 1,
    PartiallyRepaid = 2,
    FullySettled = 3
}

/// <summary>
/// Credit card payment due date urgency alert level.
/// </summary>
public enum CreditCardAlertSeverity
{
    Normal = 1,
    Warning = 2,
    Critical = 3,
    Overdue = 4
}

