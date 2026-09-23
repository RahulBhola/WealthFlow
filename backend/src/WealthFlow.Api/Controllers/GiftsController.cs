using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Gifts.DTOs;
using WealthFlow.Application.Features.Gifts.Interfaces;

namespace WealthFlow.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/gifts")]
public class GiftsController : ControllerBase
{
    private readonly IGiftService _giftService;
    private readonly ICurrentUserService _currentUserService;

    public GiftsController(IGiftService giftService, ICurrentUserService currentUserService)
    {
        _giftService = giftService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<IActionResult> GetGifts(CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        var summary = await _giftService.GetGiftSummaryAsync(_currentUserService.UserId.Value, cancellationToken);
        return Ok(summary);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGiftRequest request, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var created = await _giftService.CreateGiftAsync(_currentUserService.UserId.Value, request, cancellationToken);
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

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            await _giftService.DeleteGiftAsync(_currentUserService.UserId.Value, id, cancellationToken);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
