using WealthFlow.Domain.Entities;

namespace WealthFlow.Application.Common.Interfaces;

/// <summary>
/// Specialized repository contract for multi-device UserSession entities.
/// </summary>
public interface IUserSessionRepository : IRepository<UserSession>
{
    Task<IReadOnlyList<UserSession>> GetActiveSessionsByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<UserSession?> GetByRefreshTokenHashAsync(string refreshTokenHash, CancellationToken cancellationToken = default);
    Task RevokeSessionAsync(Guid sessionId, CancellationToken cancellationToken = default);
    Task RevokeAllOtherSessionsAsync(Guid userId, Guid currentSessionId, CancellationToken cancellationToken = default);
    Task RevokeAllSessionsForUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
