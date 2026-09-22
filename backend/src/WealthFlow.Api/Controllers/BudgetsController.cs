using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Budgets.DTOs;
using WealthFlow.Application.Features.Budgets.Interfaces;

namespace WealthFlow.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/budgets")]
public class BudgetsController : ControllerBase
{
    private readonly IBudgetService _budgetService;
    private readonly ICurrentUserService _currentUserService;

    public BudgetsController(IBudgetService budgetService, ICurrentUserService currentUserService)
    {
        _budgetService = budgetService;
        _currentUserService = currentUserService;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] int? year = null,
        [FromQuery] int? month = null,
        CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        var summary = await _budgetService.GetBudgetSummaryAsync(
            _currentUserService.UserId.Value,
            year,
            month,
            cancellationToken);

        return Ok(summary);
    }

    [HttpGet]
    public async Task<IActionResult> GetBudgets(CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        var budgets = await _budgetService.GetBudgetsAsync(_currentUserService.UserId.Value, cancellationToken);
        return Ok(budgets);
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrUpdate([FromBody] CreateBudgetRequest request, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var budget = await _budgetService.CreateOrUpdateBudgetAsync(_currentUserService.UserId.Value, request, cancellationToken);
            return Ok(budget);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateBudgetRequest request, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var budget = await _budgetService.UpdateBudgetAsync(_currentUserService.UserId.Value, id, request, cancellationToken);
            return Ok(budget);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
