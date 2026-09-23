using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthFlow.Application.Features.Trips.DTOs;
using WealthFlow.Application.Features.Trips.Interfaces;

namespace WealthFlow.Api.Controllers;

/// <summary>
/// Controller for anonymous guest access to collaborative trips via cryptographic 256-bit tokens.
/// Strictly isolated from host bank accounts, personal transactions, budgets, and other trips.
/// </summary>
[ApiController]
[Route("api/v1/trips/{tripId:guid}/guest/{token}")]
[AllowAnonymous]
public class GuestTripsController : ControllerBase
{
    private readonly ITripService _tripService;

    public GuestTripsController(ITripService tripService)
    {
        _tripService = tripService;
    }

    [HttpGet]
    public async Task<ActionResult<GuestTripViewDto>> GetGuestView(
        Guid tripId,
        string token,
        CancellationToken cancellationToken)
    {
        try
        {
            var view = await _tripService.GetGuestTripViewAsync(tripId, token, cancellationToken);
            return Ok(view);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost("expenses")]
    public async Task<ActionResult<TripExpenseDto>> AddGuestExpense(
        Guid tripId,
        string token,
        [FromBody] CreateTripExpenseRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var expense = await _tripService.AddGuestExpenseAsync(tripId, token, request, cancellationToken);
            return Ok(expense);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
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
