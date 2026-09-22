using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Budgets.DTOs;
using WealthFlow.Application.Features.Budgets.Interfaces;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;
using WealthFlow.Domain.Services;

namespace WealthFlow.Infrastructure.Services;

/// <summary>
/// Application service implementing budget threshold monitoring, spend aggregation, and category caps.
/// </summary>
public class BudgetService : IBudgetService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly BudgetEvaluationService _evaluationService;

    public BudgetService(IUnitOfWork unitOfWork, BudgetEvaluationService? evaluationService = null)
    {
        _unitOfWork = unitOfWork;
        _evaluationService = evaluationService ?? new BudgetEvaluationService();
    }

    public async Task<BudgetSummaryDto> GetBudgetSummaryAsync(
        Guid userId,
        int? year = null,
        int? month = null,
        CancellationToken cancellationToken = default)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;
        var targetMonth = month ?? DateTime.UtcNow.Month;

        var budgets = await _unitOfWork.Budgets.GetBudgetsByUserAsync(userId, cancellationToken);
        var spendingDict = await _unitOfWork.Transactions.GetMonthlyCategorySpendingAsync(userId, targetYear, targetMonth, cancellationToken);
        var categories = await _unitOfWork.Categories.GetCategoriesByUserAsync(userId, cancellationToken);
        var categoriesDict = categories.ToDictionary(c => c.Id, c => c);

        var statusList = new List<BudgetStatusDto>();

        foreach (var budget in budgets)
        {
            spendingDict.TryGetValue(budget.CategoryId, out var spent);
            categoriesDict.TryGetValue(budget.CategoryId, out var category);

            var eval = _evaluationService.Evaluate(budget, spent);

            statusList.Add(new BudgetStatusDto(
                BudgetId: budget.Id,
                CategoryId: budget.CategoryId,
                CategoryName: category?.Name ?? "General Category",
                CategoryIcon: category?.Icon,
                CategoryColor: category?.ColorHex ?? eval.HexColor,
                MonthlyLimit: eval.MonthlyLimit,
                SpentAmount: eval.SpentAmount,
                RemainingAmount: eval.RemainingAmount,
                OverageAmount: eval.OverageAmount,
                UtilizationPercentage: eval.UtilizationPercentage,
                Status: eval.Status.ToString(),
                HexColor: eval.HexColor,
                IsExceeded: eval.Status == BudgetThresholdStatus.Exceeded
            ));
        }

        var totalBudgeted = budgets.Sum(b => b.MonthlyLimit);
        var totalSpent = statusList.Sum(s => s.SpentAmount);
        var totalRemaining = Math.Max(0m, totalBudgeted - totalSpent);
        var totalOverage = statusList.Sum(s => s.OverageAmount);
        var overallUtilization = totalBudgeted > 0 ? Math.Round((totalSpent / totalBudgeted) * 100m, 2) : 0m;

        return new BudgetSummaryDto(
            TotalBudgeted: totalBudgeted,
            TotalSpent: totalSpent,
            TotalRemaining: totalRemaining,
            TotalOverage: totalOverage,
            OverallUtilizationPercentage: overallUtilization,
            Categories: statusList
        );
    }

    public async Task<IReadOnlyList<BudgetDto>> GetBudgetsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var budgets = await _unitOfWork.Budgets.GetBudgetsByUserAsync(userId, cancellationToken);
        var categories = await _unitOfWork.Categories.GetCategoriesByUserAsync(userId, cancellationToken);
        var catDict = categories.ToDictionary(c => c.Id, c => c);

        return budgets.Select(b =>
        {
            catDict.TryGetValue(b.CategoryId, out var cat);
            return new BudgetDto(
                Id: b.Id,
                UserId: b.UserId,
                CategoryId: b.CategoryId,
                CategoryName: cat?.Name ?? "General Category",
                CategoryIcon: cat?.Icon,
                CategoryColor: cat?.ColorHex,
                MonthlyLimit: b.MonthlyLimit,
                Period: b.Period.ToString(),
                IsActive: b.IsActive,
                CreatedAtUtc: b.CreatedAtUtc
            );
        }).ToList();
    }

    public async Task<BudgetDto> CreateOrUpdateBudgetAsync(
        Guid userId,
        CreateBudgetRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.MonthlyLimit <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(request.MonthlyLimit), "Monthly limit must be greater than zero.");
        }

        var category = await _unitOfWork.Categories.GetByIdAsync(request.CategoryId, cancellationToken);
        if (category == null)
        {
            throw new KeyNotFoundException($"Category with ID {request.CategoryId} was not found.");
        }

        var existing = await _unitOfWork.Budgets.GetBudgetByCategoryAsync(userId, request.CategoryId, cancellationToken);
        if (existing != null)
        {
            existing.UpdateLimit(request.MonthlyLimit);
            await _unitOfWork.Budgets.UpdateAsync(existing, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return new BudgetDto(
                Id: existing.Id,
                UserId: existing.UserId,
                CategoryId: existing.CategoryId,
                CategoryName: category.Name,
                CategoryIcon: category.Icon,
                CategoryColor: category.ColorHex,
                MonthlyLimit: existing.MonthlyLimit,
                Period: existing.Period.ToString(),
                IsActive: existing.IsActive,
                CreatedAtUtc: existing.CreatedAtUtc
            );
        }

        var period = ParsePeriod(request.Period);
        var budget = new Budget(
            userId: userId,
            categoryId: request.CategoryId,
            monthlyLimit: request.MonthlyLimit,
            period: period
        );

        await _unitOfWork.Budgets.AddAsync(budget, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new BudgetDto(
            Id: budget.Id,
            UserId: budget.UserId,
            CategoryId: budget.CategoryId,
            CategoryName: category.Name,
            CategoryIcon: category.Icon,
            CategoryColor: category.ColorHex,
            MonthlyLimit: budget.MonthlyLimit,
            Period: budget.Period.ToString(),
            IsActive: budget.IsActive,
            CreatedAtUtc: budget.CreatedAtUtc
        );
    }

    public async Task<BudgetDto> UpdateBudgetAsync(
        Guid userId,
        Guid budgetId,
        UpdateBudgetRequest request,
        CancellationToken cancellationToken = default)
    {
        var budget = await _unitOfWork.Budgets.GetByIdAsync(budgetId, cancellationToken);
        if (budget == null || budget.UserId != userId)
        {
            throw new KeyNotFoundException($"Budget with ID {budgetId} was not found.");
        }

        if (request.MonthlyLimit <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(request.MonthlyLimit), "Monthly limit must be greater than zero.");
        }

        budget.UpdateLimit(request.MonthlyLimit);
        await _unitOfWork.Budgets.UpdateAsync(budget, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var category = await _unitOfWork.Categories.GetByIdAsync(budget.CategoryId, cancellationToken);

        return new BudgetDto(
            Id: budget.Id,
            UserId: budget.UserId,
            CategoryId: budget.CategoryId,
            CategoryName: category?.Name ?? "General Category",
            CategoryIcon: category?.Icon,
            CategoryColor: category?.ColorHex,
            MonthlyLimit: budget.MonthlyLimit,
            Period: budget.Period.ToString(),
            IsActive: budget.IsActive,
            CreatedAtUtc: budget.CreatedAtUtc
        );
    }

    private static BudgetPeriod ParsePeriod(string? periodStr)
    {
        if (Enum.TryParse<BudgetPeriod>(periodStr, ignoreCase: true, out var period))
        {
            return period;
        }

        return BudgetPeriod.Month;
    }
}
