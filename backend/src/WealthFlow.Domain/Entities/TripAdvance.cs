using WealthFlow.Domain.Common;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Direct pre-trip or mid-trip cash/transfer advance between two trip members.
/// CRITICAL DOMAIN INVARIANT: Trip advances represent bilateral liquidity transfers and are
/// strictly excluded from the total group expense aggregation of the trip.
/// </summary>
public class TripAdvance : BaseEntity, IAggregateRoot
{
    public Guid TripId { get; private set; }
    public Guid GiverMemberId { get; private set; }
    public Guid ReceiverMemberId { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime AdvanceDate { get; private set; }
    public string? Notes { get; private set; }

    protected TripAdvance() { }

    public TripAdvance(
        Guid tripId,
        Guid giverMemberId,
        Guid receiverMemberId,
        decimal amount,
        DateTime advanceDate,
        string? notes = null)
    {
        TripId = tripId;
        GiverMemberId = giverMemberId;
        ReceiverMemberId = receiverMemberId;
        Amount = amount;
        AdvanceDate = advanceDate.Kind == DateTimeKind.Utc ? advanceDate : DateTime.SpecifyKind(advanceDate, DateTimeKind.Utc);
        Notes = notes;
    }
}
