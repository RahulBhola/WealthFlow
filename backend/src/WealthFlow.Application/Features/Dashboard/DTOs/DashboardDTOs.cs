namespace WealthFlow.Application.Features.Dashboard.DTOs;

public record BudgetGlanceDto(
    Guid CategoryId,
    string CategoryName,
    decimal BudgetLimit,
    decimal CurrentSpent,
    decimal UtilizationPercentage,
    string StatusColor // "emerald" | "amber" | "orange" | "rose"
);

public record NetWorthHistoryPointDto(
    string MonthName,
    DateTime Date,
    decimal NetWorth,
    decimal Assets,
    decimal Liabilities
);

public record DashboardTransactionDto(
    Guid Id,
    DateTime Date,
    string Merchant,
    string Description,
    string CategoryName,
    string AccountName,
    decimal Amount,
    string EventType,
    string SyncStatus
);

public record DashboardAccountDto(
    Guid Id,
    string Name,
    string AccountType,
    string? MaskedNumber,
    decimal Balance,
    string Currency
);

public record DashboardSummaryDto(
    decimal NetWorth,
    decimal NetWorthDeltaPercentage,
    decimal TotalLiquidCash,
    decimal TotalInvestments,
    decimal MonthlyInflow,
    decimal MonthlyExpenses,
    decimal SavingsRatePercentage,
    decimal CreditCardLiability,
    DateTime? NearestCardDueDate,
    decimal CardUtilizationPercentage,
    IReadOnlyList<BudgetGlanceDto> BudgetGlances,
    IReadOnlyList<NetWorthHistoryPointDto> NetWorthHistory,
    IReadOnlyList<DashboardTransactionDto> RecentTransactions,
    IReadOnlyList<DashboardAccountDto> AccountsSummary
);

public record CategorySpendingBreakdownDto(
    Guid? CategoryId,
    string CategoryName,
    decimal Amount,
    decimal Percentage,
    string? ColorHex,
    bool IsSpecialProtein,
    bool IsSpecialClothing
);

public record CashFlowWaterfallStepDto(
    string StepName,
    decimal Amount,
    decimal RunningBalance,
    string StepType // "Opening" | "Inflow" | "Expense" | "Investment" | "DebtPayoff" | "Ending"
);

public record AnalyticsSummaryDto(
    IReadOnlyList<NetWorthHistoryPointDto> NetWorthHistory,
    IReadOnlyList<CategorySpendingBreakdownDto> CategoryBreakdown,
    IReadOnlyList<CashFlowWaterfallStepDto> CashFlowWaterfall,
    decimal DailyBurnRate,
    decimal SavingsRatePercentage,
    decimal TotalInvestments,
    decimal TotalLiquidCash
);
