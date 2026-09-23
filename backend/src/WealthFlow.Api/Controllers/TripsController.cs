using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Trips.DTOs;
using WealthFlow.Application.Features.Trips.Interfaces;

namespace WealthFlow.Api.Controllers;

[ApiController]
[Route("api/v1/trips")]
[Authorize]
public class TripsController : ControllerBase
{
    private readonly ITripService _tripService;
    private readonly ICurrentUserService _currentUserService;

    public TripsController(ITripService tripService, ICurrentUserService currentUserService)
    {
        _tripService = tripService;
        _currentUserService = currentUserService;
    }

    private Guid GetUserId() => _currentUserService.UserId ?? Guid.Empty;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TripDto>>> GetTrips(CancellationToken cancellationToken)
    {
        var trips = await _tripService.GetTripsAsync(GetUserId(), cancellationToken);
        return Ok(trips);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TripDetailDto>> GetTrip(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var detail = await _tripService.GetTripByIdAsync(id, GetUserId(), cancellationToken);
            return Ok(detail);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost]
    public async Task<ActionResult<TripDto>> CreateTrip(
        [FromBody] CreateTripRequest request,
        CancellationToken cancellationToken)
    {
        var trip = await _tripService.CreateTripAsync(GetUserId(), request, cancellationToken);
        return CreatedAtAction(nameof(GetTrip), new { id = trip.Id }, trip);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TripDto>> UpdateTrip(
        Guid id,
        [FromBody] UpdateTripRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var trip = await _tripService.UpdateTripAsync(id, GetUserId(), request, cancellationToken);
            return Ok(trip);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("{id:guid}/members")]
    public async Task<ActionResult<TripMemberDto>> AddMember(
        Guid id,
        [FromBody] AddTripMemberRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var member = await _tripService.AddMemberAsync(id, GetUserId(), request, cancellationToken);
            return Ok(member);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost("{id:guid}/members/{memberId:guid}/guest-link")]
    public async Task<ActionResult<CreateGuestLinkResponse>> CreateGuestLink(
        Guid id,
        Guid memberId,
        [FromBody] CreateGuestLinkRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _tripService.CreateGuestLinkAsync(id, memberId, GetUserId(), request, cancellationToken);
            return Ok(response);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("{id:guid}/members/{memberId:guid}/revoke-guest-link")]
    public async Task<ActionResult> RevokeGuestLink(
        Guid id,
        Guid memberId,
        CancellationToken cancellationToken)
    {
        try
        {
            var success = await _tripService.RevokeGuestLinkAsync(id, memberId, GetUserId(), cancellationToken);
            return Ok(new { success });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("{id:guid}/expenses")]
    public async Task<ActionResult<IReadOnlyList<TripExpenseDto>>> GetExpenses(Guid id, CancellationToken cancellationToken)
    {
        var expenses = await _tripService.GetExpensesAsync(id, GetUserId(), cancellationToken);
        return Ok(expenses);
    }

    [HttpPost("{id:guid}/expenses")]
    public async Task<ActionResult<TripExpenseDto>> AddExpense(
        Guid id,
        [FromBody] CreateTripExpenseRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var expense = await _tripService.AddExpenseAsync(id, GetUserId(), request, cancellationToken);
            return Ok(expense);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpGet("{id:guid}/advances")]
    public async Task<ActionResult<IReadOnlyList<TripAdvanceDto>>> GetAdvances(Guid id, CancellationToken cancellationToken)
    {
        var advances = await _tripService.GetAdvancesAsync(id, GetUserId(), cancellationToken);
        return Ok(advances);
    }

    [HttpPost("{id:guid}/advances")]
    public async Task<ActionResult<TripAdvanceDto>> AddAdvance(
        Guid id,
        [FromBody] CreateTripAdvanceRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var advance = await _tripService.AddAdvanceAsync(id, GetUserId(), request, cancellationToken);
            return Ok(advance);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpGet("{id:guid}/summary")]
    public async Task<ActionResult<TripSummaryDto>> GetSummary(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var summary = await _tripService.GetSummaryAsync(id, GetUserId(), cancellationToken);
            return Ok(summary);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost("{id:guid}/settlement/execute")]
    public async Task<ActionResult<TripSettlementDto>> ExecuteSettlement(
        Guid id,
        [FromBody] ExecuteSettlementRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var settlement = await _tripService.ExecuteSettlementAsync(id, GetUserId(), request, cancellationToken);
            return Ok(settlement);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }
}
