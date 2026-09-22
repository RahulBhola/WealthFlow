using WealthFlow.Domain.Common;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Collaborative trip workspace managing shared group expenses, advances, and peer debt settlements.
/// </summary>
public class Trip : BaseEntity, IAggregateRoot
{
    public Guid HostUserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Destination { get; private set; } = string.Empty;
    public DateTime StartDate { get; private set; }
    public DateTime EndDate { get; private set; }
    public decimal? Budget { get; private set; }
    public TripStatus Status { get; private set; } = TripStatus.Planning;

    protected Trip() { }

    public Trip(
        Guid hostUserId,
        string name,
        string destination,
        DateTime startDate,
        DateTime endDate,
        decimal? budget = null,
        TripStatus status = TripStatus.Planning)
    {
        HostUserId = hostUserId;
        Name = name;
        Destination = destination;
        StartDate = startDate.Kind == DateTimeKind.Utc ? startDate : DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
        EndDate = endDate.Kind == DateTimeKind.Utc ? endDate : DateTime.SpecifyKind(endDate, DateTimeKind.Utc);
        Budget = budget;
        Status = status;
    }

    public void UpdateStatus(TripStatus status)
    {
        Status = status;
        SetUpdated();
    }

    public void UpdateDetails(string name, string destination, DateTime startDate, DateTime endDate, decimal? budget)
    {
        Name = name;
        Destination = destination;
        StartDate = startDate.Kind == DateTimeKind.Utc ? startDate : DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
        EndDate = endDate.Kind == DateTimeKind.Utc ? endDate : DateTime.SpecifyKind(endDate, DateTimeKind.Utc);
        Budget = budget;
        SetUpdated();
    }
}
