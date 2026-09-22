using WealthFlow.Application.Features.Auth.DTOs;

namespace WealthFlow.Application.Features.Auth.Interfaces;

/// <summary>
/// Core application service orchestrating authentication, session lifecycle, and token rotation.
/// </summary>
public interface IAuthService
{
    Task<(AuthResponse Response, string RawRefreshToken)> RegisterAsync(RegisterRequest request, string? ipAddress, CancellationToken cancellationToken = default);
    Task<(AuthResponse Response, string RawRefreshToken)> LoginAsync(LoginRequest request, string? ipAddress, CancellationToken cancellationToken = default);
    Task<(AuthResponse Response, string RawRefreshToken)> RefreshTokenAsync(string rawRefreshToken, string? ipAddress, CancellationToken cancellationToken = default);
    Task LogoutAsync(string rawRefreshToken, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SessionDto>> GetActiveSessionsAsync(Guid userId, Guid currentSessionId, CancellationToken cancellationToken = default);
    Task RevokeSessionAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default);
    Task RevokeAllOtherSessionsAsync(Guid userId, Guid currentSessionId, CancellationToken cancellationToken = default);
}
