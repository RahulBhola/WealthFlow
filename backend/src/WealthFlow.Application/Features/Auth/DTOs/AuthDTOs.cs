namespace WealthFlow.Application.Features.Auth.DTOs;

public record RegisterRequest(
    string Email,
    string Password,
    string FullName,
    string? Currency = "INR");

public record LoginRequest(
    string Email,
    string Password,
    string? DeviceName = null,
    string? DeviceType = null,
    string? Browser = null);

public record AuthResponse(
    string AccessToken,
    int ExpiresInMinutes,
    UserDto User,
    SessionDto Session,
    string? RefreshToken = null);

public record UserDto(
    Guid Id,
    string Email,
    string FullName,
    string Role,
    string BaseCurrency,
    bool IsLockedOut);

public record SessionDto(
    Guid Id,
    string DeviceName,
    string DeviceType,
    string? Browser,
    string? IpAddress,
    DateTime LastActiveAtUtc,
    DateTime ExpiresAtUtc,
    bool IsCurrent);

public record RevokeSessionRequest(Guid SessionId);

public record RefreshTokenRequest(string? RefreshToken = null);

public record ForgotPasswordRequest(string Email);

public record VerifyOtpRequest(string Email, string Otp);

public record ResetPasswordRequest(
    string Email,
    string Token,
    string NewPassword);
