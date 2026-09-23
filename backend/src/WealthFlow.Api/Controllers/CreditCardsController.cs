using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.CreditCards.DTOs;
using WealthFlow.Application.Features.CreditCards.Interfaces;

namespace WealthFlow.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/credit-cards")]
public class CreditCardsController : ControllerBase
{
    private readonly ICreditCardService _creditCardService;
    private readonly ICurrentUserService _currentUserService;

    public CreditCardsController(ICreditCardService creditCardService, ICurrentUserService currentUserService)
    {
        _creditCardService = creditCardService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<IActionResult> GetCards(CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        var summary = await _creditCardService.GetCreditCardSummaryAsync(_currentUserService.UserId.Value, cancellationToken);
        return Ok(summary);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetCardById(Guid id, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var card = await _creditCardService.GetCreditCardByIdAsync(_currentUserService.UserId.Value, id, cancellationToken);
            return Ok(card);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCreditCardRequest request, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var created = await _creditCardService.CreateCreditCardAsync(_currentUserService.UserId.Value, request, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCreditCardRequest request, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var updated = await _creditCardService.UpdateCreditCardAsync(_currentUserService.UserId.Value, id, request, cancellationToken);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/payments")]
    public async Task<IActionResult> PayBill(Guid id, [FromBody] PayCreditCardBillRequest request, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var result = await _creditCardService.PayBillAsync(_currentUserService.UserId.Value, id, request, cancellationToken);
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
            await _creditCardService.DeleteCreditCardAsync(_currentUserService.UserId.Value, id, cancellationToken);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
