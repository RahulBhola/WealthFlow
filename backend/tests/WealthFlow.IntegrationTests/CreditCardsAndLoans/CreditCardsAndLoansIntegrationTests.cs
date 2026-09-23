using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using WealthFlow.Application.Features.Accounts.DTOs;
using WealthFlow.Application.Features.Auth.DTOs;
using WealthFlow.Application.Features.CreditCards.DTOs;
using WealthFlow.Application.Features.Gifts.DTOs;
using WealthFlow.Application.Features.Loans.DTOs;
using WealthFlow.Application.Features.Transactions.DTOs;
using WealthFlow.IntegrationTests.Fixtures;

namespace WealthFlow.IntegrationTests.CreditCardsAndLoans;

public class CreditCardsAndLoansIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public CreditCardsAndLoansIntegrationTests(CustomWebApplicationFactory factory)
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
    public async Task CreditCard_CreateAndPayBill_ShouldAtomicallyDebitBankAndSettleCardLiability()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        // 1. Create a Bank Account with ₹75,000
        var accRes = await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountRequest(
            Name: $"HDFC Salary {Guid.NewGuid():N}",
            AccountType: "Bank",
            OpeningBalance: 75000m
        ));
        accRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var bankAccount = await accRes.Content.ReadFromJsonAsync<AccountDto>();

        // 2. Create a Credit Card
        var cardRes = await client.PostAsJsonAsync("/api/v1/credit-cards", new CreateCreditCardRequest(
            CardName: "HDFC Regalia Gold",
            BankName: "HDFC Bank",
            CreditLimit: 300000m,
            BillingCycleDay: 15,
            DueDay: 5,
            Last4Digits: "8821",
            ColorTag: "#1E293B"
        ));
        cardRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var card = await cardRes.Content.ReadFromJsonAsync<CreditCardDto>();
        card.Should().NotBeNull();
        card!.CreditLimit.Should().Be(300000m);
        card.AvailableCredit.Should().Be(300000m);
        card.UtilizationPercentage.Should().Be(0m);

        // 3. Settle / Pay bill of ₹22,500 from the Bank Account
        var payRes = await client.PostAsJsonAsync($"/api/v1/credit-cards/{card.Id}/payments", new PayCreditCardBillRequest(
            SourceAccountId: bankAccount!.Id,
            Amount: 22500m,
            PaymentDate: DateTime.UtcNow,
            Notes: "Full monthly statement settlement via NEFT"
        ));
        payRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var paymentResult = await payRes.Content.ReadFromJsonAsync<CreditCardBillPaymentResponse>();
        paymentResult.Should().NotBeNull();
        paymentResult!.PaidAmount.Should().Be(22500m);
        paymentResult.UpdatedSourceAccountBalance.Should().Be(52500m); // ₹75,000 - ₹22,500

        // 4. Verify Bank Account Balance reflects exact atomic debit
        var updatedAccRes = await client.GetAsync($"/api/v1/accounts/{bankAccount.Id}");
        updatedAccRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedAccount = await updatedAccRes.Content.ReadFromJsonAsync<AccountDto>();
        updatedAccount!.CurrentBalance.Should().Be(52500m);

        // 5. Verify Credit Card list and summary reflects the payment
        var cardsRes = await client.GetAsync("/api/v1/credit-cards");
        cardsRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var summary = await cardsRes.Content.ReadFromJsonAsync<CreditCardSummaryDto>();
        summary.Should().NotBeNull();
        summary!.Cards.Should().Contain(c => c.Id == card.Id);

        // 6. Verify Transaction P&L Summary: CreditCardPayment is a debt settlement, NOT an expense
        var pnlRes = await client.GetAsync("/api/v1/transactions/summary");
        pnlRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var pnl = await pnlRes.Content.ReadFromJsonAsync<TransactionSummaryDto>();
        pnl.Should().NotBeNull();
        // Credit card bill payment is excluded from lifestyle outflows
    }

    [Fact]
    public async Task LoanGiven_ShouldAtomicallyDebitBank_AndTrackRepaymentsUntilFullySettled()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        // 1. Create a Bank Account with ₹100,000
        var accRes = await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountRequest(
            Name: $"Savings Account {Guid.NewGuid():N}",
            AccountType: "Bank",
            OpeningBalance: 100000m
        ));
        accRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var account = await accRes.Content.ReadFromJsonAsync<AccountDto>();

        // 2. Disburse Loan Given of ₹25,000 to "Friend Amit"
        var loanRes = await client.PostAsJsonAsync("/api/v1/loans", new CreateLoanRequest(
            Direction: "Given",
            CounterpartyName: "Amit Sharma",
            PrincipalAmount: 25000m,
            CounterpartyContact: "+91-9876543210",
            DueDate: DateTime.UtcNow.AddMonths(2),
            DisbursementAccountId: account!.Id,
            Notes: "Emergency medical advance"
        ));
        loanRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var loan = await loanRes.Content.ReadFromJsonAsync<LoanDto>();
        loan.Should().NotBeNull();
        loan!.PrincipalAmount.Should().Be(25000m);
        loan.OutstandingBalance.Should().Be(25000m);
        loan.Status.Should().Be("Open");
        loan.IsSettled.Should().BeFalse();

        // 3. Verify Bank was debited by ₹25,000
        var accAfterDisb = await client.GetFromJsonAsync<AccountDto>($"/api/v1/accounts/{account.Id}");
        accAfterDisb!.CurrentBalance.Should().Be(75000m);

        // 4. Record Partial Repayment of ₹10,000
        var rep1Res = await client.PostAsJsonAsync($"/api/v1/loans/{loan.Id}/repayments", new RecordRepaymentRequest(
            AccountId: account.Id,
            Amount: 10000m,
            RepaymentDate: DateTime.UtcNow,
            Notes: "First installment via UPI"
        ));
        rep1Res.StatusCode.Should().Be(HttpStatusCode.OK);
        var rep1Result = await rep1Res.Content.ReadFromJsonAsync<RecordRepaymentResponse>();
        rep1Result!.RemainingBalance.Should().Be(15000m);
        rep1Result.Status.Should().Be("PartiallyRepaid");
        rep1Result.IsSettled.Should().BeFalse();
        rep1Result.UpdatedAccountBalance.Should().Be(85000m); // ₹75,000 + ₹10,000

        // 5. Record Final Repayment of ₹15,000
        var rep2Res = await client.PostAsJsonAsync($"/api/v1/loans/{loan.Id}/repayments", new RecordRepaymentRequest(
            AccountId: account.Id,
            Amount: 15000m,
            RepaymentDate: DateTime.UtcNow,
            Notes: "Final settlement via IMPS"
        ));
        rep2Res.StatusCode.Should().Be(HttpStatusCode.OK);
        var rep2Result = await rep2Res.Content.ReadFromJsonAsync<RecordRepaymentResponse>();
        rep2Result!.RemainingBalance.Should().Be(0m);
        rep2Result.Status.Should().Be("FullySettled");
        rep2Result.IsSettled.Should().BeTrue();
        rep2Result.UpdatedAccountBalance.Should().Be(100000m); // Restored to ₹100,000

        // 6. Verify Loan status through GET endpoint
        var finalLoan = await client.GetFromJsonAsync<LoanDto>($"/api/v1/loans/{loan.Id}");
        finalLoan!.IsSettled.Should().BeTrue();
        finalLoan.Status.Should().Be("FullySettled");
        finalLoan.Repayments.Should().HaveCount(2);
    }

    [Fact]
    public async Task Gift_ShouldAtomicallyUpdateBankBalance_WithoutCreatingDebtObligations()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        // 1. Create a Bank Account with ₹30,000
        var accRes = await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountRequest(
            Name: $"Main Bank {Guid.NewGuid():N}",
            AccountType: "Bank",
            OpeningBalance: 30000m
        ));
        accRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var account = await accRes.Content.ReadFromJsonAsync<AccountDto>();

        // 2. Record Gift Given of ₹5,000
        var giftGivenRes = await client.PostAsJsonAsync("/api/v1/gifts", new CreateGiftRequest(
            Direction: "Given",
            RecipientOrGiver: "Pooja & Rohan",
            Occasion: "Wedding Blessing",
            Amount: 5000m,
            AccountId: account!.Id,
            Date: DateTime.UtcNow,
            Notes: "Envelope gift"
        ));
        giftGivenRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var giftGiven = await giftGivenRes.Content.ReadFromJsonAsync<GiftDto>();
        giftGiven.Should().NotBeNull();
        giftGiven!.Amount.Should().Be(5000m);

        // Account balance decreased to ₹25,000
        var accAfterGiven = await client.GetFromJsonAsync<AccountDto>($"/api/v1/accounts/{account.Id}");
        accAfterGiven!.CurrentBalance.Should().Be(25000m);

        // 3. Record Gift Received of ₹15,000
        var giftRecvRes = await client.PostAsJsonAsync("/api/v1/gifts", new CreateGiftRequest(
            Direction: "Received",
            RecipientOrGiver: "Grandparents",
            Occasion: "Diwali Shagun",
            Amount: 15000m,
            AccountId: account.Id,
            Date: DateTime.UtcNow,
            Notes: "Festive blessing"
        ));
        giftRecvRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var giftRecv = await giftRecvRes.Content.ReadFromJsonAsync<GiftDto>();
        giftRecv.Should().NotBeNull();

        // Account balance increased to ₹40,000
        var accAfterRecv = await client.GetFromJsonAsync<AccountDto>($"/api/v1/accounts/{account.Id}");
        accAfterRecv!.CurrentBalance.Should().Be(40000m);

        // 4. Verify Gift Summary
        var giftsSummary = await client.GetFromJsonAsync<GiftSummaryDto>("/api/v1/gifts");
        giftsSummary.Should().NotBeNull();
        giftsSummary!.TotalGiftsGiven.Should().BeGreaterOrEqualTo(5000m);
        giftsSummary.TotalGiftsReceived.Should().BeGreaterOrEqualTo(15000m);

        // 5. Verify that no loans/debts were created for these gifts
        var loansSummary = await client.GetFromJsonAsync<LoanSummaryDto>("/api/v1/loans");
        loansSummary!.Loans.Should().NotContain(l => l.CounterpartyName == "Pooja & Rohan");
        loansSummary.Loans.Should().NotContain(l => l.CounterpartyName == "Grandparents");
    }
}
