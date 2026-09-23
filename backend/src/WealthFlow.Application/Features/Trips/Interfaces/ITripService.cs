using WealthFlow.Application.Features.Trips.DTOs;

namespace WealthFlow.Application.Features.Trips.Interfaces;

/// <summary>
/// Service contract for collaborative trip management, expenses, travel advances, and debt settlements.
/// </summary>
public interface ITripService
{
    Task<IReadOnlyList<TripDto>> GetTripsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<TripDetailDto> GetTripByIdAsync(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task<TripDto> CreateTripAsync(Guid hostUserId, CreateTripRequest request, CancellationToken cancellationToken = default);
    Task<TripDto> UpdateTripAsync(Guid tripId, Guid userId, UpdateTripRequest request, CancellationToken cancellationToken = default);

    Task<TripMemberDto> AddMemberAsync(Guid tripId, Guid userId, AddTripMemberRequest request, CancellationToken cancellationToken = default);
    Task<CreateGuestLinkResponse> CreateGuestLinkAsync(Guid tripId, Guid memberId, Guid userId, CreateGuestLinkRequest request, CancellationToken cancellationToken = default);
    Task<bool> RevokeGuestLinkAsync(Guid tripId, Guid memberId, Guid userId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TripExpenseDto>> GetExpensesAsync(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task<TripExpenseDto> AddExpenseAsync(Guid tripId, Guid userId, CreateTripExpenseRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TripAdvanceDto>> GetAdvancesAsync(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task<TripAdvanceDto> AddAdvanceAsync(Guid tripId, Guid userId, CreateTripAdvanceRequest request, CancellationToken cancellationToken = default);

    Task<TripSummaryDto> GetSummaryAsync(Guid tripId, Guid userId, CancellationToken cancellationToken = default);
    Task<TripSettlementDto> ExecuteSettlementAsync(Guid tripId, Guid userId, ExecuteSettlementRequest request, CancellationToken cancellationToken = default);

    // Cryptographic Guest Link Endpoints
    Task<GuestTripViewDto> GetGuestTripViewAsync(Guid tripId, string rawToken, CancellationToken cancellationToken = default);
    Task<TripExpenseDto> AddGuestExpenseAsync(Guid tripId, string rawToken, CreateTripExpenseRequest request, CancellationToken cancellationToken = default);
}
