namespace WealthFlow.Application.Features.Admin.DTOs;

public record LiveMutationDto(
    Guid Id,
    DateTime TimeUtc,
    string ActorEmail,
    string Entity,
    string OpType,
    int LatencyMs,
    string Status,
    string Device
);

public record SubsystemsTelemetryDto(
    string PostgreSqlStatus,
    string CloudStorageProvider,
    string CloudStorageQuotaUsed,
    IReadOnlyList<string> BackgroundJobs
);

public record AdminCommandCenterDto(
    string Status,
    int TotalUsersCount,
    int ActiveSessionsCount,
    bool SingleAdminVerified,
    int AdminCount,
    string AdminEmailMask,
    DateTime? AdminLastLoginUtc,
    string DbProvider,
    string DbPoolOccupancy,
    int DbQueryP95LatencyMs,
    long DbStorageSizeBytes,
    int SyncOperationsToday,
    decimal SyncConflictRatePercentage,
    int SyncDeadLetterCount,
    int SecurityEventsToday,
    int FailedLoginAttemptsToday,
    IReadOnlyList<LiveMutationDto> RecentMutations,
    SubsystemsTelemetryDto Subsystems
);

public record AdminUserDto(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    string Role,
    DateTime CreatedAtUtc,
    int AccountsCount,
    int TripsCount,
    int ActiveDevicesCount,
    bool IsLocked,
    DateTimeOffset? LockoutEndUtc
);

public record AdminUserSessionDto(
    Guid SessionId,
    Guid UserId,
    string DeviceName,
    string DeviceType,
    string? Browser,
    string? IpAddress,
    DateTime LastActiveAtUtc,
    DateTime ExpiresAtUtc,
    bool IsRevoked
);

public record AdminAuditLogDto(
    Guid Id,
    DateTime TimestampUtc,
    string ActorEmail,
    string Action,
    string EntityName,
    string EntityId,
    string? IpAddress,
    string? UserAgent,
    string? OldValuesJson,
    string? NewValuesJson
);

public record AdminConflictItemDto(
    Guid Id,
    string ClientDevice,
    string UserEmail,
    string EntityName,
    Guid EntityId,
    DateTime ClientTimestampUtc,
    DateTime ServerTimestampUtc,
    string? ConflictReason,
    string? Resolution,
    string PayloadJson,
    string? ServerEntityStateJson
);

public record AdminSyncMonitorDto(
    int QueueDepth,
    int AvgLatencyMs,
    decimal ConflictRatePercentage,
    int DeadLetterCount,
    int ActiveClients,
    IReadOnlyList<AdminConflictItemDto> Conflicts
);
