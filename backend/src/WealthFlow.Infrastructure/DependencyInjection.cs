using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Accounts.Interfaces;
using WealthFlow.Application.Features.Auth.Interfaces;
using WealthFlow.Application.Features.Categories.Interfaces;
using WealthFlow.Domain.Common;
using WealthFlow.Domain.Services;
using WealthFlow.Infrastructure.Identity;
using WealthFlow.Infrastructure.Persistence;
using WealthFlow.Infrastructure.Persistence.Repositories;
using WealthFlow.Infrastructure.Services;

namespace WealthFlow.Infrastructure;

/// <summary>
/// Dependency injection configuration for Infrastructure data access, identity, and persistence services.
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

        // JWT Authentication Configuration
        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            var jwtSecret = configuration["Jwt:Secret"] ?? "WealthFlowSuperSecretKeyMustBeAtLeast32BytesLong!";
            var jwtIssuer = configuration["Jwt:Issuer"] ?? "WealthFlow";
            var jwtAudience = configuration["Jwt:Audience"] ?? "WealthFlowClient";

            options.RequireHttpsMetadata = false;
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwtIssuer,
                ValidateAudience = true,
                ValidAudience = jwtAudience,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                ClockSkew = TimeSpan.Zero
            };
        });

        // Services & Repositories Registration
        services.AddSingleton<ITokenService, TokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<BalanceCalculationService>();
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IAccountRepository, AccountRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ITransactionRepository, TransactionRepository>();
        services.AddScoped<ITripRepository, TripRepository>();
        services.AddScoped<ISipRepository, SipRepository>();
        services.AddScoped<IUserSessionRepository, UserSessionRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }
}

