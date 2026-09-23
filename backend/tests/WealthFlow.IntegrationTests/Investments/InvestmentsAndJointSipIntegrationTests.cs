using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using WealthFlow.Application.Features.Accounts.DTOs;
using WealthFlow.Application.Features.Auth.DTOs;
using WealthFlow.Application.Features.Investments.DTOs;
using WealthFlow.Application.Features.Loans.DTOs;
using WealthFlow.IntegrationTests.Fixtures;

namespace WealthFlow.IntegrationTests.Investments;

public class InvestmentsAndJointSipIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public InvestmentsAndJointSipIntegrationTests(CustomWebApplicationFactory factory)
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
    public async Task Investment_CreateAndUpdateValuation_ShouldReflectAccuratePnLAndAllocation()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        // 1. Create a Mutual Fund investment
        var createFundRes = await client.PostAsJsonAsync("/api/v1/investments", new CreateInvestmentRequest(
            Name: $"Nifty 50 Index Fund {Guid.NewGuid():N}",
            AssetClass: "MutualFund",
            InvestedAmount: 50000m,
            CurrentValuation: 50000m,
            Units: 250.5m
        ));
        createFundRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var fund = await createFundRes.Content.ReadFromJsonAsync<InvestmentDto>();
        fund.Should().NotBeNull();
        fund!.InvestedAmount.Should().Be(50000m);
        fund.AbsoluteGainLoss.Should().Be(0m);
        fund.ReturnPercentage.Should().Be(0m);

        // 2. Update valuation: Market value rises to ₹58,000 (+16%)
        var updateRes = await client.PutAsJsonAsync($"/api/v1/investments/{fund.Id}/valuation", new UpdateValuationRequest(
            CurrentValuation: 58000m,
            Units: 250.5m,
            ValuationDate: DateTime.UtcNow
        ));
        updateRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateRes.Content.ReadFromJsonAsync<InvestmentDto>();
        updated!.CurrentValuation.Should().Be(58000m);
        updated.AbsoluteGainLoss.Should().Be(8000m); // ₹58,000 - ₹50,000
        updated.ReturnPercentage.Should().Be(16.0m);

        // 3. Verify Investment Summary
        var summaryRes = await client.GetAsync("/api/v1/investments");
        summaryRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var summary = await summaryRes.Content.ReadFromJsonAsync<InvestmentSummaryDto>();
        summary.Should().NotBeNull();
        summary!.TotalInvestedAmount.Should().BeGreaterOrEqualTo(50000m);
        summary.TotalCurrentValuation.Should().BeGreaterOrEqualTo(58000m);
        summary.AssetAllocation.Should().Contain(a => a.AssetClass == "MutualFund");
    }

    [Fact]
    public async Task JointSip_Execution_ShouldPreserveNetWorth_AndDebitBank_CreditEquity_AndCreatePartnerReceivable()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        // 1. Create a Bank Account with ₹60,000
        var accRes = await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountRequest(
            Name: $"HDFC Primary {Guid.NewGuid():N}",
            AccountType: "Bank",
            OpeningBalance: 60000m
        ));
        accRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var bankAccount = await accRes.Content.ReadFromJsonAsync<AccountDto>();

        // 2. Create target Investment
        var invRes = await client.PostAsJsonAsync("/api/v1/investments", new CreateInvestmentRequest(
            Name: "Parag Parikh Flexi Cap Fund",
            AssetClass: "MutualFund",
            InvestedAmount: 0m,
            CurrentValuation: 0m,
            Units: 0m
        ));
        invRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var investment = await invRes.Content.ReadFromJsonAsync<InvestmentDto>();

        // 3. Create a Joint 50/50 SIP for ₹15,000 with "Brother"
        var sipRes = await client.PostAsJsonAsync("/api/v1/investments/sips", new CreateSipRequest(
            InvestmentId: investment!.Id,
            SourceAccountId: bankAccount!.Id,
            Name: "Co-Funded FlexiCap SIP",
            Amount: 15000m,
            ExecutionDay: 5,
            StartDate: DateTime.UtcNow,
            IsJoint: true,
            UserShare: 7500m,
            CoInvestorShare: 7500m,
            CoInvestorName: "Brother"
        ));
        sipRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var sip = await sipRes.Content.ReadFromJsonAsync<SipDto>();
        sip.Should().NotBeNull();
        sip!.IsJoint.Should().BeTrue();
        sip.UserShare.Should().Be(7500m);
        sip.CoInvestorShare.Should().Be(7500m);

        // 4. Execute the Joint SIP
        var execRes = await client.PostAsync($"/api/v1/investments/sips/{sip.Id}/execute", null);
        execRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var execResult = await execRes.Content.ReadFromJsonAsync<ExecuteSipResponse>();
        execResult.Should().NotBeNull();
        execResult!.TotalDebited.Should().Be(15000m);
        execResult.UserEquityShare.Should().Be(7500m);
        execResult.CoInvestorReceivableShare.Should().Be(7500m);
        execResult.ReconciliationId.Should().NotBeNull();

        // 5. CRITICAL INVARIANT ASSERTIONS:
        // A. Bank Balance must decrease by the full ₹15,000 (from ₹60,000 to ₹45,000)
        var updatedBankRes = await client.GetAsync($"/api/v1/accounts/{bankAccount.Id}");
        var updatedBank = await updatedBankRes.Content.ReadFromJsonAsync<AccountDto>();
        updatedBank!.CurrentBalance.Should().Be(45000m);

        // B. User Investment Equity must increase strictly by user's personal share of ₹7,500 (NOT ₹15,000)
        var updatedInvRes = await client.GetAsync($"/api/v1/investments/{investment.Id}");
        var updatedInv = await updatedInvRes.Content.ReadFromJsonAsync<InvestmentDto>();
        updatedInv!.InvestedAmount.Should().Be(7500m);

        // C. Partner's share of ₹7,500 must be booked as a Loan Receivable Asset
        var loansRes = await client.GetAsync("/api/v1/loans");
        var loansSummary = await loansRes.Content.ReadFromJsonAsync<LoanSummaryDto>();
        loansSummary!.Loans.Should().Contain(l =>
            l.CounterpartyName == "Brother" &&
            l.Direction == "Given" &&
            l.OutstandingBalance >= 7500m);

        // D. Monthly Joint SIP Reconciliation Cycle created with status "Pending"
        var jointSummaryRes = await client.GetAsync("/api/v1/investments/joint-sips");
        var jointSummary = await jointSummaryRes.Content.ReadFromJsonAsync<JointSipSummaryDto>();
        jointSummary.Should().NotBeNull();
        jointSummary!.TotalPartnerReceivableDue.Should().BeGreaterOrEqualTo(7500m);
        var jointDetail = jointSummary.JointSips.FirstOrDefault(j => j.Sip.Id == sip.Id);
        jointDetail.Should().NotBeNull();
        jointDetail!.Reconciliations.Should().Contain(r =>
            r.TotalAmount == 15000m &&
            r.UserShare == 7500m &&
            r.CoInvestorShare == 7500m &&
            r.SettlementStatus == "Pending" &&
            r.RemainingDue == 7500m);
    }

    [Fact]
    public async Task JointSip_BilateralRepayment_ShouldUpdateReconciliationStatus_AndCreditBankAccount()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        // 1. Create Bank Account
        var accRes = await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountRequest(
            Name: $"Repayment Bank {Guid.NewGuid():N}",
            AccountType: "Bank",
            OpeningBalance: 20000m
        ));
        accRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var bankAccount = await accRes.Content.ReadFromJsonAsync<AccountDto>();

        // 2. Create target Investment
        var invRes = await client.PostAsJsonAsync("/api/v1/investments", new CreateInvestmentRequest(
            Name: $"Index SIP Fund {Guid.NewGuid():N}",
            AssetClass: "MutualFund",
            InvestedAmount: 0m,
            CurrentValuation: 0m
        ));
        var investment = await invRes.Content.ReadFromJsonAsync<InvestmentDto>();

        // 3. Create Joint SIP & Execute
        var sipRes = await client.PostAsJsonAsync("/api/v1/investments/sips", new CreateSipRequest(
            InvestmentId: investment!.Id,
            SourceAccountId: bankAccount!.Id,
            Name: "Joint Index SIP",
            Amount: 10000m,
            ExecutionDay: 10,
            StartDate: DateTime.UtcNow,
            IsJoint: true,
            UserShare: 5000m,
            CoInvestorShare: 5000m,
            CoInvestorName: "Cousin Vikas"
        ));
        var sip = await sipRes.Content.ReadFromJsonAsync<SipDto>();

        var execRes = await client.PostAsync($"/api/v1/investments/sips/{sip!.Id}/execute", null);
        var execResult = await execRes.Content.ReadFromJsonAsync<ExecuteSipResponse>();
        var reconId = execResult!.ReconciliationId!.Value;

        // Bank balance reduced: ₹20,000 - ₹10,000 = ₹10,000
        var accAfterExec = await client.GetFromJsonAsync<AccountDto>($"/api/v1/accounts/{bankAccount.Id}");
        accAfterExec!.CurrentBalance.Should().Be(10000m);

        // 4. Partner makes partial repayment of ₹2,000 via UPI
        var partialPayRes = await client.PostAsJsonAsync($"/api/v1/investments/joint-sips/reconciliations/{reconId}/settle", new SipRepaymentRequest(
            DestinationAccountId: bankAccount.Id,
            Amount: 2000m,
            PaymentDate: DateTime.UtcNow,
            PaymentMode: "UPI",
            Notes: "Partial payment for SIP"
        ));
        partialPayRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var partialResult = await partialPayRes.Content.ReadFromJsonAsync<SipRepaymentResponse>();
        partialResult!.Status.Should().Be("PartiallySettled");
        partialResult.RemainingDue.Should().Be(3000m); // ₹5,000 - ₹2,000
        partialResult.IsSettled.Should().BeFalse();
        partialResult.UpdatedAccountBalance.Should().Be(12000m); // ₹10,000 + ₹2,000

        // 5. Partner makes final repayment of remaining ₹3,000
        var finalPayRes = await client.PostAsJsonAsync($"/api/v1/investments/joint-sips/reconciliations/{reconId}/settle", new SipRepaymentRequest(
            DestinationAccountId: bankAccount.Id,
            Amount: 3000m,
            PaymentDate: DateTime.UtcNow,
            PaymentMode: "IMPS",
            Notes: "Final settlement"
        ));
        finalPayRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var finalResult = await finalPayRes.Content.ReadFromJsonAsync<SipRepaymentResponse>();
        finalResult!.Status.Should().Be("Settled");
        finalResult.RemainingDue.Should().Be(0m);
        finalResult.IsSettled.Should().BeTrue();
        finalResult.UpdatedAccountBalance.Should().Be(15000m); // ₹12,000 + ₹3,000
    }

    [Fact]
    public async Task JointSip_MutualDebtOffset_ShouldSettleCycleWithoutCashInflow()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        // 1. Create Bank Account
        var accRes = await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountRequest(
            Name: $"Offset Bank {Guid.NewGuid():N}",
            AccountType: "Bank",
            OpeningBalance: 50000m
        ));
        var bankAccount = await accRes.Content.ReadFromJsonAsync<AccountDto>();

        // 2. Create Investment & Joint SIP
        var invRes = await client.PostAsJsonAsync("/api/v1/investments", new CreateInvestmentRequest(
            Name: $"Offset Fund {Guid.NewGuid():N}",
            AssetClass: "Stock",
            InvestedAmount: 0m,
            CurrentValuation: 0m
        ));
        var investment = await invRes.Content.ReadFromJsonAsync<InvestmentDto>();

        var sipRes = await client.PostAsJsonAsync("/api/v1/investments/sips", new CreateSipRequest(
            InvestmentId: investment!.Id,
            SourceAccountId: bankAccount!.Id,
            Name: "Offset Shared SIP",
            Amount: 8000m,
            ExecutionDay: 15,
            StartDate: DateTime.UtcNow,
            IsJoint: true,
            UserShare: 4000m,
            CoInvestorShare: 4000m,
            CoInvestorName: "Roommate Rohan"
        ));
        var sip = await sipRes.Content.ReadFromJsonAsync<SipDto>();

        var execRes = await client.PostAsync($"/api/v1/investments/sips/{sip!.Id}/execute", null);
        var execResult = await execRes.Content.ReadFromJsonAsync<ExecuteSipResponse>();
        var reconId = execResult!.ReconciliationId!.Value;

        // Balance after SIP debit: ₹50,000 - ₹8,000 = ₹42,000
        var accAfterExec = await client.GetFromJsonAsync<AccountDto>($"/api/v1/accounts/{bankAccount.Id}");
        accAfterExec!.CurrentBalance.Should().Be(42000m);

        // 3. Settle entire ₹4,000 via Mutual Debt Offset (e.g. Rohan previously paid ₹4,000 for electricity bill)
        var offsetRes = await client.PostAsJsonAsync($"/api/v1/investments/joint-sips/reconciliations/{reconId}/settle", new SipRepaymentRequest(
            DestinationAccountId: null,
            Amount: 4000m,
            PaymentDate: DateTime.UtcNow,
            PaymentMode: "MutualOffset",
            IsMutualDebtOffset: true,
            OffsetNotes: "Offset against Rohan paying October Electricity Bill of ₹4,000"
        ));
        offsetRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var offsetResult = await offsetRes.Content.ReadFromJsonAsync<SipRepaymentResponse>();
        offsetResult!.Status.Should().Be("Settled");
        offsetResult.IsSettled.Should().BeTrue();
        offsetResult.RemainingDue.Should().Be(0m);

        // 4. Verify Bank Account was NOT inflated because it was an offset
        var finalBank = await client.GetFromJsonAsync<AccountDto>($"/api/v1/accounts/{bankAccount.Id}");
        finalBank!.CurrentBalance.Should().Be(42000m); // Strictly remained ₹42,000
    }
}
