namespace WealthFlow.Application.Common.Interfaces;

/// <summary>
/// Provides access to the currently authenticated user's context and claims.
/// </summary>
public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Email { get; }
    string? Role { get; }
    bool IsAuthenticated { get; }
}

/// <summary>
/// Abstraction for UTC date and time provisioning.
/// </summary>
public interface IDateTimeService
{
    DateTime UtcNow { get; }
}
