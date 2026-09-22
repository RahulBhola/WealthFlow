using Microsoft.EntityFrameworkCore;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Domain.Entities;
using WealthFlow.Infrastructure.Persistence;

namespace WealthFlow.Infrastructure.Persistence.Repositories;

/// <summary>
/// Specialized repository implementing multi-device UserSession queries using pure LINQ.
/// </summary>
public class UserSessionRepository : Repository<UserSession>, IUserSessionRepository
{
    public UserSessionRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<UserSession>> GetActiveSessionsByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        return await _dbSet
            .AsNoTracking()
            .Where(s => s.UserId == userId && !s.IsRevoked && s.ExpiresAtUtc > now && s.AbsoluteExpiresAtUtc > now)
            .OrderByDescending(s => s.LastActiveAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<UserSession?> GetByRefreshTokenHashAsync(string refreshTokenHash, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .FirstOrDefaultAsync(s => s.RefreshTokenHash == refreshTokenHash || s.PreviousRefreshTokenHash == refreshTokenHash, cancellationToken);
    }

    public async Task RevokeSessionAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        var session = await _dbSet.FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);
        if (session != null && !session.IsRevoked)
        {
            session.Revoke();
        }
    }

    public async Task RevokeAllOtherSessionsAsync(Guid userId, Guid currentSessionId, CancellationToken cancellationToken = default)
    {
        var otherSessions = await _dbSet
            .Where(s => s.UserId == userId && s.Id != currentSessionId && !s.IsRevoked)
            .ToListAsync(cancellationToken);

        foreach (var session in otherSessions)
        {
            session.Revoke();
        }
    }

    public async Task RevokeAllSessionsForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var sessions = await _dbSet
            .Where(s => s.UserId == userId && !s.IsRevoked)
            .ToListAsync(cancellationToken);

        foreach (var session in sessions)
        {
            session.Revoke();
        }
    }
}
