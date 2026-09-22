using WealthFlow.Domain.Common;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Systematic Investment Plan (SIP) schedule, supporting individual or joint/co-investor contribution splits.
/// </summary>
public class SIP : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public Guid InvestmentId { get; private set; }
    public Guid SourceAccountId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public int ExecutionDay { get; private set; }
    public DateTime StartDate { get; private set; }
    public DateTime? EndDate { get; private set; }
    public SipStatus Status { get; private set; } = SipStatus.Active;
    public bool IsJoint { get; private set; } = false;
    public decimal UserShare { get; private set; }
    public decimal CoInvestorShare { get; private set; }
    public string? CoInvestorName { get; private set; }

    protected SIP() { }

    public SIP(
        Guid userId,
        Guid investmentId,
        Guid sourceAccountId,
        string name,
        decimal amount,
        int executionDay,
        DateTime startDate,
        DateTime? endDate = null,
        bool isJoint = false,
        decimal? userShare = null,
        decimal? coInvestorShare = null,
        string? coInvestorName = null)
    {
        UserId = userId;
        InvestmentId = investmentId;
        SourceAccountId = sourceAccountId;
        Name = name;
        Amount = amount;
        ExecutionDay = executionDay;
        StartDate = startDate.Kind == DateTimeKind.Utc ? startDate : DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
        EndDate = endDate.HasValue 
            ? (endDate.Value.Kind == DateTimeKind.Utc ? endDate.Value : DateTime.SpecifyKind(endDate.Value, DateTimeKind.Utc)) 
            : null;
        IsJoint = isJoint;
        UserShare = isJoint ? (userShare ?? amount) : amount;
        CoInvestorShare = isJoint ? (coInvestorShare ?? 0m) : 0m;
        CoInvestorName = isJoint ? coInvestorName : null;
        Status = SipStatus.Active;
    }

    public void UpdateStatus(SipStatus status)
    {
        Status = status;
        SetUpdated();
    }
}
