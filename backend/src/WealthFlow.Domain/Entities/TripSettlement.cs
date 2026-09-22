using WealthFlow.Domain.Common;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Informational debt settlement record between two trip participants.
/// In accordance with the Zero Payment Gateway Invariant, settlements are purely informational
/// bookkeeping records confirming debt extinguishment without triggering external money movement.
/// </summary>
public class TripSettlement : BaseEntity, IAggregateRoot
{
    public Guid TripId { get; private set; }
    public Guid PayerMemberId { get; private set; }
    public Guid ReceiverMemberId { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime SettledAtUtc { get; private set; }
    public string SettlementMethod { get; private set; } = "Manual";
    public string? Notes { get; private set; }
    public bool IsConfirmed { get; private set; } = true;

    protected TripSettlement() { }

    public TripSettlement(
        Guid tripId,
        Guid payerMemberId,
        Guid receiverMemberId,
        decimal amount,
        DateTime settledAtUtc,
        string settlementMethod = "Manual",
        string? notes = null,
        bool isConfirmed = true)
    {
        TripId = tripId;
        PayerMemberId = payerMemberId;
        ReceiverMemberId = receiverMemberId;
        Amount = amount;
        SettledAtUtc = settledAtUtc.Kind == DateTimeKind.Utc ? settledAtUtc : DateTime.SpecifyKind(settledAtUtc, DateTimeKind.Utc);
        SettlementMethod = settlementMethod;
        Notes = notes;
        IsConfirmed = isConfirmed;
    }

    public void Confirm()
    {
        IsConfirmed = true;
        SetUpdated();
    }
}
