using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using WealthFlow.Application.Features.Accounts.DTOs;
using WealthFlow.Application.Features.Auth.DTOs;
using WealthFlow.Application.Features.Sync.DTOs;
using WealthFlow.Domain.Enums;
using WealthFlow.IntegrationTests.Fixtures;
using Xunit;

namespace WealthFlow.IntegrationTests.Sync;

public class SyncIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public SyncIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> CreateAuthenticatedClientAsync()
    {
        var client = _factory.CreateClient();
        var loginResponse = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(
            Email: CustomWebApplicationFactory.TestUserEmail,
            Password: CustomWebApplicationFactory.TestUserPassword
        ));

        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
        return client;
    }

    [Fact]
    public async Task Sync_Batch_ShouldProcessMutations_PersistEntities_AndSupportIdempotency()
    {
        var client = await CreateAuthenticatedClientAsync();

        // 1. Create a bank account to link transactions to
        var createAccRes = await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountRequest(
            Name: $"Sync Test Account {Guid.NewGuid():N}",
            AccountType: "Bank",
            OpeningBalance: 15000m,
            Currency: "INR"
        ));
        createAccRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var account = await createAccRes.Content.ReadFromJsonAsync<AccountDto>();
        account.Should().NotBeNull();

        // 2. Prepare offline batch with client-generated GUIDs
        var clientTxId = Guid.NewGuid();
        var idempotencyKey = Guid.NewGuid();

        var txPayload = JsonSerializer.Serialize(new
        {
            AccountId = account!.Id,
            Amount = 3500m,
            Type = "Expense",
            Date = DateTime.UtcNow,
            Description = "Offline Hardware Purchase"
        });

        var clientTripId = Guid.NewGuid();
        var tripPayload = JsonSerializer.Serialize(new
        {
            Name = "Offline Road Trip",
            Destination = "Ladakh, India",
            StartDate = DateTime.UtcNow.ToString("O"),
            EndDate = DateTime.UtcNow.AddDays(7).ToString("O"),
            Budget = 60000m
        });

        var batchRequest = new SyncBatchRequest(
            ClientId: "integration-test-client",
            Mutations: new List<ClientMutationDto>
            {
                new ClientMutationDto(
                    Id: Guid.NewGuid(),
                    IdempotencyKey: idempotencyKey,
                    EntityName: "Transaction",
                    Operation: "Create",
                    EntityId: clientTxId,
                    ClientTimestampUtc: DateTime.UtcNow,
                    PayloadJson: txPayload
                ),
                new ClientMutationDto(
                    Id: Guid.NewGuid(),
                    IdempotencyKey: Guid.NewGuid(),
                    EntityName: "Trip",
                    Operation: "Create",
                    EntityId: clientTripId,
                    ClientTimestampUtc: DateTime.UtcNow,
                    PayloadJson: tripPayload
                )
            }
        );

        // 3. Post Batch to /api/v1/sync/batch
        var batchResponse = await client.PostAsJsonAsync("/api/v1/sync/batch", batchRequest);
        batchResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var syncResult = await batchResponse.Content.ReadFromJsonAsync<SyncBatchResponse>();
        syncResult.Should().NotBeNull();
        syncResult!.ProcessedCount.Should().Be(2);
        syncResult.Results.Should().HaveCount(2);
        syncResult.Results.All(r => r.Status == "Synced").Should().BeTrue();

        // 4. Verify idempotent replay returns duplicate cached outcome
        var replayResponse = await client.PostAsJsonAsync("/api/v1/sync/batch", batchRequest);
        replayResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var replayResult = await replayResponse.Content.ReadFromJsonAsync<SyncBatchResponse>();
        replayResult.Should().NotBeNull();
        replayResult!.Results[0].Status.Should().Be("Duplicate");
        replayResult.Results[0].Resolution.Should().Be("CachedOutcome");

        // 5. Test Telemetry Endpoint
        var telemetryRes = await client.GetAsync("/api/v1/sync/telemetry");
        telemetryRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var telemetry = await telemetryRes.Content.ReadFromJsonAsync<SyncTelemetryDto>();
        telemetry.Should().NotBeNull();
        telemetry!.TotalProcessedToday.Should().BeGreaterThan(0);

        // 6. Test Conflicts Endpoint
        var conflictsRes = await client.GetAsync("/api/v1/sync/conflicts");
        conflictsRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var conflicts = await conflictsRes.Content.ReadFromJsonAsync<IReadOnlyList<SyncOperationLogDto>>();
        conflicts.Should().NotBeNull();
    }
}
