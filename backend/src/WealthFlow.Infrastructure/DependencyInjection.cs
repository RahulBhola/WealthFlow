using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Domain.Common;
using WealthFlow.Infrastructure.Identity;
using WealthFlow.Infrastructure.Persistence;
using WealthFlow.Infrastructure.Persistence.Repositories;

namespace WealthFlow.Infrastructure;

/// <summary>
/// Dependency injection configuration for Infrastructure data access and persistence services.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            var config = sp.GetRequiredService<IConfiguration>();
            var provider = config["DatabaseProvider"] ?? "PostgreSQL";
            var connectionString = config.GetConnectionString("DefaultConnection");

            if (provider.Equals("InMemory", StringComparison.OrdinalIgnoreCase) || string.IsNullOrEmpty(connectionString))
            {
                options.UseInMemoryDatabase(string.IsNullOrEmpty(connectionString) ? "WealthFlowDb" : connectionString);
            }
            else
            {
                options.UseNpgsql(connectionString);
            }
        });

        // Identity Configuration
        services.AddIdentityCore<ApplicationUser>(options =>
        {
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = true;
            options.Password.RequiredLength = 8;
            options.User.RequireUniqueEmail = true;
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        })
        .AddRoles<ApplicationRole>()
        .AddEntityFrameworkStores<ApplicationDbContext>();

        // Repository & Unit of Work Registration
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IAccountRepository, AccountRepository>();
        services.AddScoped<ITransactionRepository, TransactionRepository>();
        services.AddScoped<ITripRepository, TripRepository>();
        services.AddScoped<ISipRepository, SipRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }
}
