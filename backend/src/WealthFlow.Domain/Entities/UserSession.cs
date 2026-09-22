using WealthFlow.Domain.Common;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Multi-device active session record tracking device telemetry, cryptographic refresh token hash,
/// and sliding/absolute expiration boundaries.
/// </summary>
public class UserSession : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public string DeviceName { get; private set; } = string.Empty;
    public DeviceType DeviceType { get; private set; } = DeviceType.Desktop;
    public string? Browser { get; private set; }
    public string? IpAddress { get; private set; }
    public string RefreshTokenHash { get; private set; } = string.Empty;
    public DateTime LastActiveAtUtc { get; private set; } = DateTime.UtcNow;
    public DateTime ExpiresAtUtc { get; private set; }
    public DateTime AbsoluteExpiresAtUtc { get; private set; }
    public bool IsRevoked { get; private set; } = false;

    protected UserSession() { }

    public UserSession(
        Guid userId,
        string deviceName,
        DeviceType deviceType,
        string refreshTokenHash,
        DateTime expiresAtUtc,
        DateTime absoluteExpiresAtUtc,
        string? browser = null,
        string? ipAddress = null)
    {
        UserId = userId;
        DeviceName = deviceName;
        DeviceType = deviceType;
        RefreshTokenHash = refreshTokenHash;
        ExpiresAtUtc = expiresAtUtc.Kind == DateTimeKind.Utc ? expiresAtUtc : DateTime.SpecifyKind(expiresAtUtc, DateTimeKind.Utc);
        AbsoluteExpiresAtUtc = absoluteExpiresAtUtc.Kind == DateTimeKind.Utc ? absoluteExpiresAtUtc : DateTime.SpecifyKind(absoluteExpiresAtUtc, DateTimeKind.Utc);
        LastActiveAtUtc = DateTime.UtcNow;
        Browser = browser;
        IpAddress = ipAddress;
        IsRevoked = false;
    }

    public void Touch(DateTime newExpiresAtUtc, string? ipAddress = null)
    {
        LastActiveAtUtc = DateTime.UtcNow;
        // Extend sliding expiration but never exceed absolute expiration
        var candidateExpires = newExpiresAtUtc.Kind == DateTimeKind.Utc ? newExpiresAtUtc : DateTime.SpecifyKind(newExpiresAtUtc, DateTimeKind.Utc);
        ExpiresAtUtc = candidateExpires < AbsoluteExpiresAtUtc ? candidateExpires : AbsoluteExpiresAtUtc;
        if (!string.IsNullOrEmpty(ipAddress))
        {
            IpAddress = ipAddress;
        }
        SetUpdated();
    }

    public void RotateToken(string newRefreshTokenHash, DateTime newExpiresAtUtc)
    {
        RefreshTokenHash = newRefreshTokenHash;
        Touch(newExpiresAtUtc);
    }

    public void Revoke()
    {
        IsRevoked = true;
        SetUpdated();
    }
}
