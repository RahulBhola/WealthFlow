using FluentAssertions;
using NetArchTest.Rules;
using WealthFlow.Domain.Common;

namespace WealthFlow.UnitTests.Architecture;

/// <summary>
/// Architectural unit tests enforcing strict Clean Architecture inward dependency rules.
/// </summary>
public class CleanArchitectureTests
{
    private const string DomainNamespace = "WealthFlow.Domain";
    private const string ApplicationNamespace = "WealthFlow.Application";
    private const string InfrastructureNamespace = "WealthFlow.Infrastructure";
    private const string ApiNamespace = "WealthFlow.Api";

    [Fact]
    public void Domain_ShouldNotHaveDependencyOnOtherProjects()
    {
        // Act
        var result = Types.InAssembly(typeof(BaseEntity).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(ApplicationNamespace, InfrastructureNamespace, ApiNamespace)
            .GetResult();

        // Assert
        result.IsSuccessful.Should().BeTrue("Domain project must have zero inward dependencies on outer layers");
    }

    [Fact]
    public void Application_ShouldNotHaveDependencyOnInfrastructureOrApi()
    {
        // Act
        var result = Types.InAssembly(typeof(WealthFlow.Application.DependencyInjection).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(InfrastructureNamespace, ApiNamespace)
            .GetResult();

        // Assert
        result.IsSuccessful.Should().BeTrue("Application layer must not depend on Infrastructure or Api layers");
    }

    [Fact]
    public void Infrastructure_ShouldNotHaveDependencyOnApi()
    {
        // Act
        var result = Types.InAssembly(typeof(WealthFlow.Infrastructure.DependencyInjection).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(ApiNamespace)
            .GetResult();

        // Assert
        result.IsSuccessful.Should().BeTrue("Infrastructure layer must not depend on the Api layer");
    }
}
