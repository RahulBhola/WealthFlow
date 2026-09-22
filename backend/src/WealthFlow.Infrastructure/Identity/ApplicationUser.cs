using Microsoft.AspNetCore.Identity;

namespace WealthFlow.Infrastructure.Identity;

/// <summary>
/// ASP.NET Core Identity user entity configured with GUID primary key and WealthFlow profile properties.
/// </summary>
public class ApplicationUser : IdentityUser<Guid>
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = "User";
    public string CurrencyCode { get; set; } = "INR";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ApplicationUser()
    {
        Id = Guid.NewGuid();
        SecurityStamp = Guid.NewGuid().ToString();
    }

    public ApplicationUser(string email, string firstName, string lastName, string role = "User", string currencyCode = "INR") : this()
    {
        Email = email;
        UserName = email;
        FirstName = firstName;
        LastName = lastName;
        Role = role;
        CurrencyCode = currencyCode;
    }
}

/// <summary>
/// ASP.NET Core Identity role entity configured with GUID primary key.
/// </summary>
public class ApplicationRole : IdentityRole<Guid>
{
    public ApplicationRole()
    {
        Id = Guid.NewGuid();
    }

    public ApplicationRole(string roleName) : base(roleName)
    {
        Id = Guid.NewGuid();
    }
}
