using WealthFlow.Application.Features.Budgets.DTOs;

namespace WealthFlow.Application.Features.Budgets.Interfaces;

/// <summary>
/// Application service contract for budget management and real-time dynamic threshold evaluation.
/// </summary>
public interface IBudgetService
{
    Task<BudgetSummaryDto> GetBudgetSummaryAsync(
        Guid userId,
        int? year = null,
        int? month = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<BudgetDto>> GetBudgetsAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<BudgetDto> CreateOrUpdateBudgetAsync(
        Guid userId,
        CreateBudgetRequest request,
        CancellationToken cancellationToken = default);

    Task<BudgetDto> UpdateBudgetAsync(
        Guid userId,
        Guid budgetId,
        UpdateBudgetRequest request,
        CancellationToken cancellationToken = default);
}
