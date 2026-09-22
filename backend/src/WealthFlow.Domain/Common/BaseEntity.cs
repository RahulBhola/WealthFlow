namespace WealthFlow.Domain.Common;

/// <summary>
/// Abstract base entity providing client-generated GUID identity, audit timestamps, and soft-delete capability.
/// </summary>
public abstract class BaseEntity
{
    /// <summary>
    /// Unique identifier for the entity (GUID).
    /// </summary>
    public Guid Id { get; protected set; } = Guid.NewGuid();

    /// <summary>
    /// UTC timestamp of entity creation.
    /// </summary>
    public DateTime CreatedAtUtc { get; protected set; } = DateTime.UtcNow;

    /// <summary>
    /// UTC timestamp of the last update, or null if never updated.
    /// </summary>
    public DateTime? UpdatedAtUtc { get; protected set; }

    /// <summary>
    /// Indicates whether the entity has been soft-deleted.
    /// </summary>
    public bool IsDeleted { get; protected set; } = false;

    /// <summary>
    /// Marks the entity as soft-deleted and records the modification timestamp.
    /// </summary>
    public virtual void SoftDelete()
    {
        IsDeleted = true;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    /// <summary>
    /// Updates the entity modification timestamp to the current UTC time.
    /// </summary>
    public virtual void SetUpdated()
    {
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
