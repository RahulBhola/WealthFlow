using Microsoft.Extensions.DependencyInjection;

namespace WealthFlow.Application;

/// <summary>
/// Dependency injection extension for the Application layer.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Registers Application layer services into the DI container.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The configured service collection.</returns>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Register application services, validators, etc.
        return services;
    }
}
