using FluentAssertions;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;
using WealthFlow.Domain.Services;

namespace WealthFlow.UnitTests.Domain;

public class BalanceCalculationServiceTests
{
    private readonly BalanceCalculationService _service = new();
    private readonly Guid _userId = Guid.NewGuid();

    [Fact]
    public void ReconcileAccount_WithNoTransactions_ShouldPreserveOpeningBalance()
    {
        // Arrange
        var account = new Account(
            userId: _userId,
            name: "HDFC Salary",
            accountType: AccountType.Bank,
            openingBalance: 50000.00m,
            accountNumberMask: "•••• 4821"
        );

        // Act
        var result = _service.ReconcileAccount(account, Enumerable.Empty<Transaction>());

        // Assert
        result.ReconciledBalance.Should().Be(50000.00m);
        result.HasDiscrepancy.Should().BeFalse();
        result.Discrepancy.Should().Be(0.00m);
        account.CurrentBalance.Should().Be(50000.00m);
    }

    [Fact]
    public void ReconcileAccount_WithInflowsAndOutflows_ShouldCalculateCorrectReconciledBalance()
    {
        // Arrange
        var account = new Account(
            userId: _userId,
            name: "ICICI Savings",
            accountType: AccountType.Savings,
            openingBalance: 10000.00m
        );

        var transactions = new List<Transaction>
        {
            // Income: +15,000
            new(_userId, account.Id, 15000.00m, DateTime.UtcNow, TransactionEventType.Income, "Salary credit"),
            // Expense: -4,500
            new(_userId, account.Id, 4500.00m, DateTime.UtcNow, TransactionEventType.Expense, "Groceries Blinkit"),
            // Investment: -5,000
            new(_userId, account.Id, 5000.00m, DateTime.UtcNow, TransactionEventType.Investment, "SIP Mutual Fund"),
            // Refund: +500
            new(_userId, account.Id, 500.00m, DateTime.UtcNow, TransactionEventType.Refund, "Amazon item return")
        };

        // Expected: 10000 + 15000 - 4500 - 5000 + 500 = 16000.00m

        // Act
        var result = _service.ReconcileAccount(account, transactions);

        // Assert
        result.ReconciledBalance.Should().Be(16000.00m);
        result.HasDiscrepancy.Should().BeTrue("Account CurrentBalance was initially 10000 but should be 16000");
        account.CurrentBalance.Should().Be(16000.00m);
    }

    [Fact]
    public void ReconcileAccount_WithIncomingTransfer_ShouldCreditDestinationAccount()
    {
        // Arrange
        var sourceAccountId = Guid.NewGuid();
        var destinationAccount = new Account(
            userId: _userId,
            name: "Physical Cash",
            accountType: AccountType.Cash,
            openingBalance: 2000.00m
        );

        var transferTx = new Transaction(
            userId: _userId,
            accountId: sourceAccountId,
            amount: 3000.00m,
            transactionDate: DateTime.UtcNow,
            eventType: TransactionEventType.Transfer,
            description: "ATM Cash Withdrawal",
            linkedEntityId: destinationAccount.Id // Linked as destination account
        );

        // Act
        var result = _service.ReconcileAccount(destinationAccount, new[] { transferTx });

        // Assert
        // Expected: 2000 (opening) + 3000 (inflow via transfer) = 5000
        result.ReconciledBalance.Should().Be(5000.00m);
        destinationAccount.CurrentBalance.Should().Be(5000.00m);
    }

    [Fact]
    public void ReconcileAccount_WithPendingIpoApplication_ShouldKeepCurrentBalanceAndSetBlockedBalance()
    {
        // Arrange: Bank account with ₹1,00,000 opening balance
        var account = new Account(
            userId: _userId,
            name: "HDFC Bank",
            accountType: AccountType.Bank,
            openingBalance: 100000.00m
        );

        var ipoTx = new Transaction(
            userId: _userId,
            accountId: account.Id,
            amount: 15000.00m,
            transactionDate: DateTime.UtcNow,
            eventType: TransactionEventType.IpoApplication,
            description: "Swiggy IPO Application",
            status: TransactionStatus.Blocked
        );

        // Act
        var result = _service.ReconcileAccount(account, new[] { ipoTx });

        // Assert: Funds are on hold under ASBA lien, CurrentBalance remains ₹1,00,000, BlockedBalance = ₹15,000, AvailableBalance = ₹85,000
        result.ReconciledBalance.Should().Be(100000.00m);
        account.CurrentBalance.Should().Be(100000.00m);
        account.BlockedBalance.Should().Be(15000.00m);
        account.AvailableBalance.Should().Be(85000.00m);
    }

    [Fact]
    public void ReconcileAccount_WithAllottedIpo_ShouldDebitCurrentBalanceAndClearBlockedBalance()
    {
        // Arrange
        var account = new Account(
            userId: _userId,
            name: "HDFC Bank",
            accountType: AccountType.Bank,
            openingBalance: 100000.00m
        );

        var ipoTx = new Transaction(
            userId: _userId,
            accountId: account.Id,
            amount: 15000.00m,
            transactionDate: DateTime.UtcNow,
            eventType: TransactionEventType.IpoApplication,
            description: "Tata Technologies IPO",
            status: TransactionStatus.Allotted,
            allottedUnits: 30m
        );

        // Act
        var result = _service.ReconcileAccount(account, new[] { ipoTx });

        // Assert: Allotted IPO debits ₹15,000 from CurrentBalance, BlockedBalance is 0, AvailableBalance = ₹85,000
        result.ReconciledBalance.Should().Be(85000.00m);
        account.CurrentBalance.Should().Be(85000.00m);
        account.BlockedBalance.Should().Be(0.00m);
        account.AvailableBalance.Should().Be(85000.00m);
    }

    [Fact]
    public void ReconcileAccount_WithReleasedIpo_ShouldKeepCurrentBalanceAndClearBlockedBalance()
    {
        // Arrange
        var account = new Account(
            userId: _userId,
            name: "HDFC Bank",
            accountType: AccountType.Bank,
            openingBalance: 100000.00m
        );

        var ipoTx = new Transaction(
            userId: _userId,
            accountId: account.Id,
            amount: 15000.00m,
            transactionDate: DateTime.UtcNow,
            eventType: TransactionEventType.IpoApplication,
            description: "Hyundai IPO Application",
            status: TransactionStatus.Released
        );

        // Act
        var result = _service.ReconcileAccount(account, new[] { ipoTx });

        // Assert: Released/unallotted IPO preserves original balance ₹1,00,000, BlockedBalance = 0
        result.ReconciledBalance.Should().Be(100000.00m);
        account.CurrentBalance.Should().Be(100000.00m);
        account.BlockedBalance.Should().Be(0.00m);
        account.AvailableBalance.Should().Be(100000.00m);
    }
}
