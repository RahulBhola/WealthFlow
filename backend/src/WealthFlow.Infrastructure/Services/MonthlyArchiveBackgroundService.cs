using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Infrastructure.Persistence;

namespace WealthFlow.Infrastructure.Services;

/// <summary>
/// Background daemon executing on the 1st day of every month to automatically compile,
/// export, and archive the previous month's transaction ledger into Google Drive for all active users.
/// </summary>
public class MonthlyArchiveBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<MonthlyArchiveBackgroundService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromHours(1);
    private int _lastArchivedMonth = -1;
    private int _lastArchivedYear = -1;

    public MonthlyArchiveBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<MonthlyArchiveBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MonthlyArchiveBackgroundService initialized and starting monthly archive monitor.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.UtcNow;

                // Check if today is the 1st of the month and we haven't archived the previous month yet
                if (now.Day == 1)
                {
                    var prevMonthDate = now.AddMonths(-1);
                    var targetYear = prevMonthDate.Year;
                    var targetMonth = prevMonthDate.Month;

                    if (_lastArchivedMonth != targetMonth || _lastArchivedYear != targetYear)
                    {
                        _logger.LogInformation("1st of the month detected. Commencing automated Google Drive ledger archive for {Year}-{Month:D2}", targetYear, targetMonth);

                        using var scope = _serviceProvider.CreateScope();
                        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                        var dataTransferService = scope.ServiceProvider.GetRequiredService<IDataTransferService>();

                        // Get distinct user IDs that have transactions
                        var userIds = await dbContext.Users
                            .AsNoTracking()
                            .Select(u => u.Id)
                            .ToListAsync(stoppingToken);

                        var successCount = 0;
                        foreach (var userId in userIds)
                        {
                            try
                            {
                                await dataTransferService.ArchiveMonthlyTransactionsToGoogleDriveAsync(
                                    userId,
                                    targetYear,
                                    targetMonth,
                                    stoppingToken);
                                successCount++;
                            }
                            catch (Exception userEx)
                            {
                                _logger.LogWarning(userEx, "Automated Google Drive ledger archive skipped or failed for user {UserId}", userId);
                            }
                        }

                        _lastArchivedMonth = targetMonth;
                        _lastArchivedYear = targetYear;

                        _logger.LogInformation("Automated monthly Google Drive archive completed for {Count}/{Total} users for {Year}-{Month:D2}",
                            successCount, userIds.Count, targetYear, targetMonth);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during monthly Google Drive archive monitoring cycle.");
            }

            try
            {
                await Task.Delay(_checkInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("MonthlyArchiveBackgroundService stopped.");
    }
}
