using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Sync.DTOs;
using WealthFlow.Application.Features.Sync.Interfaces;

namespace WealthFlow.Api.Controllers;

/// <summary>
/// Handles offline-first mutation synchronization, idempotency checks, conflict logs, and sync telemetry.
/// </summary>
[ApiController]
[Route("api/v1/sync")]
[Authorize]
public class SyncController : ControllerBase
{
    private readonly ISyncService _syncService;
    private readonly ICurrentUserService _currentUserService;

    public SyncController(ISyncService syncService, ICurrentUserService currentUserService)
    {
        _syncService = syncService;
        _currentUserService = currentUserService;
    }

    private Guid GetUserId() => _currentUserService.UserId ?? Guid.Empty;

    /// <summary>
    /// Synchronizes a batch of mutations submitted from the client's offline Outbox queue.
    /// </summary>
    [HttpPost("batch")]
    public async Task<ActionResult<SyncBatchResponse>> SyncBatch(
        [FromBody] SyncBatchRequest request,
        CancellationToken cancellationToken)
    {
        if (request == null || request.Mutations == null)
        {
            return BadRequest(new { error = "Invalid sync batch payload." });
        }

        var userId = GetUserId();
        var response = await _syncService.ProcessBatchAsync(userId, request, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Retrieves conflict logs for inspection and manual reconciliation.
    /// </summary>
    [HttpGet("conflicts")]
    public async Task<ActionResult<IReadOnlyList<SyncOperationLogDto>>> GetConflicts(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var conflicts = await _syncService.GetConflictLogsAsync(userId, cancellationToken);
        return Ok(conflicts);
    }

    /// <summary>
    /// Retrieves sync health telemetry and metrics.
    /// </summary>
    [HttpGet("telemetry")]
    public async Task<ActionResult<SyncTelemetryDto>> GetTelemetry(CancellationToken cancellationToken)
    {
        var telemetry = await _syncService.GetSyncTelemetryAsync(cancellationToken);
        return Ok(telemetry);
    }
}
