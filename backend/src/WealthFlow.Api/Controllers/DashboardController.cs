using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Dashboard.DTOs;
using WealthFlow.Application.Features.Dashboard.Interfaces;

namespace WealthFlow.Api.Controllers;

[ApiController]
[Route("api/v1/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;
    private readonly ICurrentUserService _currentUserService;

    public DashboardController(IDashboardService dashboardService, ICurrentUserService currentUserService)
    {
        _dashboardService = dashboardService;
        _currentUserService = currentUserService;
    }

    /// <summary>
    /// Retrieves executive dashboard summary including Net Worth, Liquid Balance, Cash Flow, Credit Card Liability, and Recent Activity.
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(DashboardSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        var summary = await _dashboardService.GetSummaryAsync(_currentUserService.UserId.Value, cancellationToken);
        return Ok(summary);
    }

    /// <summary>
    /// Retrieves in-depth analytics, category spending breakdown (with protein/clothing drilldowns), and cash flow waterfall.
    /// </summary>
    [HttpGet("analytics")]
    [ProducesResponseType(typeof(AnalyticsSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAnalytics(CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        var analytics = await _dashboardService.GetAnalyticsAsync(_currentUserService.UserId.Value, cancellationToken);
        return Ok(analytics);
    }
}
