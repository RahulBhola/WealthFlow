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
    "http://localhost:8080"
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
        if (allowedOriginsEnv == "*")
        {
            policy.SetIsOriginAllowed(_ => true)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            policy.WithOrigins(allowedOriginsList.Distinct().ToArray())
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddControllers();

var app = builder.Build();

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
app.UseCors("DefaultPolicy");

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
            logger.LogInformation("Ensuring PostgreSQL database schema exists...");
            db.Database.EnsureCreated();
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

        var existingAdmin = await userManager.FindByEmailAsync(defaultAdminEmail);
        if (existingAdmin == null)
        {
            logger.LogInformation("Seeding initial singleton admin account ({Email})...", defaultAdminEmail);
            var adminUser = new ApplicationUser
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
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
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred during startup database initialization.");
    }
}

app.Run();

// Required for WebApplicationFactory<Program> in IntegrationTests
public partial class Program { }
