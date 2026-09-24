using WealthFlow.Domain.Common;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Persistent audit log for background synchronization mutations, idempotency caching, and conflict tracking.
/// </summary>
public class SyncOperationLog : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public Guid IdempotencyKey { get; private set; }
    public string EntityName { get; private set; } = string.Empty;
    public string Operation { get; private set; } = string.Empty;
    public Guid EntityId { get; private set; }
    public DateTime ClientTimestampUtc { get; private set; }
    public DateTime ServerTimestampUtc { get; private set; }
    public string Status { get; private set; } = "Synced";
    public string? ConflictReason { get; private set; }
    public string? Resolution { get; private set; }
    public string PayloadJson { get; private set; } = string.Empty;
    public string? ResultJson { get; private set; }

    protected SyncOperationLog() { }

    public SyncOperationLog(
        Guid userId,
        Guid idempotencyKey,
        string entityName,
        string operation,
        Guid entityId,
        DateTime clientTimestampUtc,
        string status,
        string payloadJson,
        string? conflictReason = null,
        string? resolution = null,
        string? resultJson = null)
    {
        UserId = userId;
        IdempotencyKey = idempotencyKey;
        EntityName = entityName;
        Operation = operation.ToUpperInvariant();
        EntityId = entityId;
        ClientTimestampUtc = clientTimestampUtc.Kind == DateTimeKind.Utc ? clientTimestampUtc : DateTime.SpecifyKind(clientTimestampUtc, DateTimeKind.Utc);
        ServerTimestampUtc = DateTime.UtcNow;
        Status = status;
        PayloadJson = payloadJson;
        ConflictReason = conflictReason;
        Resolution = resolution;
        ResultJson = resultJson;
    }

    public void Resolve(string resolution)
    {
        Resolution = resolution;
        Status = "Resolved";
        SetUpdated();
    }
}
