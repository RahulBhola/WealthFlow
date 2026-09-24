using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Auth.DTOs;
using WealthFlow.Application.Features.Auth.Interfaces;

namespace WealthFlow.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private const string RefreshTokenCookieName = "wf_refresh_token";
    private readonly IAuthService _authService;
    private readonly ICurrentUserService _currentUserService;

    public AuthController(IAuthService _authService, ICurrentUserService currentUserService)
    {
        this._authService = _authService;
        _currentUserService = currentUserService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var (response, rawRefreshToken) = await _authService.RegisterAsync(request, ipAddress, cancellationToken);
            SetRefreshTokenCookie(rawRefreshToken);
            return StatusCode(StatusCodes.Status201Created, response with { RefreshToken = rawRefreshToken });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var (response, rawRefreshToken) = await _authService.LoginAsync(request, ipAddress, cancellationToken);
            SetRefreshTokenCookie(rawRefreshToken);
            return Ok(response with { RefreshToken = rawRefreshToken });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest? bodyRequest, CancellationToken cancellationToken)
    {
        try
        {
            // Prefer HttpOnly cookie, fallback to request body if provided
            var rawRefreshToken = Request.Cookies[RefreshTokenCookieName] ?? bodyRequest?.RefreshToken;
            if (string.IsNullOrWhiteSpace(rawRefreshToken))
            {
                return Unauthorized(new { message = "Refresh token is missing." });
            }

            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var (response, newRawRefreshToken) = await _authService.RefreshTokenAsync(rawRefreshToken, ipAddress, cancellationToken);
            SetRefreshTokenCookie(newRawRefreshToken);
            return Ok(response with { RefreshToken = newRawRefreshToken });
        }
        catch (UnauthorizedAccessException ex)
        {
            ClearRefreshTokenCookie();
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var rawRefreshToken = Request.Cookies[RefreshTokenCookieName];
        if (!string.IsNullOrWhiteSpace(rawRefreshToken))
        {
            await _authService.LogoutAsync(rawRefreshToken, cancellationToken);
        }

        ClearRefreshTokenCookie();
        return Ok(new { message = "Logged out successfully." });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var message = await _authService.ForgotPasswordAsync(request.Email, cancellationToken);
            return Ok(new
            {
                message,
                email = request.Email
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred while generating password reset code: " + ex.Message });
        }
    }

    [HttpPost("verify-reset-otp")]
    public IActionResult VerifyResetOtp([FromBody] VerifyOtpRequest request)
    {
        try
        {
            var isValid = _authService.VerifyResetOtp(request.Email, request.Otp);
            if (!isValid)
            {
                return BadRequest(new { message = "Invalid or expired verification code." });
            }
            return Ok(new { message = "Verification code is valid." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred while verifying code: " + ex.Message });
        }
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        try
        {
            await _authService.ResetPasswordAsync(request, cancellationToken);
            return Ok(new { message = "Password has been successfully reset. You can now log in with your new password." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "An error occurred while resetting password: " + ex.Message });
        }
    }

    [Authorize]
    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions(CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId == null || _currentUserService.SessionId == null)
        {
            return Unauthorized();
        }

        var sessions = await _authService.GetActiveSessionsAsync(
            _currentUserService.UserId.Value,
            _currentUserService.SessionId.Value,
            cancellationToken);

        return Ok(sessions);
    }

    [Authorize]
    [HttpPost("sessions/{id:guid}/revoke")]
    public async Task<IActionResult> RevokeSession(Guid id, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId == null)
        {
            return Unauthorized();
        }

        await _authService.RevokeSessionAsync(_currentUserService.UserId.Value, id, cancellationToken);
        return Ok(new { message = "Session revoked successfully." });
    }

    [Authorize]
    [HttpPost("sessions/revoke-all-others")]
    public async Task<IActionResult> RevokeAllOtherSessions(CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId == null || _currentUserService.SessionId == null)
        {
            return Unauthorized();
        }

        await _authService.RevokeAllOtherSessionsAsync(
            _currentUserService.UserId.Value,
            _currentUserService.SessionId.Value,
            cancellationToken);

        return Ok(new { message = "All other sessions have been revoked." });
    }

    /// <summary>
    /// INVARIANT: Self-service or API elevation to Admin is strictly forbidden by policy.
    /// Admin accounts must be manually seeded by database administrators.
    /// </summary>
    [HttpPost("promote")]
    public IActionResult Promote()
    {
        return StatusCode(StatusCodes.Status403Forbidden, new
        {
            message = "Elevation to Admin via API is strictly prohibited. Exactly one Singleton Admin exists and must be provisioned via database seed scripts."
        });
    }

    private void SetRefreshTokenCookie(string refreshToken)
    {
        var isLocalHttp = !Request.IsHttps && HttpContext.Request.Host.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase);
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = !isLocalHttp,
            SameSite = isLocalHttp ? SameSiteMode.Lax : SameSiteMode.None,
            Expires = DateTime.UtcNow.AddDays(14)
        };
        Response.Cookies.Append(RefreshTokenCookieName, refreshToken, cookieOptions);
    }

    private void ClearRefreshTokenCookie()
    {
        var isLocalHttp = !Request.IsHttps && HttpContext.Request.Host.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase);
        Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = !isLocalHttp,
            SameSite = isLocalHttp ? SameSiteMode.Lax : SameSiteMode.None
        });
    }
}

