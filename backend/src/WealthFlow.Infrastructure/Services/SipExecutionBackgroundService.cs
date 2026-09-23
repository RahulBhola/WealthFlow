using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using WealthFlow.Application.Features.Investments.Interfaces;

namespace WealthFlow.Infrastructure.Services;

/// <summary>
/// Background daemon executing recurring Systematic Investment Plan (SIP) orders on scheduled monthly execution days.
/// </summary>
public class SipExecutionBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SipExecutionBackgroundService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromHours(1);

    public SipExecutionBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<SipExecutionBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SipExecutionBackgroundService initialized and starting check cycle.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var investmentService = scope.ServiceProvider.GetRequiredService<IInvestmentService>();

                var now = DateTime.UtcNow;
                var executedCount = await investmentService.ExecuteDueSipsAsync(now, stoppingToken);

                if (executedCount > 0)
                {
                    _logger.LogInformation("Successfully executed {Count} due SIP plans for date {Date}.", executedCount, now.Date);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during background SIP execution sweep.");
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

        _logger.LogInformation("SipExecutionBackgroundService stopped.");
    }
}
