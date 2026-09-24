namespace WealthFlow.Application.Features.Data.DTOs;

/// <summary>
/// Root container for full user data export in JSON format.
/// </summary>
public class DataExportDto
{
    public string Version { get; set; } = "1.0.0";
    public DateTime ExportedAtUtc { get; set; } = DateTime.UtcNow;
    public Guid UserId { get; set; }
    public List<AccountExportDto> Accounts { get; set; } = new();
    public List<CategoryExportDto> Categories { get; set; } = new();
    public List<TransactionExportDto> Transactions { get; set; } = new();
    public List<BudgetExportDto> Budgets { get; set; } = new();
    public List<CreditCardExportDto> CreditCards { get; set; } = new();
    public List<LoanExportDto> Loans { get; set; } = new();
    public List<InvestmentExportDto> Investments { get; set; } = new();
    public List<SipExportDto> Sips { get; set; } = new();
    public List<TripExportDto> Trips { get; set; } = new();
}

public class AccountExportDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public decimal OpeningBalance { get; set; }
    public decimal CurrentBalance { get; set; }
    public string Currency { get; set; } = "INR";
    public string? AccountNumberMask { get; set; }
    public string? ColorTag { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

public class CategoryExportDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public string? ColorHex { get; set; }
    public bool IsSpecialProtein { get; set; }
    public bool IsSpecialClothing { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsSystemDefault => !UserId.HasValue;
    public Guid? UserId { get; set; }
}

public class TransactionExportDto
{
    public Guid Id { get; set; }
    public Guid AccountId { get; set; }
    public Guid? CategoryId { get; set; }
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Merchant { get; set; }
    public string? Notes { get; set; }
    public string? Tags { get; set; }
    public Guid? LinkedEntityId { get; set; }
    public Guid IdempotencyKey { get; set; }
}

public class BudgetExportDto
{
    public Guid Id { get; set; }
    public Guid CategoryId { get; set; }
    public decimal MonthlyLimit { get; set; }
    public string Period { get; set; } = "Month";
    public DateTime StartDate { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CreditCardExportDto
{
    public Guid Id { get; set; }
    public string CardName { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Last4Digits { get; set; } = string.Empty;
    public decimal CreditLimit { get; set; }
    public decimal CurrentOutstanding { get; set; }
    public int BillingCycleDay { get; set; }
    public int DueDay { get; set; }
    public string? ColorTag { get; set; }
    public bool IsActive { get; set; } = true;
}

public class LoanExportDto
{
    public Guid Id { get; set; }
    public string Direction { get; set; } = string.Empty;
    public string CounterpartyName { get; set; } = string.Empty;
    public string? CounterpartyContact { get; set; }
    public decimal PrincipalAmount { get; set; }
    public decimal OutstandingBalance { get; set; }
    public DateTime? DueDate { get; set; }
    public Guid? DisbursementAccountId { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class InvestmentExportDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string AssetClass { get; set; } = string.Empty;
    public decimal InvestedAmount { get; set; }
    public decimal CurrentValue { get; set; }
    public decimal Units { get; set; }
    public DateTime? LastValuationDate { get; set; }
}

public class SipExportDto
{
    public Guid Id { get; set; }
    public Guid InvestmentId { get; set; }
    public Guid SourceAccountId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int ExecutionDay { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsJoint { get; set; }
    public decimal UserShare { get; set; }
    public decimal CoInvestorShare { get; set; }
    public string? CoInvestorName { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class TripExportDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal? Budget { get; set; }
    public string Status { get; set; } = string.Empty;
}

/// <summary>
/// Result summary of user data import.
/// </summary>
public class DataImportResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int ImportedAccounts { get; set; }
    public int ImportedCategories { get; set; }
    public int ImportedTransactions { get; set; }
    public int ImportedBudgets { get; set; }
    public int ImportedCreditCards { get; set; }
    public int ImportedLoans { get; set; }
    public int ImportedInvestments { get; set; }
    public int ImportedSips { get; set; }
    public int ImportedTrips { get; set; }
    public List<string> Warnings { get; set; } = new();
}
