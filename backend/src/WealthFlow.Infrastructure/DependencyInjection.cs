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
using WealthFlow.Application.Features.Budgets.Interfaces;
using WealthFlow.Application.Features.Categories.Interfaces;
using WealthFlow.Application.Features.Transactions.Interfaces;
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
                options.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning));
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
        services.AddScoped<BudgetEvaluationService>();
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ITransactionService, TransactionService>();
        services.AddScoped<IBudgetService, BudgetService>();
        services.AddScoped<WealthFlow.Application.Features.CreditCards.Interfaces.ICreditCardService, CreditCardService>();
        services.AddScoped<WealthFlow.Application.Features.Loans.Interfaces.ILoanService, LoanService>();
        services.AddScoped<WealthFlow.Application.Features.Gifts.Interfaces.IGiftService, GiftService>();
        services.AddScoped<WealthFlow.Application.Features.Investments.Interfaces.IInvestmentService, InvestmentService>();
        services.AddScoped<WealthFlow.Application.Features.Trips.Interfaces.ITripService, TripService>();
        services.AddScoped<WealthFlow.Application.Features.Sync.Interfaces.ISyncService, SyncService>();
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IAccountRepository, AccountRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ITransactionRepository, TransactionRepository>();
        services.AddScoped<IBudgetRepository, BudgetRepository>();
        services.AddScoped<ITripRepository, TripRepository>();
        services.AddScoped<ITripMemberRepository, TripMemberRepository>();
        services.AddScoped<ITripExpenseRepository, TripExpenseRepository>();
        services.AddScoped<ITripExpenseSplitRepository, TripExpenseSplitRepository>();
        services.AddScoped<ITripAdvanceRepository, TripAdvanceRepository>();
        services.AddScoped<ITripSettlementRepository, TripSettlementRepository>();
        services.AddScoped<ISipRepository, SipRepository>();
        services.AddScoped<IInvestmentRepository, InvestmentRepository>();
        services.AddScoped<IJointSipReconciliationRepository, JointSipReconciliationRepository>();
        services.AddScoped<ICreditCardRepository, CreditCardRepository>();
        services.AddScoped<ILoanRepository, LoanRepository>();
        services.AddScoped<IGiftRepository, GiftRepository>();
        services.AddScoped<ISyncOperationLogRepository, SyncOperationLogRepository>();
        services.AddScoped<IUserSessionRepository, UserSessionRepository>();
        services.AddScoped<WealthFlow.Application.Features.Dashboard.Interfaces.IDashboardService, DashboardService>();
        services.AddScoped<WealthFlow.Application.Features.Admin.Interfaces.IAdminService, AdminService>();
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddHostedService<SipExecutionBackgroundService>();

        return services;
    }
}

