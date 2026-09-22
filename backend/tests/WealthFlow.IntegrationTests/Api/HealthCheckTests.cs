using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using WealthFlow.Infrastructure.Identity;
using WealthFlow.IntegrationTests.Fixtures;

namespace WealthFlow.IntegrationTests.Api;

/// <summary>
/// Smoke integration tests verifying application hosting and the Single Universal Test User Invariant.
/// </summary>
public class HealthCheckTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public HealthCheckTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task HealthEndpoint_ShouldReturnOkWithHealthyStatus()
    {
        // Act
        var response = await _client.GetAsync("/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("status").GetString().Should().Be("Healthy");
        content.GetProperty("version").GetString().Should().Be("1.0.0");
    }

    [Fact]
    public async Task UniversalTestUser_ShouldBeSeededCorrectly()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        // Act
        var testUser = await userManager.FindByIdAsync(CustomWebApplicationFactory.TestUserId.ToString());

        // Assert
        testUser.Should().NotBeNull("The single universal test user must be pre-seeded into the test database");
        testUser!.Email.Should().Be(CustomWebApplicationFactory.TestUserEmail);
        testUser.Role.Should().Be(CustomWebApplicationFactory.TestUserRole);
        testUser.Id.Should().Be(CustomWebApplicationFactory.TestUserId);
    }
}
