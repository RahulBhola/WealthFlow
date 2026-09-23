using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Loans.DTOs;
using WealthFlow.Application.Features.Loans.Interfaces;

namespace WealthFlow.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/loans")]
public class LoansController : ControllerBase
{
    private readonly ILoanService _loanService;
    private readonly ICurrentUserService _currentUserService;

    public LoansController(ILoanService loanService, ICurrentUserService currentUserService)
    {
        _loanService = loanService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<IActionResult> GetLoans([FromQuery] string? direction = null, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        var summary = await _loanService.GetLoanSummaryAsync(_currentUserService.UserId.Value, direction, cancellationToken);
        return Ok(summary);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetLoanById(Guid id, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var loan = await _loanService.GetLoanByIdAsync(_currentUserService.UserId.Value, id, cancellationToken);
            return Ok(loan);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLoanRequest request, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var created = await _loanService.CreateLoanAsync(_currentUserService.UserId.Value, request, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/repayments")]
    public async Task<IActionResult> RecordRepayment(Guid id, [FromBody] RecordRepaymentRequest request, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var result = await _loanService.RecordRepaymentAsync(_currentUserService.UserId.Value, id, request, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            await _loanService.DeleteLoanAsync(_currentUserService.UserId.Value, id, cancellationToken);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
