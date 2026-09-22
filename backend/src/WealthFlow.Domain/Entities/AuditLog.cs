using WealthFlow.Domain.Common;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Immutable audit log capturing all state modifications, actor identities, and network metadata.
/// </summary>
public class AuditLog : BaseEntity, IAggregateRoot
{
    public Guid? UserId { get; private set; }
    public string Action { get; private set; } = string.Empty; // Create, Update, Delete, Login, etc.
    public string EntityName { get; private set; } = string.Empty;
    public string EntityId { get; private set; } = string.Empty;
    public string? OldValuesJson { get; private set; }
    public string? NewValuesJson { get; private set; }
    public string? IpAddress { get; private set; }
    public string? UserAgent { get; private set; }
    public DateTime TimestampUtc { get; private set; } = DateTime.UtcNow;

    protected AuditLog() { }

    public AuditLog(
        string action,
        string entityName,
        string entityId,
        Guid? userId = null,
        string? oldValuesJson = null,
        string? newValuesJson = null,
        string? ipAddress = null,
        string? userAgent = null)
    {
        Action = action;
        EntityName = entityName;
        EntityId = entityId;
        UserId = userId;
        OldValuesJson = oldValuesJson;
        NewValuesJson = newValuesJson;
        IpAddress = ipAddress;
        UserAgent = userAgent;
        TimestampUtc = DateTime.UtcNow;
    }
}
