using WealthFlow.Domain.Common;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Domain model representing a system user with profile, default currency, and role metadata.
/// </summary>
public class User : BaseEntity, IAggregateRoot
{
    public string Email { get; private set; } = string.Empty;
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string Role { get; private set; } = nameof(UserRole.User);
    public string CurrencyCode { get; private set; } = "INR";

    // EF Core parameterless constructor
    protected User() { }

    public User(Guid id, string email, string firstName, string lastName, string role = "User", string currencyCode = "INR")
    {
        Id = id;
        Email = email;
        FirstName = firstName;
        LastName = lastName;
        Role = role;
        CurrencyCode = currencyCode;
    }

    public void UpdateProfile(string firstName, string lastName)
    {
        FirstName = firstName;
        LastName = lastName;
        SetUpdated();
    }

    public void SetCurrency(string currencyCode)
    {
        CurrencyCode = currencyCode;
        SetUpdated();
    }
}
