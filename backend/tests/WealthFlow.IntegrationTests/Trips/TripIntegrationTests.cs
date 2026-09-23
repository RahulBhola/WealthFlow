using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using WealthFlow.Application.Features.Auth.DTOs;
using WealthFlow.Application.Features.Trips.DTOs;
using WealthFlow.IntegrationTests.Fixtures;

namespace WealthFlow.IntegrationTests.Trips;

public class TripIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public TripIntegrationTests(CustomWebApplicationFactory factory)
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
    public async Task Trip_Create_And_AddMembers_ShouldPersist_AndReflectInList()
    {
        var client = await CreateAuthenticatedClientAsync();

        // 1. Create Trip
        var createTripRes = await client.PostAsJsonAsync("/api/v1/trips", new CreateTripRequest(
            Name: $"Goa Vacation {Guid.NewGuid():N}",
            Destination: "Goa, India",
            StartDate: DateTime.UtcNow,
            EndDate: DateTime.UtcNow.AddDays(6),
            Budget: 50000m
        ));

        createTripRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var trip = await createTripRes.Content.ReadFromJsonAsync<TripDto>();
        trip.Should().NotBeNull();
        trip!.Name.Should().Contain("Goa Vacation");
        trip.Budget.Should().Be(50000m);
        trip.TotalExpenses.Should().Be(0m);
        trip.MemberCount.Should().Be(1); // Host auto-added

        // 2. Add Member
        var addMemberRes = await client.PostAsJsonAsync($"/api/v1/trips/{trip.Id}/members", new AddTripMemberRequest(
            GuestName: "Amit Sharma",
            CanAddExpenses: true
        ));
        addMemberRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var member = await addMemberRes.Content.ReadFromJsonAsync<TripMemberDto>();
        member.Should().NotBeNull();
        member!.GuestName.Should().Be("Amit Sharma");
        member.CanAddExpenses.Should().BeTrue();
    }

    [Fact]
    public async Task Trip_GuestLink_Generation_And_Access_ShouldAllowViewing_WithoutHostAuth()
    {
        var client = await CreateAuthenticatedClientAsync();

        // 1. Create Trip & Member
        var tripRes = await client.PostAsJsonAsync("/api/v1/trips", new CreateTripRequest(
            Name: $"Manali Trip {Guid.NewGuid():N}",
            Destination: "Manali",
            StartDate: DateTime.UtcNow,
            EndDate: DateTime.UtcNow.AddDays(4),
            Budget: 30000m
        ));
        var trip = await tripRes.Content.ReadFromJsonAsync<TripDto>();

        var memberRes = await client.PostAsJsonAsync($"/api/v1/trips/{trip!.Id}/members", new AddTripMemberRequest(
            GuestName: "Neha Verma",
            CanAddExpenses: true
        ));
        var member = await memberRes.Content.ReadFromJsonAsync<TripMemberDto>();

        // 2. Generate 256-bit cryptographic guest link
        var guestLinkRes = await client.PostAsJsonAsync(
            $"/api/v1/trips/{trip.Id}/members/{member!.Id}/guest-link",
            new CreateGuestLinkRequest(CanAddExpenses: true, ExpiryDays: 14));
        guestLinkRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var guestLink = await guestLinkRes.Content.ReadFromJsonAsync<CreateGuestLinkResponse>();
        guestLink.Should().NotBeNull();
        guestLink!.RawToken.Should().NotBeNullOrEmpty();
        guestLink.RawToken.Length.Should().Be(64); // 32 bytes in hex = 64 characters

        // 3. Unauthenticated client accesses guest endpoint directly
        var unauthenticatedClient = _factory.CreateClient();
        var guestViewRes = await unauthenticatedClient.GetAsync($"/api/v1/trips/{trip.Id}/guest/{guestLink.RawToken}");
        guestViewRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var guestView = await guestViewRes.Content.ReadFromJsonAsync<GuestTripViewDto>();
        guestView.Should().NotBeNull();
        guestView!.Trip.Name.Should().Be(trip.Name);
        guestView.CurrentMember.GuestName.Should().Be("Neha Verma");
        guestView.CurrentMember.CanAddExpenses.Should().BeTrue();

        // 4. Verify guest cannot access host's private bank accounts
        var forbiddenRes = await unauthenticatedClient.GetAsync("/api/v1/accounts");
        forbiddenRes.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Trip_TravelAdvance_ShouldAdjustBalances_WithoutTouchingTotalExpenses_Invariant()
    {
        var client = await CreateAuthenticatedClientAsync();

        // 1. Create Trip & 2 Members
        var tripRes = await client.PostAsJsonAsync("/api/v1/trips", new CreateTripRequest(
            Name: $"Advance Test Trip {Guid.NewGuid():N}",
            Destination: "Rishikesh",
            StartDate: DateTime.UtcNow,
            EndDate: DateTime.UtcNow.AddDays(3),
            Budget: 15000m
        ));
        var trip = await tripRes.Content.ReadFromJsonAsync<TripDto>();

        var m1Res = await client.PostAsJsonAsync($"/api/v1/trips/{trip!.Id}/members", new AddTripMemberRequest("Payer Rahul"));
        var m1 = await m1Res.Content.ReadFromJsonAsync<TripMemberDto>();

        var m2Res = await client.PostAsJsonAsync($"/api/v1/trips/{trip.Id}/members", new AddTripMemberRequest("Receiver Amit"));
        var m2 = await m2Res.Content.ReadFromJsonAsync<TripMemberDto>();

        // 2. Add an expense of ₹2,000 paid by m1 split equally
        var expenseRes = await client.PostAsJsonAsync($"/api/v1/trips/{trip.Id}/expenses", new CreateTripExpenseRequest(
            PayerMemberId: m1!.Id,
            Amount: 2000m,
            ExpenseDate: DateTime.UtcNow,
            Description: "Rafting Tickets",
            SplitType: "Equal",
            Splits: new List<SplitInputDto>
            {
                new(m1.Id),
                new(m2!.Id)
            }
        ));
        expenseRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Check summary before advance
        var sumBeforeRes = await client.GetAsync($"/api/v1/trips/{trip.Id}/summary");
        var sumBefore = await sumBeforeRes.Content.ReadFromJsonAsync<TripSummaryDto>();
        sumBefore!.TotalGroupSpending.Should().Be(2000m);

        // 3. Record Travel Advance: m2 transfers ₹500 advance to m1
        var advRes = await client.PostAsJsonAsync($"/api/v1/trips/{trip.Id}/advances", new CreateTripAdvanceRequest(
            GiverMemberId: m2.Id,
            ReceiverMemberId: m1.Id,
            Amount: 500m,
            AdvanceDate: DateTime.UtcNow,
            Notes: "UPI Advance"
        ));
        advRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 4. Invariant Assertion: TotalGroupSpending is STILL EXACTLY ₹2,000!
        var sumAfterRes = await client.GetAsync($"/api/v1/trips/{trip.Id}/summary");
        var sumAfter = await sumAfterRes.Content.ReadFromJsonAsync<TripSummaryDto>();
        sumAfter!.TotalGroupSpending.Should().Be(2000m);

        // Check adjusted balances:
        // Before advance: m1 paid 2000, share 1000 -> Net = +1000. m2 share 1000 -> Net = -1000.
        // After advance: m2 gave 500 -> m2 Net = -1000 + 500 = -500. m1 received 500 -> m1 Net = +1000 - 500 = +500.
        var m1Sum = sumAfter.MemberSummaries.First(m => m.MemberId == m1.Id);
        var m2Sum = sumAfter.MemberSummaries.First(m => m.MemberId == m2.Id);

        m1Sum.NetBalance.Should().Be(500m);
        m2Sum.NetBalance.Should().Be(-500m);

        // Simplified repayment: m2 owes m1 ₹500
        sumAfter.SimplifiedRepayments.Should().ContainSingle();
        var repayment = sumAfter.SimplifiedRepayments[0];
        repayment.FromMemberId.Should().Be(m2.Id);
        repayment.ToMemberId.Should().Be(m1.Id);
        repayment.Amount.Should().Be(500m);

        // 5. Execute Settle Up
        var settleRes = await client.PostAsJsonAsync($"/api/v1/trips/{trip.Id}/settlement/execute", new ExecuteSettlementRequest(
            PayerMemberId: m2.Id,
            ReceiverMemberId: m1.Id,
            Amount: 500m,
            SettledDate: DateTime.UtcNow,
            PaymentMethod: "UPI",
            Notes: "Settled via PhonePe"
        ));
        settleRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var finalSumRes = await client.GetAsync($"/api/v1/trips/{trip.Id}/summary");
        var finalSum = await finalSumRes.Content.ReadFromJsonAsync<TripSummaryDto>();
        finalSum!.SimplifiedRepayments.Should().BeEmpty();
        finalSum.MemberSummaries.All(m => m.IsSettled).Should().BeTrue();
    }
}
