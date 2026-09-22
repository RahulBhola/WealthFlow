namespace WealthFlow.Application.Common.Interfaces;

/// <summary>
/// Cryptographic token generator and validator for short-lived JWT access tokens and rotating refresh tokens.
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// Generates a signed short-lived JWT access token (15 minutes).
    /// </summary>
    string GenerateAccessToken(Guid userId, string email, string role, Guid sessionId);

    /// <summary>
    /// Generates a cryptographically secure 64-byte random refresh token and returns both the raw token and its SHA-256 hash.
    /// </summary>
    (string RawToken, string TokenHash) GenerateRefreshToken();

    /// <summary>
    /// Computes the SHA-256 hash of a raw token string for constant-time hash comparison in the database.
    /// </summary>
    string HashToken(string rawToken);
}
