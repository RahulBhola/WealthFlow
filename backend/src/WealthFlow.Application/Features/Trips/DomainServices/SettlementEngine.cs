using WealthFlow.Application.Features.Trips.DTOs;
using WealthFlow.Domain.Entities;

namespace WealthFlow.Application.Features.Trips.DomainServices;

/// <summary>
/// Domain engine calculating participant net balances and minimizing bilateral debts
/// using greedy debt simplification.
/// </summary>
public static class SettlementEngine
{
    public static TripSummaryDto CalculateTripSummary(
        Trip trip,
        IReadOnlyList<TripMember> members,
        IReadOnlyList<TripExpense> expenses,
        IReadOnlyList<TripExpenseSplit> splits,
        IReadOnlyList<TripAdvance> advances,
        IReadOnlyList<TripSettlement> settlements)
    {
        // 1. Total Trip Expenses (CRITICAL INVARIANT: Advances are strictly excluded)
        decimal totalGroupSpending = expenses.Sum(e => e.Amount);

        // 2. Compute Net Balance per Member
        var memberSummaries = new List<MemberSpendingSummaryDto>(members.Count);
        var memberLookup = members.ToDictionary(m => m.Id, m => m.GuestName);

        // Lookup dictionaries for O(1) aggregation
        var paidLookup = expenses.GroupBy(e => e.PayerMemberId)
                                 .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));
        var shareLookup = splits.GroupBy(s => s.MemberId)
                                .ToDictionary(g => g.Key, g => g.Sum(s => s.AllocatedAmount));
        var advGivenLookup = advances.GroupBy(a => a.GiverMemberId)
                                     .ToDictionary(g => g.Key, g => g.Sum(a => a.Amount));
        var advRecvLookup = advances.GroupBy(a => a.ReceiverMemberId)
                                    .ToDictionary(g => g.Key, g => g.Sum(a => a.Amount));
        var settPaidLookup = settlements.Where(s => s.IsConfirmed)
                                        .GroupBy(s => s.PayerMemberId)
                                        .ToDictionary(g => g.Key, g => g.Sum(s => s.Amount));
        var settRecvLookup = settlements.Where(s => s.IsConfirmed)
                                        .GroupBy(s => s.ReceiverMemberId)
                                        .ToDictionary(g => g.Key, g => g.Sum(s => s.Amount));

        foreach (var member in members)
        {
            decimal paid = paidLookup.GetValueOrDefault(member.Id, 0m);
            decimal share = shareLookup.GetValueOrDefault(member.Id, 0m);
            decimal advGiven = advGivenLookup.GetValueOrDefault(member.Id, 0m);
            decimal advRecv = advRecvLookup.GetValueOrDefault(member.Id, 0m);
            decimal settPaid = settPaidLookup.GetValueOrDefault(member.Id, 0m);
            decimal settRecv = settRecvLookup.GetValueOrDefault(member.Id, 0m);

            // Universal Net Balance Equation:
            // Net = (Paid - Share) + (AdvGiven - AdvRecv) + (SettlementsPaid - SettlementsReceived)
            // Net > 0: Creditor (owed money by group)
            // Net < 0: Debtor (owes money to group)
            decimal netBalance = (paid - share) + (advGiven - advRecv) + (settPaid - settRecv);
            bool isSettled = Math.Abs(netBalance) < 0.01m;

            memberSummaries.Add(new MemberSpendingSummaryDto(
                member.Id,
                member.GuestName,
                paid,
                share,
                advGiven,
                advRecv,
                settPaid,
                settRecv,
                netBalance,
                isSettled
            ));
        }

        // 3. Greedy Debt Simplification Algorithm
        var simplifiedRepayments = MinimizeDebts(memberSummaries);

        decimal? budgetUtil = (trip.Budget.HasValue && trip.Budget.Value > 0)
            ? Math.Round((totalGroupSpending / trip.Budget.Value) * 100m, 2)
            : null;

        return new TripSummaryDto(
            trip.Id,
            totalGroupSpending,
            trip.Budget,
            budgetUtil,
            memberSummaries,
            simplifiedRepayments
        );
    }

    /// <summary>
    /// Minimizes the total number of bilateral transactions required to settle all debts.
    /// Iteratively matches the largest debtor with the largest creditor.
    /// </summary>
    public static IReadOnlyList<SettlementInstructionDto> MinimizeDebts(
        IReadOnlyList<MemberSpendingSummaryDto> summaries)
    {
        var debtors = summaries
            .Where(s => s.NetBalance < -0.005m)
            .Select(s => new MemberBalance(s.MemberId, s.MemberName, Math.Abs(s.NetBalance)))
            .ToList();

        var creditors = summaries
            .Where(s => s.NetBalance > 0.005m)
            .Select(s => new MemberBalance(s.MemberId, s.MemberName, s.NetBalance))
            .ToList();

        var instructions = new List<SettlementInstructionDto>();

        while (debtors.Count > 0 && creditors.Count > 0)
        {
            // Sort both lists descending by amount
            debtors.Sort((a, b) => b.Amount.CompareTo(a.Amount));
            creditors.Sort((a, b) => b.Amount.CompareTo(a.Amount));

            var debtor = debtors[0];
            var creditor = creditors[0];

            decimal transfer = Math.Min(debtor.Amount, creditor.Amount);
            if (transfer > 0.005m)
            {
                instructions.Add(new SettlementInstructionDto(
                    debtor.MemberId,
                    debtor.MemberName,
                    creditor.MemberId,
                    creditor.MemberName,
                    Math.Round(transfer, 2)
                ));
            }

            debtor.Amount -= transfer;
            creditor.Amount -= transfer;

            if (debtor.Amount <= 0.005m)
            {
                debtors.RemoveAt(0);
            }

            if (creditor.Amount <= 0.005m)
            {
                creditors.RemoveAt(0);
            }
        }

        return instructions;
    }

    private class MemberBalance
    {
        public Guid MemberId { get; }
        public string MemberName { get; }
        public decimal Amount { get; set; }

        public MemberBalance(Guid memberId, string memberName, decimal amount)
        {
            MemberId = memberId;
            MemberName = memberName;
            Amount = amount;
        }
    }
}
