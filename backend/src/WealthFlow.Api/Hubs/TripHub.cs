using Microsoft.AspNetCore.SignalR;

namespace WealthFlow.Api.Hubs;

/// <summary>
/// SignalR Hub for real-time collaborative trips communication.
/// Clients join group $"Trip_{tripId}" to receive live mutation broadcasts.
/// </summary>
public class TripHub : Hub
{
    public async Task JoinTrip(string tripId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Trip_{tripId}");
    }

    public async Task LeaveTrip(string tripId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Trip_{tripId}");
    }
}
