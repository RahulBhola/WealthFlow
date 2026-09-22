using WealthFlow.Domain.Common;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Monthly bilateral reconciliation record for joint SIP executions, tracking co-investor obligations.
/// </summary>
public class JointSipReconciliation : BaseEntity, IAggregateRoot
{
    public Guid SIPId { get; private set; }
    public Guid UserId { get; private set; }
    public int Month { get; private set; }
    public int Year { get; private set; }
    public DateTime ExecutionDateUtc { get; private set; }
    public decimal TotalAmount { get; private set; }
    public decimal UserShare { get; private set; }
    public decimal CoInvestorShare { get; private set; }
    public decimal AmountSettled { get; private set; }
    public SettlementStatus SettlementStatus { get; private set; } = SettlementStatus.Pending;
    public DateTime? SettlementDateUtc { get; private set; }
    public string? Notes { get; private set; }

    protected JointSipReconciliation() { }

    public JointSipReconciliation(
        Guid sipId,
        Guid userId,
        int month,
        int year,
        DateTime executionDateUtc,
        decimal totalAmount,
        decimal userShare,
        decimal coInvestorShare,
        string? notes = null)
    {
        SIPId = sipId;
        UserId = userId;
        Month = month;
        Year = year;
        ExecutionDateUtc = executionDateUtc.Kind == DateTimeKind.Utc ? executionDateUtc : DateTime.SpecifyKind(executionDateUtc, DateTimeKind.Utc);
        TotalAmount = totalAmount;
        UserShare = userShare;
        CoInvestorShare = coInvestorShare;
        AmountSettled = 0m;
        SettlementStatus = SettlementStatus.Pending;
        Notes = notes;
    }

    public void RecordSettlement(decimal settledAmount, DateTime settlementDateUtc, string? notes = null)
    {
        AmountSettled += settledAmount;
        SettlementDateUtc = settlementDateUtc.Kind == DateTimeKind.Utc ? settlementDateUtc : DateTime.SpecifyKind(settlementDateUtc, DateTimeKind.Utc);
        if (notes != null) Notes = notes;

        if (AmountSettled >= CoInvestorShare)
        {
            SettlementStatus = SettlementStatus.Settled;
        }
        else if (AmountSettled > 0m)
        {
            SettlementStatus = SettlementStatus.PartiallySettled;
        }

        SetUpdated();
    }
}
