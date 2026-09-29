using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Domain.Services;

/// <summary>
/// Domain service implementing the Materialized Balance Invariant:
/// CurrentBalance == OpeningBalance + Sum(Inflows) - Sum(Outflows).
/// Pure domain logic with zero external dependencies.
/// </summary>
public class BalanceCalculationService
{
    /// <summary>
    /// Computes the net balance sheet impact of a ledger transaction on a specific account.
    /// </summary>
    public static decimal CalculateNetTransactionImpact(Transaction transaction, Guid accountId)
    {
        // Outgoing or direct transaction on this account
        if (transaction.AccountId == accountId)
        {
            // If the transaction is an IPO Application:
            // - Blocked (Funds on hold): Net impact on CurrentBalance is 0.
            // - Released (Lien unblocked/not allotted): Net impact on CurrentBalance is 0.
            // - Allotted (Approved/shares credited): Net impact is -Amount (debited from bank).
            if (transaction.EventType == TransactionEventType.IpoApplication)
            {
                return transaction.Status == TransactionStatus.Allotted ? -transaction.Amount : 0m;
            }

            return transaction.EventType switch
            {
                TransactionEventType.Income => transaction.Amount,
                TransactionEventType.Refund => transaction.Amount,
                TransactionEventType.LoanReceived => transaction.Amount,
                TransactionEventType.Gift => transaction.Amount, // Inflow gift
                TransactionEventType.Expense => -transaction.Amount,
                TransactionEventType.Investment => -transaction.Amount,
                TransactionEventType.LoanGiven => -transaction.Amount,
                TransactionEventType.CreditCardPayment => -transaction.Amount,
                TransactionEventType.TripSettlement => -transaction.Amount,
                TransactionEventType.Transfer => -transaction.Amount, // Source account deduction
                _ => -transaction.Amount
            };
        }

        // Incoming transfer leg where this account is the destination
        if (transaction.LinkedEntityId == accountId && transaction.EventType == TransactionEventType.Transfer)
        {
            return transaction.Amount;
        }

        return 0m;
    }

    /// <summary>
    /// Computes the sum of all actively blocked / on-hold funds (e.g. pending IPO ASBA applications) for an account.
    /// </summary>
    public static decimal CalculateBlockedBalance(IEnumerable<Transaction> transactions, Guid accountId)
    {
        return transactions
            .Where(t => t.AccountId == accountId && t.EventType == TransactionEventType.IpoApplication && t.Status == TransactionStatus.Blocked)
            .Sum(t => t.Amount);
    }

    /// <summary>
    /// Reconciles an account's materialized CurrentBalance and BlockedBalance against its complete transaction audit trail.
    /// Updates the account's CurrentBalance and BlockedBalance if a discrepancy is detected.
    /// </summary>
    public ReconciliationResult ReconcileAccount(Account account, IEnumerable<Transaction> transactions)
    {
        var txList = transactions.ToList();
        var netDelta = txList.Sum(t => CalculateNetTransactionImpact(t, account.Id));
        var expectedBalance = account.OpeningBalance + netDelta;
        var previousBalance = account.CurrentBalance;
        var discrepancy = previousBalance - expectedBalance;
        var hasDiscrepancy = Math.Abs(discrepancy) > 0.0001m;

        if (hasDiscrepancy)
        {
            account.Reconcile(expectedBalance);
        }

        var expectedBlockedBalance = CalculateBlockedBalance(txList, account.Id);
        account.SetBlockedBalance(expectedBlockedBalance);

        return new ReconciliationResult(
            AccountId: account.Id,
            OpeningBalance: account.OpeningBalance,
            PreviousBalance: previousBalance,
            ReconciledBalance: expectedBalance,
            Discrepancy: discrepancy,
            HasDiscrepancy: hasDiscrepancy,
            TransactionCount: txList.Count,
            ReconciledAtUtc: DateTime.UtcNow
        );
    }
}

public record ReconciliationResult(
    Guid AccountId,
    decimal OpeningBalance,
    decimal PreviousBalance,
    decimal ReconciledBalance,
    decimal Discrepancy,
    bool HasDiscrepancy,
    int TransactionCount,
    DateTime ReconciledAtUtc);
