namespace WealthFlow.Application.Features.Sync.DTOs;

/// <summary>
/// Individual client mutation enqueued in the offline outbox.
/// </summary>
public record ClientMutationDto(
    Guid Id,
    Guid IdempotencyKey,
    string EntityName,
    string Operation,
    Guid EntityId,
    DateTime ClientTimestampUtc,
    string PayloadJson,
    string? ExpectedVersion = null
);

/// <summary>
/// Batch request containing an ordered array of client mutations to be reconciled atomically.
/// </summary>
public record SyncBatchRequest(
    string? ClientId,
    IReadOnlyList<ClientMutationDto> Mutations
);

/// <summary>
/// Server resolution result for an individual client mutation.
/// </summary>
public record MutationResultDto(
    Guid MutationId,
    Guid IdempotencyKey,
    string EntityName,
    Guid EntityId,
    string Status,
    string? ConflictReason,
    string? Resolution,
    DateTime ServerTimestampUtc,
    string? ServerEntityStateJson = null,
    string? ErrorMessage = null
);

/// <summary>
/// Batch synchronization response detailing outcome counts and per-mutation results.
/// </summary>
public record SyncBatchResponse(
    int ProcessedCount,
    int SuccessCount,
    int ConflictCount,
    int FailureCount,
    IReadOnlyList<MutationResultDto> Results,
    DateTime ServerTimestampUtc
);

/// <summary>
/// DTO representing an audited sync operation log record.
/// </summary>
public record SyncOperationLogDto(
    Guid Id,
    Guid UserId,
    Guid IdempotencyKey,
    string EntityName,
    string Operation,
    Guid EntityId,
    DateTime ClientTimestampUtc,
    DateTime ServerTimestampUtc,
    string Status,
    string? ConflictReason,
    string? Resolution,
    string PayloadJson
);

/// <summary>
/// Real-time synchronization telemetry for Admin ERP and client diagnostics.
/// </summary>
public record SyncTelemetryDto(
    int TotalProcessedToday,
    int ConflictCountToday,
    int DeadLetterCount,
    IReadOnlyList<SyncOperationLogDto> RecentOperations
);
