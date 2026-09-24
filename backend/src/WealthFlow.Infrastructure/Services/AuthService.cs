using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Auth.DTOs;
using WealthFlow.Application.Features.Auth.Interfaces;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;
using WealthFlow.Infrastructure.Identity;

namespace WealthFlow.Infrastructure.Services;

/// <summary>
/// Core application authentication service implementing registration, login, token rotation,
/// multi-device session management, and compromise detection.
/// </summary>
public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IUserSessionRepository _sessionRepository;
    private readonly ITokenService _tokenService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEmailService _emailService;
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        IUserSessionRepository sessionRepository,
        ITokenService tokenService,
        IUnitOfWork unitOfWork,
        IEmailService emailService,
        IMemoryCache memoryCache,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _sessionRepository = sessionRepository;
        _tokenService = tokenService;
        _unitOfWork = unitOfWork;
        _emailService = emailService;
        _memoryCache = memoryCache;
        _logger = logger;
    }

    public async Task<(AuthResponse Response, string RawRefreshToken)> RegisterAsync(
        RegisterRequest request,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            throw new InvalidOperationException("A user with this email already exists.");
        }

        var parts = (request.FullName ?? string.Empty).Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        var firstName = parts.Length > 0 ? parts[0] : "User";
        var lastName = parts.Length > 1 ? parts[1] : string.Empty;

        // INVARIANT: Public self-service registration ONLY provisions User accounts.
        // Singleton Admin cannot be created via public registration.
        var user = new ApplicationUser(
            email: request.Email.Trim().ToLowerInvariant(),
            firstName: firstName,
            lastName: lastName,
            role: "User",
            currencyCode: string.IsNullOrWhiteSpace(request.Currency) ? "INR" : request.Currency.Trim().ToUpperInvariant()
        );

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            var errors = string.Join("; ", createResult.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Registration failed: {errors}");
        }

        await _userManager.AddToRoleAsync(user, "User");

        // Issue initial refresh token & session
        var (rawRefreshToken, tokenHash) = _tokenService.GenerateRefreshToken();
        var now = DateTime.UtcNow;
        var expiresAt = now.AddDays(14);
        var absoluteExpiresAt = now.AddDays(30);

        var session = new UserSession(
            userId: user.Id,
            deviceName: "Web Browser",
            deviceType: DeviceType.Desktop,
            refreshTokenHash: tokenHash,
            expiresAtUtc: expiresAt,
            absoluteExpiresAtUtc: absoluteExpiresAt,
            browser: null,
            ipAddress: ipAddress
        );

        await _sessionRepository.AddAsync(session, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var accessToken = _tokenService.GenerateAccessToken(user.Id, user.Email!, user.Role, session.Id);

        var response = new AuthResponse(
            AccessToken: accessToken,
            ExpiresInMinutes: 15,
            User: new UserDto(
                Id: user.Id,
                Email: user.Email!,
                FullName: $"{user.FirstName} {user.LastName}".Trim(),
                Role: user.Role,
                BaseCurrency: user.CurrencyCode,
                IsLockedOut: false
            ),
            Session: new SessionDto(
                Id: session.Id,
                DeviceName: session.DeviceName,
                DeviceType: session.DeviceType.ToString(),
                Browser: session.Browser,
                IpAddress: session.IpAddress,
                LastActiveAtUtc: session.LastActiveAtUtc,
                ExpiresAtUtc: session.ExpiresAtUtc,
                IsCurrent: true
            )
        );

        return (response, rawRefreshToken);
    }

    public async Task<(AuthResponse Response, string RawRefreshToken)> LoginAsync(
        LoginRequest request,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        if (await _userManager.IsLockedOutAsync(user))
        {
            throw new UnauthorizedAccessException("Account is temporarily locked due to multiple failed login attempts. Please try again later.");
        }

        var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
        {
            await _userManager.AccessFailedAsync(user);
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        await _userManager.ResetAccessFailedCountAsync(user);

        var deviceType = Enum.TryParse<DeviceType>(request.DeviceType, true, out var dt) ? dt : DeviceType.Desktop;
        var deviceName = string.IsNullOrWhiteSpace(request.DeviceName) ? "Web Client" : request.DeviceName.Trim();

        var (rawRefreshToken, tokenHash) = _tokenService.GenerateRefreshToken();
        var now = DateTime.UtcNow;
        var expiresAt = now.AddDays(14);
        var absoluteExpiresAt = now.AddDays(30);

        var session = new UserSession(
            userId: user.Id,
            deviceName: deviceName,
            deviceType: deviceType,
            refreshTokenHash: tokenHash,
            expiresAtUtc: expiresAt,
            absoluteExpiresAtUtc: absoluteExpiresAt,
            browser: request.Browser,
            ipAddress: ipAddress
        );

        await _sessionRepository.AddAsync(session, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var accessToken = _tokenService.GenerateAccessToken(user.Id, user.Email!, user.Role, session.Id);

        var response = new AuthResponse(
            AccessToken: accessToken,
            ExpiresInMinutes: 15,
            User: new UserDto(
                Id: user.Id,
                Email: user.Email!,
                FullName: $"{user.FirstName} {user.LastName}".Trim(),
                Role: user.Role,
                BaseCurrency: user.CurrencyCode,
                IsLockedOut: false
            ),
            Session: new SessionDto(
                Id: session.Id,
                DeviceName: session.DeviceName,
                DeviceType: session.DeviceType.ToString(),
                Browser: session.Browser,
                IpAddress: session.IpAddress,
                LastActiveAtUtc: session.LastActiveAtUtc,
                ExpiresAtUtc: session.ExpiresAtUtc,
                IsCurrent: true
            )
        );

        return (response, rawRefreshToken);
    }

    public async Task<(AuthResponse Response, string RawRefreshToken)> RefreshTokenAsync(
        string rawRefreshToken,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawRefreshToken))
        {
            throw new UnauthorizedAccessException("Refresh token is required.");
        }

        var tokenHash = _tokenService.HashToken(rawRefreshToken);
        var session = await _sessionRepository.GetByRefreshTokenHashAsync(tokenHash, cancellationToken);

        if (session == null)
        {
            throw new UnauthorizedAccessException("Invalid refresh token.");
        }

        var now = DateTime.UtcNow;

        // Compromise detection: if a revoked token or previously rotated token is re-submitted,
        // revoke ALL sessions for that user to prevent replay attacks
        if (session.IsRevoked || session.PreviousRefreshTokenHash == tokenHash)
        {
            session.Revoke();
            await _sessionRepository.RevokeAllSessionsForUserAsync(session.UserId, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            throw new UnauthorizedAccessException("Session has been revoked due to detected token compromise / reuse.");
        }

        if (session.ExpiresAtUtc <= now || session.AbsoluteExpiresAtUtc <= now)
        {
            session.Revoke();
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            throw new UnauthorizedAccessException("Session has expired.");
        }

        // Token Rotation: Generate new token pair
        var (newRawRefreshToken, newTokenHash) = _tokenService.GenerateRefreshToken();
        var newExpiresAt = now.AddDays(14);
        session.RotateToken(newTokenHash, newExpiresAt);
        if (!string.IsNullOrEmpty(ipAddress))
        {
            session.Touch(newExpiresAt, ipAddress);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var user = await _userManager.FindByIdAsync(session.UserId.ToString());
        if (user == null)
        {
            throw new UnauthorizedAccessException("User not found.");
        }

        var accessToken = _tokenService.GenerateAccessToken(user.Id, user.Email!, user.Role, session.Id);

        var response = new AuthResponse(
            AccessToken: accessToken,
            ExpiresInMinutes: 15,
            User: new UserDto(
                Id: user.Id,
                Email: user.Email!,
                FullName: $"{user.FirstName} {user.LastName}".Trim(),
                Role: user.Role,
                BaseCurrency: user.CurrencyCode,
                IsLockedOut: false
            ),
            Session: new SessionDto(
                Id: session.Id,
                DeviceName: session.DeviceName,
                DeviceType: session.DeviceType.ToString(),
                Browser: session.Browser,
                IpAddress: session.IpAddress,
                LastActiveAtUtc: session.LastActiveAtUtc,
                ExpiresAtUtc: session.ExpiresAtUtc,
                IsCurrent: true
            )
        );

        return (response, newRawRefreshToken);
    }

    public async Task LogoutAsync(string rawRefreshToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawRefreshToken))
        {
            return;
        }

        var tokenHash = _tokenService.HashToken(rawRefreshToken);
        var session = await _sessionRepository.GetByRefreshTokenHashAsync(tokenHash, cancellationToken);
        if (session != null && !session.IsRevoked)
        {
            session.Revoke();
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<IReadOnlyList<SessionDto>> GetActiveSessionsAsync(
        Guid userId,
        Guid currentSessionId,
        CancellationToken cancellationToken = default)
    {
        var sessions = await _sessionRepository.GetActiveSessionsByUserIdAsync(userId, cancellationToken);
        return sessions.Select(s => new SessionDto(
            Id: s.Id,
            DeviceName: s.DeviceName,
            DeviceType: s.DeviceType.ToString(),
            Browser: s.Browser,
            IpAddress: s.IpAddress,
            LastActiveAtUtc: s.LastActiveAtUtc,
            ExpiresAtUtc: s.ExpiresAtUtc,
            IsCurrent: s.Id == currentSessionId
        )).ToList();
    }

    public async Task RevokeSessionAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        var session = await _sessionRepository.GetByIdAsync(sessionId, cancellationToken);
        if (session != null && session.UserId == userId)
        {
            session.Revoke();
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task RevokeAllOtherSessionsAsync(
        Guid userId,
        Guid currentSessionId,
        CancellationToken cancellationToken = default)
    {
        await _sessionRepository.RevokeAllOtherSessionsAsync(userId, currentSessionId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private record PasswordResetOtpRecord(
        string Otp,
        string IdentityToken,
        DateTime ExpiresAtUtc,
        int Attempts);

    private static string GetOtpCacheKey(string email) => $"wf_pwd_reset_otp_{email.Trim().ToLowerInvariant()}";

    public async Task<string> ForgotPasswordAsync(string email, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("Email address is required.", nameof(email));
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _userManager.FindByEmailAsync(normalizedEmail);
        if (user == null)
        {
            _logger.LogInformation("Password reset requested for non-existent email: {Email}", normalizedEmail);
            return "If an account with this email exists, a 6-digit verification code has been sent.";
        }

        // Generate cryptographically secure 6-digit numeric OTP code
        var otpCode = RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");

        // Generate standard ASP.NET Core Identity password reset token
        var identityToken = await _userManager.GeneratePasswordResetTokenAsync(user);

        // Store OTP & Identity token in memory cache with 10-minute sliding expiration
        var cacheKey = GetOtpCacheKey(normalizedEmail);
        var record = new PasswordResetOtpRecord(otpCode, identityToken, DateTime.UtcNow.AddMinutes(10), 0);
        _memoryCache.Set(cacheKey, record, TimeSpan.FromMinutes(10));

        // Dispatch via SMTP service in background so HTTP response returns in <50ms without buffering/hanging!
        var fullName = $"{user.FirstName} {user.LastName}".Trim();
        var userEmail = user.Email!;
        _ = Task.Run(async () =>
        {
            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(7));
                await _emailService.SendPasswordResetOtpAsync(userEmail, fullName, otpCode, cts.Token);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background email dispatch failed for {Email}.", userEmail);
            }
        });

        return "A 6-digit verification code has been sent to your email address.";
    }

    public bool VerifyResetOtp(string email, string otp)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(otp))
        {
            return false;
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var cacheKey = GetOtpCacheKey(normalizedEmail);
        if (!_memoryCache.TryGetValue(cacheKey, out PasswordResetOtpRecord? record) || record == null)
        {
            return false;
        }

        if (DateTime.UtcNow > record.ExpiresAtUtc)
        {
            _memoryCache.Remove(cacheKey);
            return false;
        }

        return string.Equals(record.Otp.Trim(), otp.Trim(), StringComparison.Ordinal);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw new ArgumentException("Email, verification code, and new password are required.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _userManager.FindByEmailAsync(normalizedEmail);
        if (user == null)
        {
            throw new KeyNotFoundException("No account found with this email address.");
        }

        var cacheKey = GetOtpCacheKey(normalizedEmail);
        string identityTokenToUse;

        // Check if token matches cached 6-digit OTP
        if (_memoryCache.TryGetValue(cacheKey, out PasswordResetOtpRecord? record) && record != null)
        {
            if (DateTime.UtcNow > record.ExpiresAtUtc)
            {
                _memoryCache.Remove(cacheKey);
                throw new InvalidOperationException("The verification code has expired. Please request a new code.");
            }

            if (record.Attempts >= 5)
            {
                _memoryCache.Remove(cacheKey);
                throw new InvalidOperationException("Too many invalid attempts. For security reasons, please request a new verification code.");
            }

            if (!string.Equals(record.Otp.Trim(), request.Token.Trim(), StringComparison.Ordinal))
            {
                _memoryCache.Set(cacheKey, record with { Attempts = record.Attempts + 1 }, TimeSpan.FromMinutes(10));
                var remaining = 5 - (record.Attempts + 1);
                throw new InvalidOperationException($"Invalid verification code. {remaining} attempt{(remaining == 1 ? "" : "s")} remaining.");
            }

            identityTokenToUse = record.IdentityToken;
        }
        else
        {
            // Fallback for direct identity token (e.g. automated tests or direct API calls)
            identityTokenToUse = request.Token;
        }

        var result = await _userManager.ResetPasswordAsync(user, identityTokenToUse, request.NewPassword);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException(errors);
        }

        // Successfully reset: remove OTP from cache
        _memoryCache.Remove(cacheKey);

        // Revoke active sessions upon password reset for security
        var sessions = await _sessionRepository.GetActiveSessionsByUserIdAsync(user.Id, cancellationToken);
        foreach (var session in sessions)
        {
            session.Revoke();
        }
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
