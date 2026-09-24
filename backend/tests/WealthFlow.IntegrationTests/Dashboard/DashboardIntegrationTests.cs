using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using WealthFlow.Application.Features.Auth.DTOs;
using WealthFlow.Application.Features.Dashboard.DTOs;
using WealthFlow.IntegrationTests.Fixtures;

namespace WealthFlow.IntegrationTests.Dashboard;

public class DashboardIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public DashboardIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> CreateAuthenticatedClientAsync()
    {
        var client = _factory.CreateClient();
        var loginRes = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(
            Email: CustomWebApplicationFactory.TestUserEmail,
            Password: CustomWebApplicationFactory.TestUserPassword
        ));

        loginRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var authResponse = await loginRes.Content.ReadFromJsonAsync<AuthResponse>();
        authResponse.Should().NotBeNull();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authResponse!.AccessToken);
        return client;
    }

    [Fact]
    public async Task GetSummary_WhenUnauthenticated_ShouldReturnUnauthorized()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/dashboard/summary");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetSummary_WhenAuthenticated_ShouldReturnValidRollup()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        // Act
        var response = await client.GetAsync("/api/v1/dashboard/summary");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var summary = await response.Content.ReadFromJsonAsync<DashboardSummaryDto>();
        summary.Should().NotBeNull();
        summary!.NetWorthHistory.Should().NotBeNull();
        summary.NetWorthHistory.Count.Should().Be(12, "Should return 12-month net worth history");
        summary.RecentTransactions.Should().NotBeNull();
        summary.BudgetGlances.Should().NotBeNull();
        summary.AccountsSummary.Should().NotBeNull();
    }

    [Fact]
    public async Task GetAnalytics_WhenAuthenticated_ShouldReturnBreakdownsAndWaterfall()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        // Act
        var response = await client.GetAsync("/api/v1/dashboard/analytics");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var analytics = await response.Content.ReadFromJsonAsync<AnalyticsSummaryDto>();
        analytics.Should().NotBeNull();
        analytics!.NetWorthHistory.Should().NotBeNull();
        analytics.CategoryBreakdown.Should().NotBeNull();
        analytics.CashFlowWaterfall.Should().NotBeNull();
        analytics.CashFlowWaterfall.Should().NotBeEmpty();
    }

    [Fact]
    public async Task AnalyticsEndpoints_ShouldReturnSpecificDataSubsets()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        // Act & Assert 1: net-worth-history
        var nwRes = await client.GetAsync("/api/v1/analytics/net-worth-history");
        nwRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var nwHistory = await nwRes.Content.ReadFromJsonAsync<List<NetWorthHistoryPointDto>>();
        nwHistory.Should().NotBeNull();
        nwHistory!.Count.Should().Be(12);

        // Act & Assert 2: category-breakdown
        var catRes = await client.GetAsync("/api/v1/analytics/category-breakdown");
        catRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var catBreakdown = await catRes.Content.ReadFromJsonAsync<List<CategorySpendingBreakdownDto>>();
        catBreakdown.Should().NotBeNull();

        // Act & Assert 3: cashflow-waterfall
        var wfRes = await client.GetAsync("/api/v1/analytics/cashflow-waterfall");
        wfRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var waterfall = await wfRes.Content.ReadFromJsonAsync<List<CashFlowWaterfallStepDto>>();
        waterfall.Should().NotBeNull();
        waterfall!.Should().NotBeEmpty();
    }
}
