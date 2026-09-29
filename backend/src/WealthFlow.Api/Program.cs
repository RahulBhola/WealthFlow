using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Serilog.Formatting.Compact;
using WealthFlow.Api.Hubs;
using WealthFlow.Api.Middleware;
using WealthFlow.Api.Services;
using WealthFlow.Application;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Trips.Interfaces;
using WealthFlow.Infrastructure;
using WealthFlow.Infrastructure.Identity;
using WealthFlow.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// Dynamically bind to PORT environment variable if provided by host (e.g. Render, Railway)
var hostPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(hostPort))
{
    builder.WebHost.UseUrls($"http://+:{hostPort}");
}

// Configure Serilog with structured JSON logging and correlation context
builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "WealthFlow.Api")
        .Enrich.WithProperty("Environment", context.HostingEnvironment.EnvironmentName)
        .WriteTo.Console(new CompactJsonFormatter());
});

// Add services to the container.
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddSingleton<IDateTimeService, DateTimeService>();

// Register Application & Infrastructure layers
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// Health Checks (Liveness and Database Readiness)
builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>(
        name: "database",
        tags: new[] { "ready" });

// Register Real-time SignalR & Trip notification service
builder.Services.AddSignalR();
builder.Services.AddScoped<ITripNotificationService, TripNotificationService>();

// CORS configuration supporting dynamic cloud deployment domains
var allowedOriginsEnv = builder.Configuration["Cors:AllowedOrigins"] 
    ?? builder.Configuration["CORS_ALLOWED_ORIGINS"];

var allowedOriginsList = new List<string>
{
    "http://localhost:5173",
    "https://localhost:5173",
    "http://localhost:80",
    "http://localhost:3000",
    "http://localhost:8080",
    "https://wealthflowmanage.vercel.app",
    "https://wealthflow-chi-blond.vercel.app"
};

if (!string.IsNullOrWhiteSpace(allowedOriginsEnv))
{
    var customOrigins = allowedOriginsEnv.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    allowedOriginsList.AddRange(customOrigins);
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultPolicy", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrWhiteSpace(origin)) return false;
            if (allowedOriginsEnv == "*") return true;

            // Allow localhost / loopback on any port
            if (origin.StartsWith("http://localhost:", StringComparison.OrdinalIgnoreCase) ||
                origin.StartsWith("https://localhost:", StringComparison.OrdinalIgnoreCase) ||
                origin.StartsWith("http://127.0.0.1:", StringComparison.OrdinalIgnoreCase) ||
                origin.StartsWith("https://127.0.0.1:", StringComparison.OrdinalIgnoreCase) ||
                origin.Equals("http://localhost", StringComparison.OrdinalIgnoreCase) ||
                origin.Equals("https://localhost", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            // Allow any Vercel deployment domain (production, preview, custom)
            try
            {
                var uri = new Uri(origin);
                if (uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase) ||
                    uri.Host.Equals("wealthflowmanage.vercel.app", StringComparison.OrdinalIgnoreCase) ||
                    uri.Host.Equals("wealthflow-chi-blond.vercel.app", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            catch
            {
                // ignore parse failure
            }

            // Allow any explicitly configured origins
            return allowedOriginsList.Any(o => o.TrimEnd('/').Equals(origin.TrimEnd('/'), StringComparison.OrdinalIgnoreCase));
        })
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddControllers();

var app = builder.Build();

// Authoritative CORS at top of pipeline to guarantee headers on all responses & preflights
app.UseCors("DefaultPolicy");

// Global exception handling ensuring CORS headers are preserved even on 500s
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Unhandled exception processing HTTP request: {Method} {Path}", context.Request.Method, context.Request.Path);
        if (!context.Response.HasStarted)
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                error = "Internal Server Error",
                message = ex.Message
            });
        }
    }
});

// Correlation ID & Serilog request logging
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseSerilogRequestLogging();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

// Map SignalR TripHub
app.MapHub<TripHub>("/hubs/trip");

// Health Checks: Liveness & Readiness
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false // Liveness: 200 OK as long as process is up
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"), // Readiness: verifies database connectivity
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var response = new
        {
            status = report.Status.ToString(),
            totalDuration = report.TotalDuration,
            entries = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description,
                duration = e.Value.Duration
            })
        };
        await context.Response.WriteAsJsonAsync(response);
    }
});

// Backward-compatible general health endpoint
app.MapGet("/health", () => Results.Ok(new
{
    Status = "Healthy",
    TimestampUtc = DateTime.UtcNow,
    Version = "1.0.0"
}))
.WithName("HealthCheck")
.WithOpenApi();

app.MapControllers();

// Automatic database schema creation and singleton admin seeding on startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var db = services.GetRequiredService<ApplicationDbContext>();
        var config = services.GetRequiredService<IConfiguration>();
        var autoInit = config.GetValue<bool>("AutoInitDatabase", true);

        if (autoInit && !db.Database.IsInMemory())
        {
            logger.LogInformation("Ensuring database schema exists...");
            db.Database.EnsureCreated();

            // Apply idempotent schema migrations for existing databases
            try
            {
                if (db.Database.IsNpgsql())
                {
                    logger.LogInformation("Applying idempotent PostgreSQL schema updates for Accounts and Transactions...");
                    await db.Database.ExecuteSqlRawAsync(@"
                        ALTER TABLE ""Accounts"" ADD COLUMN IF NOT EXISTS ""BlockedBalance"" numeric(18,2) NOT NULL DEFAULT 0;
                        ALTER TABLE ""Transactions"" ADD COLUMN IF NOT EXISTS ""Status"" integer NOT NULL DEFAULT 0;
                        ALTER TABLE ""Transactions"" ADD COLUMN IF NOT EXISTS ""AllottedUnits"" numeric(18,4) NULL;
                        ALTER TABLE ""Transactions"" ADD COLUMN IF NOT EXISTS ""ResolutionDate"" timestamp with time zone NULL;
                    ");
                    logger.LogInformation("PostgreSQL schema updates applied successfully.");
                }
                else if (db.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true)
                {
                    try { await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Accounts"" ADD COLUMN ""BlockedBalance"" TEXT NOT NULL DEFAULT '0';"); } catch { }
                    try { await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Transactions"" ADD COLUMN ""Status"" INTEGER NOT NULL DEFAULT 0;"); } catch { }
                    try { await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Transactions"" ADD COLUMN ""AllottedUnits"" TEXT NULL;"); } catch { }
                    try { await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Transactions"" ADD COLUMN ""ResolutionDate"" TEXT NULL;"); } catch { }
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Schema migration execution noticed: {Message}", ex.Message);
            }
        }

        var roleManager = services.GetRequiredService<RoleManager<ApplicationRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

        if (!await roleManager.RoleExistsAsync("User"))
        {
            await roleManager.CreateAsync(new ApplicationRole("User"));
        }
        if (!await roleManager.RoleExistsAsync("Admin"))
        {
            await roleManager.CreateAsync(new ApplicationRole("Admin"));
        }

        var defaultAdminEmail = config["DefaultAdmin:Email"] ?? "admin@wealthflow.local";
        var defaultAdminPassword = config["DefaultAdmin:Password"] ?? "Admin@123456";

        var singletonAdminId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        var existingAdminById = await userManager.FindByIdAsync(singletonAdminId.ToString());
        if (existingAdminById != null)
        {
            if (!string.Equals(existingAdminById.Email, defaultAdminEmail, StringComparison.OrdinalIgnoreCase))
            {
                existingAdminById.Email = defaultAdminEmail;
                existingAdminById.UserName = defaultAdminEmail;
                await userManager.UpdateAsync(existingAdminById);
                var token = await userManager.GeneratePasswordResetTokenAsync(existingAdminById);
                await userManager.ResetPasswordAsync(existingAdminById, token, defaultAdminPassword);
                logger.LogInformation("Updated singleton admin credentials to ({Email}).", defaultAdminEmail);
            }
        }
        else
        {
            var existingAdminByEmail = await userManager.FindByEmailAsync(defaultAdminEmail);
            if (existingAdminByEmail == null)
            {
                logger.LogInformation("Seeding initial singleton admin account ({Email})...", defaultAdminEmail);
                var adminUser = new ApplicationUser
                {
                    Id = singletonAdminId,
                    UserName = defaultAdminEmail,
                    Email = defaultAdminEmail,
                    EmailConfirmed = true,
                    FirstName = "Singleton",
                    LastName = "Admin",
                    Role = "Admin",
                    CurrencyCode = "INR",
                    CreatedAtUtc = DateTime.UtcNow
                };

                var adminResult = await userManager.CreateAsync(adminUser, defaultAdminPassword);
                if (adminResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(adminUser, "Admin");
                    logger.LogInformation("Singleton admin account seeded successfully.");
                }
            }
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred during startup database initialization.");
    }
}

app.Run();

// Required for WebApplicationFactory<Program> in IntegrationTests
public partial class Program { }
