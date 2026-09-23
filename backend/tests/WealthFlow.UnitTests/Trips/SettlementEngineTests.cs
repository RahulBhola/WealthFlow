using WealthFlow.Application.Features.Trips.DomainServices;
using WealthFlow.Application.Features.Trips.DTOs;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;
using Xunit;

namespace WealthFlow.UnitTests.Trips;

public class SettlementEngineTests
{
    [Fact]
    public void EqualSplit_FourMembers_OnePayer_MinimizesToThreeDirectRepayments()
    {
        // Arrange: Goa Trip with 4 members. Rahul pays ₹4,000 for dinner split equally.
        var trip = new Trip(Guid.NewGuid(), "Goa 2026", "Goa", DateTime.UtcNow, DateTime.UtcNow.AddDays(5), 50000m);
        var m1 = new TripMember(trip.Id, "Rahul");
        var m2 = new TripMember(trip.Id, "Amit");
        var m3 = new TripMember(trip.Id, "Neha");
        var m4 = new TripMember(trip.Id, "Rohit");
        var members = new List<TripMember> { m1, m2, m3, m4 };

        var splits = new List<TripExpenseSplit>
        {
            new(Guid.NewGuid(), m1.Id, 1000m),
            new(Guid.NewGuid(), m2.Id, 1000m),
            new(Guid.NewGuid(), m3.Id, 1000m),
            new(Guid.NewGuid(), m4.Id, 1000m),
        };

        var expenses = new List<TripExpense>
        {
            new(trip.Id, m1.Id, 4000m, DateTime.UtcNow, "Seafood Dinner", null, SplitType.Equal)
        };

        // Act
        var summary = SettlementEngine.CalculateTripSummary(
            trip, members, expenses, splits, new List<TripAdvance>(), new List<TripSettlement>());

        // Assert
        Assert.Equal(4000m, summary.TotalGroupSpending);
        Assert.Equal(4, summary.MemberSummaries.Count);

        var rahul = summary.MemberSummaries.First(m => m.MemberId == m1.Id);
        Assert.Equal(4000m, rahul.TotalPaid);
        Assert.Equal(1000m, rahul.FairShare);
        Assert.Equal(3000m, rahul.NetBalance); // Creditor: gets back ₹3,000

        var amit = summary.MemberSummaries.First(m => m.MemberId == m2.Id);
        Assert.Equal(0m, amit.TotalPaid);
        Assert.Equal(1000m, amit.FairShare);
        Assert.Equal(-1000m, amit.NetBalance); // Debtor: owes ₹1,000

        // Greedy Debt Simplification: exactly 3 direct repayments to Rahul
        Assert.Equal(3, summary.SimplifiedRepayments.Count);
        Assert.All(summary.SimplifiedRepayments, r =>
        {
            Assert.Equal(m1.Id, r.ToMemberId);
            Assert.Equal(1000m, r.Amount);
        });
    }

    [Fact]
    public void ComplexMultiPayer_WithCircularDebts_SimplifiesToGreedyMinimum()
    {
        // Multi-payer scenario:
        // Member A pays 1200 split equally among A, B, C (400 each)
        // Member B pays 900 split equally among A, B, C (300 each)
        // Member C pays 600 split equally among A, B, C (200 each)
        // Total spending: 2700. Fair share: 900 each.
        // A paid 1200, share 900 -> Net = +300
        // B paid 900, share 900 -> Net = 0
        // C paid 600, share 900 -> Net = -300
        // Circular debt simplifies from multiple debts to exactly 1 transaction: C pays A ₹300!

        var trip = new Trip(Guid.NewGuid(), "Ladakh 2026", "Ladakh", DateTime.UtcNow, DateTime.UtcNow.AddDays(7), 30000m);
        var mA = new TripMember(trip.Id, "A");
        var mB = new TripMember(trip.Id, "B");
        var mC = new TripMember(trip.Id, "C");
        var members = new List<TripMember> { mA, mB, mC };

        var expenses = new List<TripExpense>
        {
            new(trip.Id, mA.Id, 1200m, DateTime.UtcNow, "Hotel", null, SplitType.Equal),
            new(trip.Id, mB.Id, 900m, DateTime.UtcNow, "Fuel", null, SplitType.Equal),
            new(trip.Id, mC.Id, 600m, DateTime.UtcNow, "Food", null, SplitType.Equal),
        };

        var splits = new List<TripExpenseSplit>
        {
            new(expenses[0].Id, mA.Id, 400m),
            new(expenses[0].Id, mB.Id, 400m),
            new(expenses[0].Id, mC.Id, 400m),

            new(expenses[1].Id, mA.Id, 300m),
            new(expenses[1].Id, mB.Id, 300m),
            new(expenses[1].Id, mC.Id, 300m),

            new(expenses[2].Id, mA.Id, 200m),
            new(expenses[2].Id, mB.Id, 200m),
            new(expenses[2].Id, mC.Id, 200m),
        };

        var summary = SettlementEngine.CalculateTripSummary(
            trip, members, expenses, splits, new List<TripAdvance>(), new List<TripSettlement>());

        Assert.Equal(2700m, summary.TotalGroupSpending);

        var a = summary.MemberSummaries.First(m => m.MemberId == mA.Id);
        var b = summary.MemberSummaries.First(m => m.MemberId == mB.Id);
        var c = summary.MemberSummaries.First(m => m.MemberId == mC.Id);

        Assert.Equal(300m, a.NetBalance);
        Assert.Equal(0m, b.NetBalance);
        Assert.Equal(-300m, c.NetBalance);

        // Exactly ONE direct instruction: C pays A 300
        Assert.Single(summary.SimplifiedRepayments);
        var instr = summary.SimplifiedRepayments[0];
        Assert.Equal(mC.Id, instr.FromMemberId);
        Assert.Equal(mA.Id, instr.ToMemberId);
        Assert.Equal(300m, instr.Amount);
    }

    [Fact]
    public void Advances_Prepayments_CorrectlyCreditGiverAndDebitReceiver()
    {
        // Critical Advance Rule:
        // Amit transfers ₹500 advance to Rahul before trip.
        // Giver: Amit -> Net balance +₹500 (Creditor)
        // Receiver: Rahul -> Net balance -₹500 (Debtor)
        // Total trip spending = ₹0!
        var trip = new Trip(Guid.NewGuid(), "Coorg Weekend", "Coorg", DateTime.UtcNow, DateTime.UtcNow.AddDays(2));
        var rahul = new TripMember(trip.Id, "Rahul");
        var amit = new TripMember(trip.Id, "Amit");
        var members = new List<TripMember> { rahul, amit };

        var advance = new TripAdvance(trip.Id, amit.Id, rahul.Id, 500m, DateTime.UtcNow, "UPI Advance for fuel");
        var advances = new List<TripAdvance> { advance };

        var summary = SettlementEngine.CalculateTripSummary(
            trip, members, new List<TripExpense>(), new List<TripExpenseSplit>(), advances, new List<TripSettlement>());

        // 1. Total expenses must remain 0
        Assert.Equal(0m, summary.TotalGroupSpending);

        // 2. Net balances
        var amitSum = summary.MemberSummaries.First(m => m.MemberId == amit.Id);
        var rahulSum = summary.MemberSummaries.First(m => m.MemberId == rahul.Id);

        Assert.Equal(500m, amitSum.AdvancesGiven);
        Assert.Equal(500m, amitSum.NetBalance); // Amit gets back ₹500

        Assert.Equal(500m, rahulSum.AdvancesReceived);
        Assert.Equal(-500m, rahulSum.NetBalance); // Rahul owes ₹500

        // 3. Instruction: Rahul pays Amit ₹500
        Assert.Single(summary.SimplifiedRepayments);
        var instr = summary.SimplifiedRepayments[0];
        Assert.Equal(rahul.Id, instr.FromMemberId);
        Assert.Equal(amit.Id, instr.ToMemberId);
        Assert.Equal(500m, instr.Amount);
    }

    [Fact]
    public void Advances_DoNotAffect_TotalTripExpenses_Invariant()
    {
        var trip = new Trip(Guid.NewGuid(), "Kerala 2026", "Kerala", DateTime.UtcNow, DateTime.UtcNow.AddDays(5), 20000m);
        var m1 = new TripMember(trip.Id, "M1");
        var m2 = new TripMember(trip.Id, "M2");
        var members = new List<TripMember> { m1, m2 };

        var expense = new TripExpense(trip.Id, m1.Id, 5000m, DateTime.UtcNow, "Houseboat", null, SplitType.Equal);
        var expenses = new List<TripExpense> { expense };
        var splits = new List<TripExpenseSplit>
        {
            new(expense.Id, m1.Id, 2500m),
            new(expense.Id, m2.Id, 2500m)
        };

        // Summary before advance
        var summaryBefore = SettlementEngine.CalculateTripSummary(
            trip, members, expenses, splits, new List<TripAdvance>(), new List<TripSettlement>());

        // Now record ₹10,000 advance
        var advance = new TripAdvance(trip.Id, m1.Id, m2.Id, 10000m, DateTime.UtcNow);
        var summaryAfter = SettlementEngine.CalculateTripSummary(
            trip, members, expenses, splits, new List<TripAdvance> { advance }, new List<TripSettlement>());

        // Invariant: TotalGroupSpending is identical
        Assert.Equal(5000m, summaryBefore.TotalGroupSpending);
        Assert.Equal(5000m, summaryAfter.TotalGroupSpending);
    }

    [Fact]
    public void SettlementExecution_UpdatesNetBalanceToZero()
    {
        // M1 paid 1000 for M2. M2 owes 1000.
        // M2 executes settlement of 1000 to M1.
        // Net balances must become 0.
        var trip = new Trip(Guid.NewGuid(), "Trip", "Dest", DateTime.UtcNow, DateTime.UtcNow.AddDays(2));
        var m1 = new TripMember(trip.Id, "M1");
        var m2 = new TripMember(trip.Id, "M2");
        var members = new List<TripMember> { m1, m2 };

        var expense = new TripExpense(trip.Id, m1.Id, 1000m, DateTime.UtcNow, "Tickets", null, SplitType.Unequal);
        var splits = new List<TripExpenseSplit>
        {
            new(expense.Id, m2.Id, 1000m)
        };

        var settlement = new TripSettlement(trip.Id, m2.Id, m1.Id, 1000m, DateTime.UtcNow, "UPI", "GPay Ref #99", true);

        var summary = SettlementEngine.CalculateTripSummary(
            trip, members, new List<TripExpense> { expense }, splits, new List<TripAdvance>(), new List<TripSettlement> { settlement });

        var s1 = summary.MemberSummaries.First(m => m.MemberId == m1.Id);
        var s2 = summary.MemberSummaries.First(m => m.MemberId == m2.Id);

        Assert.Equal(0m, s1.NetBalance);
        Assert.True(s1.IsSettled);
        Assert.Equal(0m, s2.NetBalance);
        Assert.True(s2.IsSettled);
        Assert.Empty(summary.SimplifiedRepayments);
    }

    [Fact]
    public void SplitCalculator_AllFourModes_AndRemainderAllocation()
    {
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var id3 = Guid.NewGuid();
        var allIds = new List<Guid> { id1, id2, id3 };

        // 1. Equal Split with cent remainder: 100 / 3 = 33.34, 33.33, 33.33
        var equalSplits = SplitCalculator.CalculateSplits(100m, SplitType.Equal, new List<SplitInputDto>(), allIds);
        Assert.Equal(3, equalSplits.Count);
        Assert.Equal(100m, equalSplits.Sum(s => s.AllocatedAmount));
        Assert.Equal(33.34m, equalSplits[0].AllocatedAmount);
        Assert.Equal(33.33m, equalSplits[1].AllocatedAmount);
        Assert.Equal(33.33m, equalSplits[2].AllocatedAmount);

        // 2. Unequal Split
        var unequalInputs = new List<SplitInputDto>
        {
            new(id1, AllocatedAmount: 40m),
            new(id2, AllocatedAmount: 35m),
            new(id3, AllocatedAmount: 25m)
        };
        var unequalSplits = SplitCalculator.CalculateSplits(100m, SplitType.Unequal, unequalInputs, allIds);
        Assert.Equal(100m, unequalSplits.Sum(s => s.AllocatedAmount));

        // 3. Percentage Split: 50%, 30%, 20%
        var percentInputs = new List<SplitInputDto>
        {
            new(id1, AllocatedPercentage: 50m),
            new(id2, AllocatedPercentage: 30m),
            new(id3, AllocatedPercentage: 20m)
        };
        var percentSplits = SplitCalculator.CalculateSplits(250m, SplitType.Percentage, percentInputs, allIds);
        Assert.Equal(250m, percentSplits.Sum(s => s.AllocatedAmount));
        Assert.Equal(125m, percentSplits[0].AllocatedAmount);
        Assert.Equal(75m, percentSplits[1].AllocatedAmount);
        Assert.Equal(50m, percentSplits[2].AllocatedAmount);

        // 4. Shares Split: 2 shares, 1 share, 1 share -> 4 shares of ₹100
        var sharesInputs = new List<SplitInputDto>
        {
            new(id1, AllocatedShares: 2),
            new(id2, AllocatedShares: 1),
            new(id3, AllocatedShares: 1)
        };
        var sharesSplits = SplitCalculator.CalculateSplits(100m, SplitType.Shares, sharesInputs, allIds);
        Assert.Equal(100m, sharesSplits.Sum(s => s.AllocatedAmount));
        Assert.Equal(50m, sharesSplits[0].AllocatedAmount);
        Assert.Equal(25m, sharesSplits[1].AllocatedAmount);
        Assert.Equal(25m, sharesSplits[2].AllocatedAmount);
    }
}
