using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Dashboard.DTOs;
using WealthFlow.Application.Features.Dashboard.Interfaces;

namespace WealthFlow.Api.Controllers;

[ApiController]
[Route("api/v1/analytics")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly IDashboardService _dashboardService;
    private readonly ICurrentUserService _currentUserService;

    public AnalyticsController(IDashboardService dashboardService, ICurrentUserService currentUserService)
    {
        _dashboardService = dashboardService;
        _currentUserService = currentUserService;
    }

    /// <summary>
    /// Retrieves overall analytics summary including net worth history, category breakdown, and cash flow waterfall.
    /// </summary>
    [HttpGet]
    [HttpGet("summary")]
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

    /// <summary>
    /// Retrieves 12-month net worth historical trendline.
    /// </summary>
    [HttpGet("net-worth-history")]
    [ProducesResponseType(typeof(IReadOnlyList<NetWorthHistoryPointDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNetWorthHistory(CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        var analytics = await _dashboardService.GetAnalyticsAsync(_currentUserService.UserId.Value, cancellationToken);
        return Ok(analytics.NetWorthHistory);
    }

    /// <summary>
    /// Retrieves category spending breakdown with specialized flags (Protein, Clothing).
    /// </summary>
    [HttpGet("category-breakdown")]
    [ProducesResponseType(typeof(IReadOnlyList<CategorySpendingBreakdownDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategoryBreakdown(CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        var analytics = await _dashboardService.GetAnalyticsAsync(_currentUserService.UserId.Value, cancellationToken);
        return Ok(analytics.CategoryBreakdown);
    }

    /// <summary>
    /// Retrieves cash flow waterfall simulation steps.
    /// </summary>
    [HttpGet("cashflow-waterfall")]
    [ProducesResponseType(typeof(IReadOnlyList<CashFlowWaterfallStepDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCashFlowWaterfall(CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        var analytics = await _dashboardService.GetAnalyticsAsync(_currentUserService.UserId.Value, cancellationToken);
        return Ok(analytics.CashFlowWaterfall);
    }
}
