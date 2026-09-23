using WealthFlow.Application.Features.Trips.DTOs;

namespace WealthFlow.Application.Features.Trips.Interfaces;

/// <summary>
/// Service contract for real-time notification broadcasts to trip participant groups.
/// </summary>
public interface ITripNotificationService
{
    Task NotifyExpenseAddedAsync(Guid tripId, TripExpenseDto expense, CancellationToken cancellationToken = default);
    Task NotifyAdvanceRecordedAsync(Guid tripId, TripAdvanceDto advance, CancellationToken cancellationToken = default);
    Task NotifySettlementExecutedAsync(Guid tripId, TripSettlementDto settlement, CancellationToken cancellationToken = default);
    Task NotifyTripSummaryUpdatedAsync(Guid tripId, TripSummaryDto summary, CancellationToken cancellationToken = default);
    Task NotifyMemberJoinedAsync(Guid tripId, TripMemberDto member, CancellationToken cancellationToken = default);
}
