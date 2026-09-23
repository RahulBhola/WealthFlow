using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Investments.DTOs;
using WealthFlow.Application.Features.Investments.Interfaces;

namespace WealthFlow.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/investments")]
public class InvestmentsController : ControllerBase
{
    private readonly IInvestmentService _investmentService;
    private readonly ICurrentUserService _currentUserService;

    public InvestmentsController(
        IInvestmentService investmentService,
        ICurrentUserService currentUserService)
    {
        _investmentService = investmentService;
        _currentUserService = currentUserService;
    }

    // --- Portfolio Asset Endpoints ---

    [HttpGet]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        var summary = await _investmentService.GetInvestmentSummaryAsync(_currentUserService.UserId.Value, cancellationToken);
        return Ok(summary);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var investment = await _investmentService.GetInvestmentByIdAsync(_currentUserService.UserId.Value, id, cancellationToken);
            return Ok(investment);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInvestmentRequest request, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var created = await _investmentService.CreateInvestmentAsync(_currentUserService.UserId.Value, request, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/valuation")]
    public async Task<IActionResult> UpdateValuation(Guid id, [FromBody] UpdateValuationRequest request, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var updated = await _investmentService.UpdateValuationAsync(_currentUserService.UserId.Value, id, request, cancellationToken);
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

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            await _investmentService.DeleteInvestmentAsync(_currentUserService.UserId.Value, id, cancellationToken);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // --- SIP Scheduler Endpoints ---

    [HttpGet("sips")]
    public async Task<IActionResult> GetSips(CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        var sips = await _investmentService.GetSipsAsync(_currentUserService.UserId.Value, cancellationToken);
        return Ok(sips);
    }

    [HttpPost("sips")]
    public async Task<IActionResult> CreateSip([FromBody] CreateSipRequest request, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var created = await _investmentService.CreateSipAsync(_currentUserService.UserId.Value, request, cancellationToken);
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

    [HttpPut("sips/{id:guid}/status")]
    public async Task<IActionResult> UpdateSipStatus(Guid id, [FromBody] UpdateSipStatusRequest request, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var updated = await _investmentService.UpdateSipStatusAsync(_currentUserService.UserId.Value, id, request, cancellationToken);
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

    [HttpPost("sips/{id:guid}/execute")]
    public async Task<IActionResult> ExecuteSip(Guid id, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var result = await _investmentService.ExecuteSipAsync(_currentUserService.UserId.Value, id, DateTime.UtcNow, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("sips/{id:guid}")]
    public async Task<IActionResult> DeleteSip(Guid id, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            await _investmentService.DeleteSipAsync(_currentUserService.UserId.Value, id, cancellationToken);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // --- Joint SIP Bilateral Reconciliation Endpoints ---

    [HttpGet("joint-sips")]
    public async Task<IActionResult> GetJointSips(CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        var summary = await _investmentService.GetJointSipsSummaryAsync(_currentUserService.UserId.Value, cancellationToken);
        return Ok(summary);
    }

    [HttpGet("joint-sips/{id:guid}")]
    public async Task<IActionResult> GetJointSipDetail(Guid id, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var detail = await _investmentService.GetJointSipDetailAsync(_currentUserService.UserId.Value, id, cancellationToken);
            return Ok(detail);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("joint-sips/reconciliations/{recId:guid}/settle")]
    public async Task<IActionResult> SettleReconciliation(Guid recId, [FromBody] SipRepaymentRequest request, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            var result = await _investmentService.SettleReconciliationAsync(_currentUserService.UserId.Value, recId, request, cancellationToken);
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

    [HttpPost("joint-sips/{id:guid}/repay")]
    public async Task<IActionResult> RepayJointSip(Guid id, [FromBody] SipRepaymentRequest request, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        try
        {
            // If called on the joint SIP itself, apply settlement towards the oldest pending cycle
            var detail = await _investmentService.GetJointSipDetailAsync(_currentUserService.UserId.Value, id, cancellationToken);
            var oldestPending = detail.Reconciliations.LastOrDefault(r => r.SettlementStatus != "Settled");

            if (oldestPending == null)
            {
                return BadRequest(new { message = "No pending reconciliation cycles to settle for this joint SIP." });
            }

            var result = await _investmentService.SettleReconciliationAsync(_currentUserService.UserId.Value, oldestPending.Id, request, cancellationToken);
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
    }
}
