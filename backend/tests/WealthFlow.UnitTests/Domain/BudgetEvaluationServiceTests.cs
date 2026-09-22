using FluentAssertions;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;
using WealthFlow.Domain.Services;

namespace WealthFlow.UnitTests.Domain;

public class BudgetEvaluationServiceTests
{
    private readonly BudgetEvaluationService _service = new();

    [Fact]
    public void Evaluate_Under80Percent_ShouldReturnNormalStatusAndGreenHex()
    {
        // Arrange: 10,000 limit, 7,500 spend (75%)
        var budget = new Budget(Guid.NewGuid(), Guid.NewGuid(), 10000m);

        // Act
        var result = _service.Evaluate(budget, 7500m);

        // Assert
        result.Status.Should().Be(BudgetThresholdStatus.Normal);
        result.UtilizationPercentage.Should().Be(75m);
        result.RemainingAmount.Should().Be(2500m);
        result.OverageAmount.Should().Be(0m);
        result.HexColor.Should().Be("#10B981");
    }

    [Fact]
    public void Evaluate_Between80And89Percent_ShouldReturnWarningStatusAndAmberHex()
    {
        // Arrange: 10,000 limit, 8,500 spend (85%)
        var budget = new Budget(Guid.NewGuid(), Guid.NewGuid(), 10000m);

        // Act
        var result = _service.Evaluate(budget, 8500m);

        // Assert
        result.Status.Should().Be(BudgetThresholdStatus.Warning);
        result.UtilizationPercentage.Should().Be(85m);
        result.RemainingAmount.Should().Be(1500m);
        result.OverageAmount.Should().Be(0m);
        result.HexColor.Should().Be("#F59E0B");
    }

    [Fact]
    public void Evaluate_Between90And99Percent_ShouldReturnCriticalStatusAndOrangeHex()
    {
        // Arrange: 10,000 limit, 9,500 spend (95%)
        var budget = new Budget(Guid.NewGuid(), Guid.NewGuid(), 10000m);

        // Act
        var result = _service.Evaluate(budget, 9500m);

        // Assert
        result.Status.Should().Be(BudgetThresholdStatus.Critical);
        result.UtilizationPercentage.Should().Be(95m);
        result.RemainingAmount.Should().Be(500m);
        result.OverageAmount.Should().Be(0m);
        result.HexColor.Should().Be("#F97316");
    }

    [Fact]
    public void Evaluate_Over100Percent_ShouldReturnExceededStatusAndRoseHexWithOverage()
    {
        // Arrange: 10,000 limit, 12,450 spend (124.5%)
        var budget = new Budget(Guid.NewGuid(), Guid.NewGuid(), 10000m);

        // Act
        var result = _service.Evaluate(budget, 12450m);

        // Assert
        result.Status.Should().Be(BudgetThresholdStatus.Exceeded);
        result.UtilizationPercentage.Should().Be(124.5m);
        result.RemainingAmount.Should().Be(0m);
        result.OverageAmount.Should().Be(2450m);
        result.HexColor.Should().Be("#EF4444");
    }
}
