using WealthFlow.Application.Features.Admin.DTOs;

namespace WealthFlow.Application.Features.Admin.Interfaces;

/// <summary>
/// Service contract for Admin Command Center, governance, user management, and operational ERP monitoring.
/// </summary>
public interface IAdminService
{
    Task<AdminCommandCenterDto> GetCommandCenterSummaryAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AdminUserDto>> GetUsersAsync(CancellationToken cancellationToken = default);
    Task<bool> ToggleUserLockAsync(Guid targetUserId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AdminUserSessionDto>> GetUserSessionsAsync(Guid targetUserId, CancellationToken cancellationToken = default);
    Task<bool> RevokeSessionAsync(Guid sessionId, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<AdminAuditLogDto> Items, int TotalCount)> GetAuditLogsAsync(
        int page,
        int pageSize,
        string? entityName = null,
        string? action = null,
        Guid? userId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        string? search = null,
        CancellationToken cancellationToken = default);
    Task<string> ExportAuditLogsJsonAsync(CancellationToken cancellationToken = default);
    Task<AdminSyncMonitorDto> GetSyncMonitorAsync(CancellationToken cancellationToken = default);
    Task<int> SweepStaleConflictsAsync(CancellationToken cancellationToken = default);
    Task<int> PruneRevokedTokensAsync(CancellationToken cancellationToken = default);
    Task<bool> ResolveConflictAsync(Guid conflictId, string resolution, CancellationToken cancellationToken = default);
}
