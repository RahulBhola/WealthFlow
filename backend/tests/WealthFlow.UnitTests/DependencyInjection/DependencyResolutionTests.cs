using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WealthFlow.Application;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Infrastructure;

namespace WealthFlow.UnitTests.DependencyInjection;

/// <summary>
/// Verifies that all repository and Unit of Work abstractions cleanly resolve from the DI container.
/// </summary>
public class DependencyResolutionTests
{
    [Fact]
    public void ServiceProvider_ShouldResolveUnitOfWorkAndRepositories()
    {
        // Arrange
        var services = new ServiceCollection();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DatabaseProvider"] = "InMemory",
                ["ConnectionStrings:DefaultConnection"] = "WealthFlowTestDb"
            })
            .Build();

        services.AddSingleton<IConfiguration>(configuration);
        services.AddLogging();
        services.AddApplicationServices();
        services.AddInfrastructureServices(configuration);

        var serviceProvider = services.BuildServiceProvider();

        // Act & Assert
        var unitOfWork = serviceProvider.GetService<IUnitOfWork>();
        unitOfWork.Should().NotBeNull("IUnitOfWork must be registered and resolvable");

        var accountRepo = serviceProvider.GetService<IAccountRepository>();
        accountRepo.Should().NotBeNull("IAccountRepository must be registered and resolvable");

        var transactionRepo = serviceProvider.GetService<ITransactionRepository>();
        transactionRepo.Should().NotBeNull("ITransactionRepository must be registered and resolvable");

        var tripRepo = serviceProvider.GetService<ITripRepository>();
        tripRepo.Should().NotBeNull("ITripRepository must be registered and resolvable");

        var sipRepo = serviceProvider.GetService<ISipRepository>();
        sipRepo.Should().NotBeNull("ISipRepository must be registered and resolvable");
    }
}
