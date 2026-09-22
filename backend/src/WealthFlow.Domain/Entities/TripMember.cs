using WealthFlow.Domain.Common;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Participant in a collaborative trip workspace.
/// Can be a registered user or an anonymous invited guest authenticated via cryptographic URL token.
/// </summary>
public class TripMember : BaseEntity
{
    public Guid TripId { get; private set; }
    public Guid? RegisteredUserId { get; private set; }
    public string GuestName { get; private set; } = string.Empty;
    public string? GuestSecureTokenHash { get; private set; }
    public DateTime? TokenExpiresAtUtc { get; private set; }
    public bool CanAddExpenses { get; private set; } = true;

    protected TripMember() { }

    public TripMember(
        Guid tripId,
        string guestName,
        Guid? registeredUserId = null,
        string? guestSecureTokenHash = null,
        DateTime? tokenExpiresAtUtc = null,
        bool canAddExpenses = true)
    {
        TripId = tripId;
        GuestName = guestName;
        RegisteredUserId = registeredUserId;
        GuestSecureTokenHash = guestSecureTokenHash;
        TokenExpiresAtUtc = tokenExpiresAtUtc.HasValue 
            ? (tokenExpiresAtUtc.Value.Kind == DateTimeKind.Utc ? tokenExpiresAtUtc.Value : DateTime.SpecifyKind(tokenExpiresAtUtc.Value, DateTimeKind.Utc)) 
            : null;
        CanAddExpenses = canAddExpenses;
    }

    public void SetToken(string tokenHash, DateTime expiresAtUtc)
    {
        GuestSecureTokenHash = tokenHash;
        TokenExpiresAtUtc = expiresAtUtc.Kind == DateTimeKind.Utc ? expiresAtUtc : DateTime.SpecifyKind(expiresAtUtc, DateTimeKind.Utc);
        SetUpdated();
    }
}
