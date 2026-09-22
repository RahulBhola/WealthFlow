using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using WealthFlow.Application.Features.Accounts.DTOs;
using WealthFlow.Application.Features.Auth.DTOs;
using WealthFlow.Application.Features.Budgets.DTOs;
using WealthFlow.Application.Features.Categories.DTOs;
using WealthFlow.Application.Features.Transactions.DTOs;
using WealthFlow.IntegrationTests.Fixtures;

namespace WealthFlow.IntegrationTests.Transactions;

public class TransactionsIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public TransactionsIntegrationTests(CustomWebApplicationFactory factory)
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
    public async Task CreateTransfer_ShouldMutateBalancesAtomically_AndPreserveNetAssetNeutrality()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        // Create Source Account
        var sourceRes = await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountRequest(
            Name: $"Primary Bank {Guid.NewGuid():N}",
            AccountType: "Bank",
            OpeningBalance: 100000m
        ));
        sourceRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var source = await sourceRes.Content.ReadFromJsonAsync<AccountDto>();

        // Create Destination Account
        var targetRes = await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountRequest(
            Name: $"Digital Wallet {Guid.NewGuid():N}",
            AccountType: "Wallet",
            OpeningBalance: 2000m
        ));
        targetRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var target = await targetRes.Content.ReadFromJsonAsync<AccountDto>();

        // Act: Execute Inter-Account Transfer of ₹15,000
        var transferRequest = new CreateTransactionRequest(
            AccountId: source!.Id,
            TargetAccountId: target!.Id,
            Amount: 15000m,
            EventType: "Transfer",
            TransactionDate: DateTime.UtcNow,
            Description: "Refill digital wallet for daily transit",
            Notes: "Instant UPI IMPS transfer"
        );

        var txResponse = await client.PostAsJsonAsync("/api/v1/transactions", transferRequest);

        // Assert: 201 Created
        txResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdTx = await txResponse.Content.ReadFromJsonAsync<TransactionDto>();
        createdTx.Should().NotBeNull();
        createdTx!.Amount.Should().Be(15000m);
        createdTx.EventType.Should().Be("Transfer");
        createdTx.TargetAccountId.Should().Be(target.Id);

        // Assert: Source Account balance is debited by 15,000 => 85,000
        var sourceCheck = await client.GetAsync($"/api/v1/accounts/{source.Id}");
        var updatedSource = await sourceCheck.Content.ReadFromJsonAsync<AccountDto>();
        updatedSource!.CurrentBalance.Should().Be(85000m);

        // Assert: Destination Account balance is credited by 15,000 => 17,000
        var targetCheck = await client.GetAsync($"/api/v1/accounts/{target.Id}");
        var updatedTarget = await targetCheck.Content.ReadFromJsonAsync<AccountDto>();
        updatedTarget!.CurrentBalance.Should().Be(17000m);

        // Assert: Summary metrics must preserve transfer neutrality (Transfer is NOT an expense/income)
        var summaryRes = await client.GetAsync("/api/v1/transactions/summary");
        summaryRes.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CreateExpenseAndIncome_ShouldMutateBalancesAtomically()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        var accountRes = await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountRequest(
            Name: $"Mutation Test Bank {Guid.NewGuid():N}",
            AccountType: "Bank",
            OpeningBalance: 50000m
        ));
        var account = await accountRes.Content.ReadFromJsonAsync<AccountDto>();

        // Act 1: Record Income (+20,000)
        var incomeRes = await client.PostAsJsonAsync("/api/v1/transactions", new CreateTransactionRequest(
            AccountId: account!.Id,
            Amount: 20000m,
            EventType: "Income",
            TransactionDate: DateTime.UtcNow,
            Description: "Freelance consulting payment"
        ));
        incomeRes.StatusCode.Should().Be(HttpStatusCode.Created);

        var accAfterIncome = await (await client.GetAsync($"/api/v1/accounts/{account.Id}")).Content.ReadFromJsonAsync<AccountDto>();
        accAfterIncome!.CurrentBalance.Should().Be(70000m);

        // Act 2: Record Expense (-6,500)
        var expenseRes = await client.PostAsJsonAsync("/api/v1/transactions", new CreateTransactionRequest(
            AccountId: account.Id,
            Amount: 6500m,
            EventType: "Expense",
            TransactionDate: DateTime.UtcNow,
            Description: "Grocery provisions"
        ));
        expenseRes.StatusCode.Should().Be(HttpStatusCode.Created);

        var accAfterExpense = await (await client.GetAsync($"/api/v1/accounts/{account.Id}")).Content.ReadFromJsonAsync<AccountDto>();
        accAfterExpense!.CurrentBalance.Should().Be(63500m);
    }

    [Fact]
    public async Task GetTransactions_PaginationAndFiltering_ShouldReturnCorrectItems()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        var accountRes = await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountRequest(
            Name: $"Pagination Account {Guid.NewGuid():N}",
            AccountType: "Bank",
            OpeningBalance: 10000m
        ));
        var account = await accountRes.Content.ReadFromJsonAsync<AccountDto>();

        // Insert 3 transactions
        for (int i = 1; i <= 3; i++)
        {
            await client.PostAsJsonAsync("/api/v1/transactions", new CreateTransactionRequest(
                AccountId: account!.Id,
                Amount: i * 500m,
                EventType: "Expense",
                TransactionDate: DateTime.UtcNow.AddMinutes(-i),
                Description: $"Pagination Item #{i}"
            ));
        }

        // Act: Request page 1 with pageSize 2
        var pagedRes = await client.GetAsync($"/api/v1/transactions?accountId={account!.Id}&page=1&pageSize=2");

        // Assert
        pagedRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var pagedData = await pagedRes.Content.ReadFromJsonAsync<PagedResult<TransactionDto>>();
        pagedData.Should().NotBeNull();
        pagedData!.Items.Count.Should().Be(2);
        pagedData.TotalCount.Should().Be(3);
        pagedData.TotalPages.Should().Be(2);
    }

    [Fact]
    public async Task Budgets_RealtimeEvaluation_ShouldDetectThresholdsAndOverage()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        // 1. Get Categories to obtain category ID
        var catRes = await client.GetAsync("/api/v1/categories");
        var categories = await catRes.Content.ReadFromJsonAsync<List<CategoryDto>>();
        var targetCategory = categories!.First(c => c.Name == "Food & Dining");

        // 2. Create Budget of ₹10,000 for target category
        var createBudgetRes = await client.PostAsJsonAsync("/api/v1/budgets", new CreateBudgetRequest(
            CategoryId: targetCategory.Id,
            MonthlyLimit: 10000m
        ));
        createBudgetRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 3. Create Account
        var accRes = await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountRequest(
            Name: $"Budget Account {Guid.NewGuid():N}",
            AccountType: "Bank",
            OpeningBalance: 50000m
        ));
        var account = await accRes.Content.ReadFromJsonAsync<AccountDto>();

        // 4. Record Expense of ₹8,500 (85% => Warning / Amber)
        await client.PostAsJsonAsync("/api/v1/transactions", new CreateTransactionRequest(
            AccountId: account!.Id,
            CategoryId: targetCategory.Id,
            Amount: 8500m,
            EventType: "Expense",
            TransactionDate: DateTime.UtcNow,
            Description: "Mid-month bulk grocery order"
        ));

        // Act 1: Check Budget Summary
        var summaryRes1 = await client.GetAsync("/api/v1/budgets/summary");
        summaryRes1.StatusCode.Should().Be(HttpStatusCode.OK);
        var summary1 = await summaryRes1.Content.ReadFromJsonAsync<BudgetSummaryDto>();
        summary1.Should().NotBeNull();
        var catStatus1 = summary1!.Categories.FirstOrDefault(c => c.CategoryId == targetCategory.Id);
        catStatus1.Should().NotBeNull();
        catStatus1!.Status.Should().Be("Warning");
        catStatus1.HexColor.Should().Be("#F59E0B");
        catStatus1.SpentAmount.Should().Be(8500m);
        catStatus1.UtilizationPercentage.Should().Be(85m);
        catStatus1.IsExceeded.Should().BeFalse();

        // 5. Record additional Expense of ₹2,500 (Total spent = 11,000 => 110% => Exceeded / Rose)
        await client.PostAsJsonAsync("/api/v1/transactions", new CreateTransactionRequest(
            AccountId: account.Id,
            CategoryId: targetCategory.Id,
            Amount: 2500m,
            EventType: "Expense",
            TransactionDate: DateTime.UtcNow,
            Description: "Weekend dinner outing"
        ));

        // Act 2: Check Budget Summary again
        var summaryRes2 = await client.GetAsync("/api/v1/budgets/summary");
        summaryRes2.StatusCode.Should().Be(HttpStatusCode.OK);
        var summary2 = await summaryRes2.Content.ReadFromJsonAsync<BudgetSummaryDto>();
        var catStatus2 = summary2!.Categories.FirstOrDefault(c => c.CategoryId == targetCategory.Id);
        catStatus2.Should().NotBeNull();
        catStatus2!.Status.Should().Be("Exceeded");
        catStatus2.HexColor.Should().Be("#EF4444");
        catStatus2.SpentAmount.Should().Be(11000m);
        catStatus2.OverageAmount.Should().Be(1000m);
        catStatus2.UtilizationPercentage.Should().Be(110m);
        catStatus2.IsExceeded.Should().BeTrue();
    }
}
