using WealthFlow.Domain.Common;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Individual allocated financial portion of a trip expense assigned to a specific participant.
/// </summary>
public class TripExpenseSplit : BaseEntity, IAggregateRoot
{
    public Guid TripExpenseId { get; private set; }
    public Guid MemberId { get; private set; }
    public decimal AllocatedAmount { get; private set; }
    public decimal? AllocatedPercentage { get; private set; }
    public int? AllocatedShares { get; private set; }

    protected TripExpenseSplit() { }

    public TripExpenseSplit(
        Guid tripExpenseId,
        Guid memberId,
        decimal allocatedAmount,
        decimal? allocatedPercentage = null,
        int? allocatedShares = null)
    {
        TripExpenseId = tripExpenseId;
        MemberId = memberId;
        AllocatedAmount = allocatedAmount;
        AllocatedPercentage = allocatedPercentage;
        AllocatedShares = allocatedShares;
    }
}
