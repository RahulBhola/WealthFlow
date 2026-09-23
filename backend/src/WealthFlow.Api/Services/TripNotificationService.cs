using Microsoft.AspNetCore.SignalR;
using WealthFlow.Api.Hubs;
using WealthFlow.Application.Features.Trips.DTOs;
using WealthFlow.Application.Features.Trips.Interfaces;

namespace WealthFlow.Api.Services;

/// <summary>
/// Dispatches real-time trip group broadcasts to connected clients via SignalR.
/// </summary>
public class TripNotificationService : ITripNotificationService
{
    private readonly IHubContext<TripHub> _hubContext;
    private readonly ILogger<TripNotificationService> _logger;

    public TripNotificationService(
        IHubContext<TripHub> hubContext,
        ILogger<TripNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyExpenseAddedAsync(Guid tripId, TripExpenseDto expense, CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients.Group($"Trip_{tripId}")
                .SendAsync("ExpenseAdded", expense, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast ExpenseAdded for trip {TripId}", tripId);
        }
    }

    public async Task NotifyAdvanceRecordedAsync(Guid tripId, TripAdvanceDto advance, CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients.Group($"Trip_{tripId}")
                .SendAsync("AdvanceRecorded", advance, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast AdvanceRecorded for trip {TripId}", tripId);
        }
    }

    public async Task NotifySettlementExecutedAsync(Guid tripId, TripSettlementDto settlement, CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients.Group($"Trip_{tripId}")
                .SendAsync("SettlementExecuted", settlement, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast SettlementExecuted for trip {TripId}", tripId);
        }
    }

    public async Task NotifyTripSummaryUpdatedAsync(Guid tripId, TripSummaryDto summary, CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients.Group($"Trip_{tripId}")
                .SendAsync("TripSummaryUpdated", summary, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast TripSummaryUpdated for trip {TripId}", tripId);
        }
    }

    public async Task NotifyMemberJoinedAsync(Guid tripId, TripMemberDto member, CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients.Group($"Trip_{tripId}")
                .SendAsync("MemberJoined", member, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast MemberJoined for trip {TripId}", tripId);
        }
    }
}
