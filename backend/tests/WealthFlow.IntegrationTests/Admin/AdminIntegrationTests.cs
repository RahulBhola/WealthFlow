using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using WealthFlow.Application.Features.Admin.DTOs;
using WealthFlow.Application.Features.Auth.DTOs;
using WealthFlow.IntegrationTests.Fixtures;

namespace WealthFlow.IntegrationTests.Admin;

public class AdminIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AdminIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> CreateUserClientAsync()
    {
        var client = _factory.CreateClient();
        var loginRes = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(
            Email: CustomWebApplicationFactory.TestUserEmail,
            Password: CustomWebApplicationFactory.TestUserPassword
        ));

        loginRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await loginRes.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
        return client;
    }

    private async Task<HttpClient> CreateAdminClientAsync()
    {
        var client = _factory.CreateClient();
        var loginRes = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(
            Email: CustomWebApplicationFactory.AdminUserEmail,
            Password: CustomWebApplicationFactory.AdminUserPassword
        ));

        loginRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await loginRes.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
        return client;
    }

    [Theory]
    [InlineData("/api/v1/admin/dashboard")]
    [InlineData("/api/v1/admin/users")]
    [InlineData("/api/v1/admin/audit-logs")]
    [InlineData("/api/v1/admin/sync/monitor")]
    [InlineData("/api/v1/admin/sync-monitor")]
    public async Task AdminEndpoints_WhenAccessedByStandardUser_MustReturnForbidden(string route)
    {
        // Arrange
        var userClient = await CreateUserClientAsync();

        // Act
        var response = await userClient.GetAsync(route);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden, $"Route '{route}' must require Admin role.");
    }

    [Fact]
    public async Task AdminDashboard_WhenAccessedByAdmin_ShouldReturnMetricsAndVerifySingletonAdmin()
    {
        // Arrange
        var adminClient = await CreateAdminClientAsync();

        // Act
        var response = await adminClient.GetAsync("/api/v1/admin/dashboard");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var summary = await response.Content.ReadFromJsonAsync<AdminCommandCenterDto>();
        summary.Should().NotBeNull();
        summary!.SingleAdminVerified.Should().BeTrue("Singleton Admin Invariant must be verified");
        summary.AdminCount.Should().Be(1, "Exactly one admin account must be present in database");
        summary.TotalUsersCount.Should().BeGreaterThanOrEqualTo(1);
        summary.Subsystems.Should().NotBeNull();
    }

    [Fact]
    public async Task AdminUsers_WhenAccessedByAdmin_ShouldReturnUserList()
    {
        // Arrange
        var adminClient = await CreateAdminClientAsync();

        // Act
        var response = await adminClient.GetAsync("/api/v1/admin/users");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var users = await response.Content.ReadFromJsonAsync<List<AdminUserDto>>();
        users.Should().NotBeNull();
        users!.Should().Contain(u => u.Email == CustomWebApplicationFactory.TestUserEmail);
    }

    [Fact]
    public async Task AdminAuditLogs_WhenAccessedByAdmin_ShouldReturnPagedLogs()
    {
        // Arrange
        var adminClient = await CreateAdminClientAsync();

        // Act
        var response = await adminClient.GetAsync("/api/v1/admin/audit-logs?page=1&pageSize=10");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("items");
        content.Should().Contain("totalCount");
    }

    [Fact]
    public async Task AdminSyncMonitor_WhenAccessedByAdmin_ShouldReturnTelemetry()
    {
        // Arrange
        var adminClient = await CreateAdminClientAsync();

        // Act
        var response = await adminClient.GetAsync("/api/v1/admin/sync/monitor");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var monitor = await response.Content.ReadFromJsonAsync<AdminSyncMonitorDto>();
        monitor.Should().NotBeNull();
        monitor!.Conflicts.Should().NotBeNull();
    }

    [Fact]
    public async Task AdminMaintenanceOperations_SweepAndPrune_ShouldSucceed()
    {
        // Arrange
        var adminClient = await CreateAdminClientAsync();

        // Act 1: Sweep
        var sweepRes = await adminClient.PostAsync("/api/v1/admin/sync/sweep", null);
        sweepRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Act 2: Prune
        var pruneRes = await adminClient.PostAsync("/api/v1/admin/tokens/prune", null);
        pruneRes.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
