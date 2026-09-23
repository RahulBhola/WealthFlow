using WealthFlow.Api.Hubs;
using WealthFlow.Api.Services;
using WealthFlow.Application;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Trips.Interfaces;
using WealthFlow.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddSingleton<IDateTimeService, DateTimeService>();

// Register Application & Infrastructure layers
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// Register Real-time SignalR & Trip notification service
builder.Services.AddSignalR();
builder.Services.AddScoped<ITripNotificationService, TripNotificationService>();

// CORS configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173")
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

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new
{
    Status = "Healthy",
    TimestampUtc = DateTime.UtcNow,
    Version = "1.0.0"
}))
.WithName("HealthCheck")
.WithOpenApi();

app.MapControllers();

app.Run();

// Required for WebApplicationFactory<Program> in IntegrationTests
public partial class Program { }
