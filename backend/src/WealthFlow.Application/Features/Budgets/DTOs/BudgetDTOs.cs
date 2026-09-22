namespace WealthFlow.Application.Features.Budgets.DTOs;

public record CreateBudgetRequest(
    Guid CategoryId,
    decimal MonthlyLimit,
    string? Period = "Month"
);

public record UpdateBudgetRequest(
    decimal MonthlyLimit,
    string? Period = "Month"
);

public record BudgetDto(
    Guid Id,
    Guid UserId,
    Guid CategoryId,
    string CategoryName,
    string? CategoryIcon,
    string? CategoryColor,
    decimal MonthlyLimit,
    string Period,
    bool IsActive,
    DateTime CreatedAtUtc
);

public record BudgetStatusDto(
    Guid BudgetId,
    Guid CategoryId,
    string CategoryName,
    string? CategoryIcon,
    string? CategoryColor,
    decimal MonthlyLimit,
    decimal SpentAmount,
    decimal RemainingAmount,
    decimal OverageAmount,
    decimal UtilizationPercentage,
    string Status,
    string HexColor,
    bool IsExceeded
);

public record BudgetSummaryDto(
    decimal TotalBudgeted,
    decimal TotalSpent,
    decimal TotalRemaining,
    decimal TotalOverage,
    decimal OverallUtilizationPercentage,
    IReadOnlyList<BudgetStatusDto> Categories
);
