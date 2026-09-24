using WealthFlow.Application.Features.Dashboard.DTOs;

namespace WealthFlow.Application.Features.Dashboard.Interfaces;

/// <summary>
/// Service contract for Executive Dashboard and Analytics rollups.
/// </summary>
public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<AnalyticsSummaryDto> GetAnalyticsAsync(Guid userId, CancellationToken cancellationToken = default);
}
