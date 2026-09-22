using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using WealthFlow.Infrastructure.Identity;
using WealthFlow.Infrastructure.Persistence;

namespace WealthFlow.IntegrationTests.Fixtures;

/// <summary>
/// Custom test web application factory enforcing the Single Universal Test Account Invariant.
/// Configures in-memory database and seeds strictly one designated test user (test@wealthflow.local).
/// </summary>
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    public static readonly Guid TestUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public const string TestUserEmail = "test@wealthflow.local";
    public const string TestUserRole = "User";
    public const string TestUserPassword = "Test@123456";
    private readonly string _databaseName = $"WealthFlow_TestDb_{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((context, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DatabaseProvider"] = "InMemory",
                ["ConnectionStrings:DefaultConnection"] = _databaseName,
                ["Jwt:Secret"] = "WealthFlowSuperSecretKeyMustBeAtLeast32BytesLong!",
                ["Jwt:Issuer"] = "WealthFlow",
                ["Jwt:Audience"] = "WealthFlowClient",
                ["Jwt:AccessTokenExpirationMinutes"] = "15"
            });
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);

        using var scope = host.Services.CreateScope();
        var sp = scope.ServiceProvider;
        var db = sp.GetRequiredService<ApplicationDbContext>();
        var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = sp.GetRequiredService<RoleManager<ApplicationRole>>();

        db.Database.EnsureCreated();
        SeedUniversalTestUser(db, userManager, roleManager).GetAwaiter().GetResult();

        return host;
    }

    private static async Task SeedUniversalTestUser(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager)
    {
        if (!await roleManager.RoleExistsAsync(TestUserRole))
        {
            await roleManager.CreateAsync(new ApplicationRole(TestUserRole));
        }

        if (!await roleManager.RoleExistsAsync("Admin"))
        {
            await roleManager.CreateAsync(new ApplicationRole("Admin"));
        }

        var existingUser = await userManager.FindByIdAsync(TestUserId.ToString());
        if (existingUser == null)
        {
            var testUser = new ApplicationUser
            {
                Id = TestUserId,
                UserName = TestUserEmail,
                Email = TestUserEmail,
                EmailConfirmed = true,
                FirstName = "Universal",
                LastName = "Tester",
                Role = TestUserRole,
                CurrencyCode = "INR",
                CreatedAtUtc = DateTime.UtcNow
            };

            var createResult = await userManager.CreateAsync(testUser, TestUserPassword);
            if (!createResult.Succeeded)
            {
                var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"Failed to seed universal test user: {errors}");
            }

            var roleResult = await userManager.AddToRoleAsync(testUser, TestUserRole);
            if (!roleResult.Succeeded)
            {
                var errors = string.Join(", ", roleResult.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"Failed to assign role to universal test user: {errors}");
            }
        }
    }
}
