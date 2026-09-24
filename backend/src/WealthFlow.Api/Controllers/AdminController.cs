using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthFlow.Application.Features.Admin.DTOs;
using WealthFlow.Application.Features.Admin.Interfaces;

namespace WealthFlow.Api.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    /// <summary>
    /// Retrieves command center health summary, live telemetry, and singleton admin monitor.
    /// </summary>
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(AdminCommandCenterDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetDashboard(CancellationToken cancellationToken)
    {
        var summary = await _adminService.GetCommandCenterSummaryAsync(cancellationToken);
        return Ok(summary);
    }

    /// <summary>
    /// Lists all registered users with session counts, workspace metrics, and lockout statuses.
    /// </summary>
    [HttpGet("users")]
    [ProducesResponseType(typeof(IReadOnlyList<AdminUserDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsers(CancellationToken cancellationToken)
    {
        var users = await _adminService.GetUsersAsync(cancellationToken);
        return Ok(users);
    }

    /// <summary>
    /// Toggles account lockout status for a user. Singleton admin is immune to lockout.
    /// </summary>
    [HttpPost("users/{userId:guid}/toggle-lock")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ToggleUserLock([FromRoute] Guid userId, CancellationToken cancellationToken)
    {
        var success = await _adminService.ToggleUserLockAsync(userId, cancellationToken);
        if (!success)
        {
            return BadRequest(new { Message = "Cannot modify lockout state for target user (user not found or target is protected Singleton Admin)." });
        }
        return Ok(new { Message = "User lockout state updated successfully." });
    }

    /// <summary>
    /// Retrieves multi-device active sessions for a target user.
    /// </summary>
    [HttpGet("users/{userId:guid}/sessions")]
    [ProducesResponseType(typeof(IReadOnlyList<AdminUserSessionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUserSessions([FromRoute] Guid userId, CancellationToken cancellationToken)
    {
        var sessions = await _adminService.GetUserSessionsAsync(userId, cancellationToken);
        return Ok(sessions);
    }

    /// <summary>
    /// Remotely revokes a specific user session.
    /// </summary>
    [HttpPost("users/{userId:guid}/sessions/{sessionId:guid}/revoke")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RevokeSession([FromRoute] Guid userId, [FromRoute] Guid sessionId, CancellationToken cancellationToken)
    {
        var success = await _adminService.RevokeSessionAsync(sessionId, cancellationToken);
        if (!success)
        {
            return NotFound(new { Message = "Session not found." });
        }
        return Ok(new { Message = "Session revoked successfully." });
    }

    /// <summary>
    /// Queries paginated system audit logs with multi-faceted filtering.
    /// </summary>
    [HttpGet("audit-logs")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? entityName = null,
        [FromQuery] string? action = null,
        [FromQuery] Guid? userId = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var (items, totalCount) = await _adminService.GetAuditLogsAsync(
            page, pageSize, entityName, action, userId, startDate, endDate, search, cancellationToken);

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        return Ok(new
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages
        });
    }

    /// <summary>
    /// Exports the latest 1000 audit logs as a downloadable JSON document.
    /// </summary>
    [HttpGet("audit-logs/export")]
    [Produces("application/json")]
    public async Task<IActionResult> ExportAuditLogs(CancellationToken cancellationToken)
    {
        var json = await _adminService.ExportAuditLogsJsonAsync(cancellationToken);
        var bytes = Encoding.UTF8.GetBytes(json);
        return File(bytes, "application/json", $"wealthflow_audit_logs_{DateTime.UtcNow:yyyyMMddHHmmss}.json");
    }

    /// <summary>
    /// Retrieves background sync telemetry, latency, and conflict queue.
    /// </summary>
    [HttpGet("sync/monitor")]
    [HttpGet("sync-monitor")]
    [ProducesResponseType(typeof(AdminSyncMonitorDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSyncMonitor(CancellationToken cancellationToken)
    {
        var monitor = await _adminService.GetSyncMonitorAsync(cancellationToken);
        return Ok(monitor);
    }

    /// <summary>
    /// Manually resolves a synchronization conflict.
    /// </summary>
    [HttpPost("sync/conflicts/{conflictId:guid}/resolve")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResolveConflict(
        [FromRoute] Guid conflictId,
        [FromBody] ResolveConflictRequest request,
        CancellationToken cancellationToken)
    {
        var success = await _adminService.ResolveConflictAsync(conflictId, request.Resolution, cancellationToken);
        if (!success)
        {
            return NotFound(new { Message = "Conflict log not found." });
        }
        return Ok(new { Message = "Conflict resolved successfully." });
    }

    /// <summary>
    /// Triggers an immediate resolution sweep of stale synchronization conflicts older than 7 days.
    /// </summary>
    [HttpPost("sync/sweep")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> SweepStaleConflicts(CancellationToken cancellationToken)
    {
        var sweptCount = await _adminService.SweepStaleConflictsAsync(cancellationToken);
        return Ok(new { SweptCount = sweptCount, Message = $"Swept {sweptCount} stale synchronization conflicts." });
    }

    /// <summary>
    /// Prunes expired and revoked session tokens older than 30 days.
    /// </summary>
    [HttpPost("tokens/prune")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> PruneRevokedTokens(CancellationToken cancellationToken)
    {
        var prunedCount = await _adminService.PruneRevokedTokensAsync(cancellationToken);
        return Ok(new { PrunedCount = prunedCount, Message = $"Pruned {prunedCount} expired/revoked session tokens." });
    }
}

public record ResolveConflictRequest(string Resolution);
