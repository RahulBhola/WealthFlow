using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using WealthFlow.Application.Features.Auth.DTOs;
using WealthFlow.IntegrationTests.Fixtures;

namespace WealthFlow.IntegrationTests.Auth;

public class AuthIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AuthIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Register_ShouldStrictlyAssignUserRole_AndReturnCreated()
    {
        // Arrange
        var client = _factory.CreateClient();
        var registerRequest = new RegisterRequest(
            Email: $"newuser_{Guid.NewGuid():N}@wealthflow.local",
            Password: "SecurePassword@123",
            FullName: "Registered User",
            Currency: "INR"
        );

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", registerRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var authResponse = await response.Content.ReadFromJsonAsync<AuthResponse>();
        authResponse.Should().NotBeNull();
        authResponse!.AccessToken.Should().NotBeNullOrWhiteSpace();
        authResponse.User.Role.Should().Be("User", "Public self-service registration must strictly assign 'User' role");
        authResponse.User.Email.Should().Be(registerRequest.Email.ToLowerInvariant());

        // Verify Set-Cookie header contains wf_refresh_token
        response.Headers.TryGetValues("Set-Cookie", out var cookies).Should().BeTrue();
        cookies.Should().Contain(c => c.Contains("wf_refresh_token") && c.Contains("httponly"));
    }

    [Fact]
    public async Task Login_WithUniversalTestUser_ShouldSucceed_AndReturnValidTokens()
    {
        // Arrange
        var client = _factory.CreateClient();
        var loginRequest = new LoginRequest(
            Email: CustomWebApplicationFactory.TestUserEmail,
            Password: CustomWebApplicationFactory.TestUserPassword,
            DeviceName: "Test Desktop",
            DeviceType: "Desktop"
        );

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/auth/login", loginRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var authResponse = await response.Content.ReadFromJsonAsync<AuthResponse>();
        authResponse.Should().NotBeNull();
        authResponse!.AccessToken.Should().NotBeNullOrWhiteSpace();
        authResponse.ExpiresInMinutes.Should().Be(15);
        authResponse.User.Email.Should().Be(CustomWebApplicationFactory.TestUserEmail);
        authResponse.User.Role.Should().Be("User");
        authResponse.Session.DeviceName.Should().Be("Test Desktop");

        // Verify cookie
        response.Headers.TryGetValues("Set-Cookie", out var cookies).Should().BeTrue();
        cookies.Should().Contain(c => c.Contains("wf_refresh_token") && c.Contains("httponly"));
    }

    [Fact]
    public async Task Login_WithInvalidPassword_ShouldReturnUnauthorized()
    {
        // Arrange
        var client = _factory.CreateClient();
        var loginRequest = new LoginRequest(
            Email: CustomWebApplicationFactory.TestUserEmail,
            Password: "WrongPassword@999"
        );

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/auth/login", loginRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task RefreshToken_Rotation_ShouldIssueNewToken_AndDetectReplayCompromise()
    {
        // Arrange
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var loginRequest = new LoginRequest(
            Email: CustomWebApplicationFactory.TestUserEmail,
            Password: CustomWebApplicationFactory.TestUserPassword,
            DeviceName: "Rotation Device"
        );

        var loginRes = await client.PostAsJsonAsync("/api/v1/auth/login", loginRequest);
        loginRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Extract raw refresh token cookie
        loginRes.Headers.TryGetValues("Set-Cookie", out var cookies);
        var initialCookie = cookies!.First(c => c.Contains("wf_refresh_token"));
        var rawInitialToken = ExtractCookieValue(initialCookie, "wf_refresh_token");

        // Act 1: Legitimate Token Refresh
        var refreshRes = await client.PostAsJsonAsync("/api/v1/auth/refresh-token", new RefreshTokenRequest(rawInitialToken));
        refreshRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var refreshData = await refreshRes.Content.ReadFromJsonAsync<AuthResponse>();
        refreshData.Should().NotBeNull();
        refreshData!.AccessToken.Should().NotBeNullOrWhiteSpace();

        // Extract rotated refresh token
        refreshRes.Headers.TryGetValues("Set-Cookie", out var newCookies);
        var newCookie = newCookies!.First(c => c.Contains("wf_refresh_token"));
        var rawNewToken = ExtractCookieValue(newCookie, "wf_refresh_token");
        rawNewToken.Should().NotBe(rawInitialToken, "Refresh token must rotate upon renewal");

        // Act 2: Compromise / Replay Attack using stale initial token
        var replayClient = _factory.CreateClient();
        var replayRes = await replayClient.PostAsJsonAsync("/api/v1/auth/refresh-token", new RefreshTokenRequest(rawInitialToken));

        // Assert: Replay must be rejected
        replayRes.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // Assert: All sessions for that user should now be revoked due to compromise detection
        var postCompromiseRefresh = await client.PostAsJsonAsync("/api/v1/auth/refresh-token", new RefreshTokenRequest(rawNewToken));
        postCompromiseRefresh.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Sessions_MultiDevice_AndRevokeAllOthers_ShouldSucceed()
    {
        // Arrange: Log in device 1
        var client1 = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var login1 = await client1.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(
            Email: CustomWebApplicationFactory.TestUserEmail,
            Password: CustomWebApplicationFactory.TestUserPassword,
            DeviceName: "Primary Laptop",
            DeviceType: "Desktop"
        ));
        login1.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth1 = await login1.Content.ReadFromJsonAsync<AuthResponse>();
        client1.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth1!.AccessToken);

        // Arrange: Log in device 2
        var client2 = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var login2 = await client2.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(
            Email: CustomWebApplicationFactory.TestUserEmail,
            Password: CustomWebApplicationFactory.TestUserPassword,
            DeviceName: "Mobile Phone",
            DeviceType: "Mobile"
        ));
        login2.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth2 = await login2.Content.ReadFromJsonAsync<AuthResponse>();
        client2.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth2!.AccessToken);

        // Act: List sessions from device 1
        var sessionsRes = await client1.GetAsync("/api/v1/auth/sessions");
        sessionsRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var sessions = await sessionsRes.Content.ReadFromJsonAsync<List<SessionDto>>();
        sessions.Should().NotBeNull();
        sessions!.Count.Should().BeGreaterOrEqualTo(2);
        sessions.Should().Contain(s => s.DeviceName == "Primary Laptop" && s.IsCurrent);
        sessions.Should().Contain(s => s.DeviceName == "Mobile Phone" && !s.IsCurrent);

        // Act: Revoke all other sessions from device 1
        var revokeRes = await client1.PostAsync("/api/v1/auth/sessions/revoke-all-others", null);
        revokeRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Assert: device 2 session is now revoked when checking sessions
        var updatedSessionsRes = await client1.GetAsync("/api/v1/auth/sessions");
        var updatedSessions = await updatedSessionsRes.Content.ReadFromJsonAsync<List<SessionDto>>();
        updatedSessions.Should().NotBeNull();
        updatedSessions!.Should().ContainSingle(s => s.DeviceName == "Primary Laptop");
    }

    [Fact]
    public async Task SingletonAdmin_Invariant_ProtectedAdminRoutes_ShouldReturnForbiddenForUser()
    {
        // Arrange: Authenticate as universal test user (Role: User)
        var client = _factory.CreateClient();
        var loginRes = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(
            Email: CustomWebApplicationFactory.TestUserEmail,
            Password: CustomWebApplicationFactory.TestUserPassword
        ));
        loginRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var authResponse = await loginRes.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authResponse!.AccessToken);

        // Act 1: Access Admin Dashboard
        var adminRes = await client.GetAsync("/api/v1/admin/dashboard");

        // Assert 1: Forbidden
        adminRes.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        // Act 2: Attempt elevation via API
        var promoteRes = await client.PostAsync("/api/v1/auth/promote", null);

        // Assert 2: Strictly Forbidden (403)
        promoteRes.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private static string ExtractCookieValue(string cookieHeader, string cookieName)
    {
        var parts = cookieHeader.Split(';');
        var targetPart = parts.First(p => p.Trim().StartsWith($"{cookieName}="));
        return targetPart.Split('=')[1].Trim();
    }
}
