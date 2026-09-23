using WealthFlow.Application.Features.Sync.DTOs;

namespace WealthFlow.Application.Features.Sync.Interfaces;

/// <summary>
/// Service contract for reconciling offline outbox mutations, enforcing idempotency caching, and ServerWins conflict resolution.
/// </summary>
public interface ISyncService
{
    /// <summary>
    /// Processes an ordered array of client mutations within an atomic transaction.
    /// Deduplicates duplicate requests and applies ServerWins conflict resolution for concurrent edits.
    /// </summary>
    Task<SyncBatchResponse> ProcessBatchAsync(
        Guid userId,
        SyncBatchRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves conflict logs for a specific user.
    /// </summary>
    Task<IReadOnlyList<SyncOperationLogDto>> GetConflictLogsAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves global synchronization telemetry for the Admin ERP console.
    /// </summary>
    Task<SyncTelemetryDto> GetSyncTelemetryAsync(
        CancellationToken cancellationToken = default);
}
