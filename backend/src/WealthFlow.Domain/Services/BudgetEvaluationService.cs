using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Domain.Services;

/// <summary>
/// Domain service evaluating real-time spending against budget limits and computing dynamic threshold health states.
/// </summary>
public class BudgetEvaluationService
{
    public BudgetEvaluationResult Evaluate(Budget budget, decimal currentPeriodSpend)
    {
        var limit = budget.MonthlyLimit;
        var spent = currentPeriodSpend;
        var utilizationPercentage = limit > 0 ? Math.Round((spent / limit) * 100m, 2) : 0m;
        var remainingAmount = Math.Max(0m, limit - spent);
        var overageAmount = Math.Max(0m, spent - limit);

        var status = utilizationPercentage switch
        {
            < 80.0m => BudgetThresholdStatus.Normal,
            < 90.0m => BudgetThresholdStatus.Warning,
            < 100.0m => BudgetThresholdStatus.Critical,
            _ => BudgetThresholdStatus.Exceeded
        };

        var hexColor = status switch
        {
            BudgetThresholdStatus.Normal => "#10B981",    // Green (bg-emerald-500)
            BudgetThresholdStatus.Warning => "#F59E0B",   // Amber (bg-amber-500)
            BudgetThresholdStatus.Critical => "#F97316",  // Orange (bg-orange-500)
            BudgetThresholdStatus.Exceeded => "#EF4444",  // Rose (bg-rose-500)
            _ => "#10B981"
        };

        return new BudgetEvaluationResult(
            BudgetId: budget.Id,
            CategoryId: budget.CategoryId,
            MonthlyLimit: limit,
            SpentAmount: spent,
            RemainingAmount: remainingAmount,
            OverageAmount: overageAmount,
            UtilizationPercentage: utilizationPercentage,
            Status: status,
            HexColor: hexColor
        );
    }
}

public record BudgetEvaluationResult(
    Guid BudgetId,
    Guid CategoryId,
    decimal MonthlyLimit,
    decimal SpentAmount,
    decimal RemainingAmount,
    decimal OverageAmount,
    decimal UtilizationPercentage,
    BudgetThresholdStatus Status,
    string HexColor);
