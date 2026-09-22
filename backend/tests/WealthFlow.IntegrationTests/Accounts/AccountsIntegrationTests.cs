using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using WealthFlow.Application.Features.Accounts.DTOs;
using WealthFlow.Application.Features.Auth.DTOs;
using WealthFlow.Application.Features.Categories.DTOs;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;
using WealthFlow.Infrastructure.Persistence;
using WealthFlow.IntegrationTests.Fixtures;

namespace WealthFlow.IntegrationTests.Accounts;

public class AccountsIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AccountsIntegrationTests(CustomWebApplicationFactory factory)
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
    public async Task CreateAccount_WithOpeningBalance_ShouldSucceed_AndEnforceMasking()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();
        var request = new CreateAccountRequest(
            Name: "HDFC Salary Account",
            AccountType: "Bank",
            OpeningBalance: 50000m,
            AccountNumberMask: "98765432104821",
            ColorTag: "#3B82F6",
            SortOrder: 1,
            Currency: "INR"
        );

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/accounts", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var account = await response.Content.ReadFromJsonAsync<AccountDto>();
        account.Should().NotBeNull();
        account!.Name.Should().Be("HDFC Salary Account");
        account.AccountType.Should().Be("Bank");
        account.OpeningBalance.Should().Be(50000m);
        account.CurrentBalance.Should().Be(50000m);
        account.AccountNumberMask.Should().Be("•••• 4821", "Zero-Trust Banking Boundary must mask all except last 4 digits");
        account.ColorTag.Should().Be("#3B82F6");
        account.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task GetAccounts_AndSummary_ShouldReturnCorrectLiquidTotals()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();
        var accountName = $"Cash Wallet {Guid.NewGuid():N}";
        await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountRequest(
            Name: accountName,
            AccountType: "Cash",
            OpeningBalance: 12000m,
            SortOrder: 2
        ));

        // Act
        var listResponse = await client.GetAsync("/api/v1/accounts");
        var summaryResponse = await client.GetAsync("/api/v1/accounts/summary");

        // Assert
        listResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var accounts = await listResponse.Content.ReadFromJsonAsync<List<AccountDto>>();
        accounts.Should().NotBeNull();
        accounts!.Should().Contain(a => a.Name == accountName);

        summaryResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var summary = await summaryResponse.Content.ReadFromJsonAsync<AccountSummaryDto>();
        summary.Should().NotBeNull();
        summary!.TotalLiquidBalance.Should().BeGreaterThan(0);
        summary.TotalCashBalance.Should().BeGreaterOrEqualTo(12000m);
        summary.ActiveAccountCount.Should().BeGreaterOrEqualTo(1);
    }

    [Fact]
    public async Task ArchiveAndActivate_Account_ShouldUpdateStatusProperly()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();
        var createRes = await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountRequest(
            Name: "Old Credit Account",
            AccountType: "Other",
            OpeningBalance: 0m
        ));
        createRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createRes.Content.ReadFromJsonAsync<AccountDto>();
        var accountId = created!.Id;

        // Act 1: Archive
        var archiveRes = await client.PostAsync($"/api/v1/accounts/{accountId}/archive", null);
        archiveRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify active list excludes it
        var activeRes = await client.GetAsync("/api/v1/accounts");
        var activeAccounts = await activeRes.Content.ReadFromJsonAsync<List<AccountDto>>();
        activeAccounts!.Should().NotContain(a => a.Id == accountId);

        // Verify includeArchived includes it
        var allRes = await client.GetAsync("/api/v1/accounts?includeArchived=true");
        var allAccounts = await allRes.Content.ReadFromJsonAsync<List<AccountDto>>();
        allAccounts!.Should().Contain(a => a.Id == accountId && !a.IsActive);

        // Act 2: Activate
        var activateRes = await client.PostAsync($"/api/v1/accounts/{accountId}/activate", null);
        activateRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify active list now includes it
        var postActivateRes = await client.GetAsync("/api/v1/accounts");
        var postActivateAccounts = await postActivateRes.Content.ReadFromJsonAsync<List<AccountDto>>();
        postActivateAccounts!.Should().Contain(a => a.Id == accountId && a.IsActive);
    }

    [Fact]
    public async Task DeleteAccount_WithTransactions_ShouldReturnBadRequest_EnforcingProtection()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();
        var createRes = await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountRequest(
            Name: "Protected Account",
            AccountType: "Bank",
            OpeningBalance: 1000m
        ));
        createRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createRes.Content.ReadFromJsonAsync<AccountDto>();
        var accountId = created!.Id;

        // Insert a transaction linked to this account
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var tx = new Transaction(
                userId: CustomWebApplicationFactory.TestUserId,
                accountId: accountId,
                amount: 250m,
                transactionDate: DateTime.UtcNow,
                eventType: TransactionEventType.Expense,
                description: "Grocery test purchase"
            );
            db.Transactions.Add(tx);
            await db.SaveChangesAsync();
        }

        // Act: Attempt to delete the account
        var deleteResponse = await client.DeleteAsync($"/api/v1/accounts/{accountId}");

        // Assert: 400 Bad Request
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errorContent = await deleteResponse.Content.ReadAsStringAsync();
        errorContent.Should().Contain("Cannot delete account with existing transactions");
    }

    [Fact]
    public async Task ReconcileAccount_ShouldRecalculateMaterializedBalance_AndDetectDiscrepancy()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();
        var createRes = await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountRequest(
            Name: "Reconciliation Test Account",
            AccountType: "Bank",
            OpeningBalance: 10000m
        ));
        createRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createRes.Content.ReadFromJsonAsync<AccountDto>();
        var accountId = created!.Id;

        // Insert ledger transactions: +5000 income, -2000 expense => Expected: 13,000
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Transactions.AddRange(
                new Transaction(
                    userId: CustomWebApplicationFactory.TestUserId,
                    accountId: accountId,
                    amount: 5000m,
                    transactionDate: DateTime.UtcNow.AddDays(-2),
                    eventType: TransactionEventType.Income,
                    description: "Salary credit"
                ),
                new Transaction(
                    userId: CustomWebApplicationFactory.TestUserId,
                    accountId: accountId,
                    amount: 2000m,
                    transactionDate: DateTime.UtcNow.AddDays(-1),
                    eventType: TransactionEventType.Expense,
                    description: "Rent payment"
                )
            );

            // Tamper current balance to simulate a materialized drift
            var accountEntity = await db.Accounts.FindAsync(accountId);
            accountEntity!.AdjustBalance(1000m); // balance is now 11,000 instead of 13,000
            await db.SaveChangesAsync();
        }

        // Act: Reconcile account
        var reconcileRes = await client.PostAsync($"/api/v1/accounts/{accountId}/reconcile", null);

        // Assert
        reconcileRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var reconcileData = await reconcileRes.Content.ReadFromJsonAsync<ReconcileAccountResponse>();
        reconcileData.Should().NotBeNull();
        reconcileData!.OpeningBalance.Should().Be(10000m);
        reconcileData.PreviousBalance.Should().Be(11000m);
        reconcileData.ReconciledBalance.Should().Be(13000m);
        reconcileData.HasDiscrepancy.Should().BeTrue();
        reconcileData.Discrepancy.Should().Be(-2000m);
        reconcileData.TransactionCount.Should().Be(2);

        // Verify account balance is now updated in subsequent GET
        var getRes = await client.GetAsync($"/api/v1/accounts/{accountId}");
        var updatedAccount = await getRes.Content.ReadFromJsonAsync<AccountDto>();
        updatedAccount!.CurrentBalance.Should().Be(13000m);
    }

    [Fact]
    public async Task Categories_GetAndCreate_ShouldReturnHierarchyAndSystemCategories()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        // Act 1: Get Categories (seeds default tree on demand)
        var getRes = await client.GetAsync("/api/v1/categories");
        getRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var categories = await getRes.Content.ReadFromJsonAsync<List<CategoryDto>>();

        // Assert 1: System categories exist with subcategories
        categories.Should().NotBeNull();
        categories!.Count.Should().BeGreaterOrEqualTo(10);
        var food = categories.FirstOrDefault(c => c.Name == "Food & Dining");
        food.Should().NotBeNull();
        food!.Subcategories.Should().NotBeNullOrEmpty();
        food.Subcategories!.Should().Contain(s => s.Name == "Protein & Fitness Food" && s.IsSpecialProtein);

        // Act 2: Create Custom Category
        var createCustomRes = await client.PostAsJsonAsync("/api/v1/categories", new CreateCategoryRequest(
            Name: "Custom Collectibles",
            Icon: "Sparkles",
            ColorHex: "#6366F1"
        ));
        createCustomRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var custom = await createCustomRes.Content.ReadFromJsonAsync<CategoryDto>();
        custom.Should().NotBeNull();
        custom!.Name.Should().Be("Custom Collectibles");
        custom.IsSystem.Should().BeFalse();
    }
}
