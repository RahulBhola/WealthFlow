using WealthFlow.Application.Features.Trips.DTOs;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Application.Features.Trips.DomainServices;

/// <summary>
/// Domain calculation service for apportioning trip expenses across participants.
/// Supports 4 split models (Equal, Unequal, Percentage, Shares) with exact 2-decimal remainder allocation.
/// </summary>
public static class SplitCalculator
{
    public record CalculatedSplit(
        Guid MemberId,
        decimal AllocatedAmount,
        decimal? AllocatedPercentage,
        int? AllocatedShares
    );

    public static IReadOnlyList<CalculatedSplit> CalculateSplits(
        decimal totalAmount,
        SplitType splitType,
        IReadOnlyList<SplitInputDto> splitInputs,
        IReadOnlyList<Guid> defaultAllMemberIds)
    {
        if (totalAmount <= 0)
        {
            throw new ArgumentException("Expense amount must be strictly greater than zero.", nameof(totalAmount));
        }

        // Default to all members if no splits specified
        var inputs = splitInputs.Count > 0
            ? splitInputs
            : defaultAllMemberIds.Select(id => new SplitInputDto(id)).ToList();

        if (inputs.Count == 0)
        {
            throw new InvalidOperationException("At least one trip participant must be assigned to the expense split.");
        }

        return splitType switch
        {
            SplitType.Equal => CalculateEqualSplits(totalAmount, inputs),
            SplitType.Unequal => CalculateUnequalSplits(totalAmount, inputs),
            SplitType.Percentage => CalculatePercentageSplits(totalAmount, inputs),
            SplitType.Shares => CalculateSharesSplits(totalAmount, inputs),
            _ => CalculateEqualSplits(totalAmount, inputs)
        };
    }

    private static IReadOnlyList<CalculatedSplit> CalculateEqualSplits(
        decimal totalAmount,
        IReadOnlyList<SplitInputDto> inputs)
    {
        int count = inputs.Count;
        decimal baseAmount = Math.Floor((totalAmount / count) * 100m) / 100m;
        decimal remainder = totalAmount - (baseAmount * count);
        int centsRemainder = (int)Math.Round(remainder * 100m, MidpointRounding.AwayFromZero);

        var result = new List<CalculatedSplit>(count);
        for (int i = 0; i < count; i++)
        {
            decimal share = baseAmount;
            if (i < centsRemainder)
            {
                share += 0.01m;
            }

            decimal percentage = Math.Round((share / totalAmount) * 100m, 2);
            result.Add(new CalculatedSplit(inputs[i].MemberId, share, percentage, 1));
        }

        return result;
    }

    private static IReadOnlyList<CalculatedSplit> CalculateUnequalSplits(
        decimal totalAmount,
        IReadOnlyList<SplitInputDto> inputs)
    {
        decimal totalAllocated = 0m;
        var result = new List<CalculatedSplit>(inputs.Count);

        foreach (var input in inputs)
        {
            decimal amount = input.AllocatedAmount ?? 0m;
            if (amount < 0)
            {
                throw new InvalidOperationException($"Negative allocated amounts are not permitted (Member: {input.MemberId}).");
            }

            totalAllocated += amount;
            decimal percentage = totalAmount > 0 ? Math.Round((amount / totalAmount) * 100m, 2) : 0m;
            result.Add(new CalculatedSplit(input.MemberId, amount, percentage, null));
        }

        if (Math.Abs(totalAllocated - totalAmount) > 0.01m)
        {
            throw new InvalidOperationException(
                $"Sum of unequal splits ({totalAllocated:F2}) must equal total expense amount ({totalAmount:F2}). " +
                $"Discrepancy: {Math.Abs(totalAllocated - totalAmount):F2}");
        }

        return result;
    }

    private static IReadOnlyList<CalculatedSplit> CalculatePercentageSplits(
        decimal totalAmount,
        IReadOnlyList<SplitInputDto> inputs)
    {
        decimal totalPercent = inputs.Sum(i => i.AllocatedPercentage ?? 0m);
        if (Math.Abs(totalPercent - 100.00m) > 0.05m)
        {
            throw new InvalidOperationException(
                $"Sum of split percentages ({totalPercent:F2}%) must equal exactly 100.00%.");
        }

        var preliminary = new List<(SplitInputDto Input, decimal Amount, decimal Percent)>();
        decimal sumCalculated = 0m;

        foreach (var input in inputs)
        {
            decimal percent = input.AllocatedPercentage ?? 0m;
            decimal amount = Math.Round((totalAmount * percent) / 100m, 2, MidpointRounding.AwayFromZero);
            sumCalculated += amount;
            preliminary.Add((input, amount, percent));
        }

        decimal remainder = totalAmount - sumCalculated;
        var result = new List<CalculatedSplit>(inputs.Count);

        // Allocate remainder cent(s) to the highest percentage participant
        int maxIndex = 0;
        decimal maxPercent = -1m;
        for (int i = 0; i < preliminary.Count; i++)
        {
            if (preliminary[i].Percent > maxPercent)
            {
                maxPercent = preliminary[i].Percent;
                maxIndex = i;
            }
        }

        for (int i = 0; i < preliminary.Count; i++)
        {
            var item = preliminary[i];
            decimal finalAmount = item.Amount;
            if (i == maxIndex)
            {
                finalAmount += remainder;
            }

            result.Add(new CalculatedSplit(item.Input.MemberId, finalAmount, item.Percent, null));
        }

        return result;
    }

    private static IReadOnlyList<CalculatedSplit> CalculateSharesSplits(
        decimal totalAmount,
        IReadOnlyList<SplitInputDto> inputs)
    {
        int totalShares = inputs.Sum(i => i.AllocatedShares.GetValueOrDefault(1));
        if (totalShares <= 0)
        {
            throw new InvalidOperationException("Total allocated shares across participants must be greater than zero.");
        }

        var preliminary = new List<(SplitInputDto Input, decimal Amount, int Shares)>();
        decimal sumCalculated = 0m;

        foreach (var input in inputs)
        {
            int shares = input.AllocatedShares.GetValueOrDefault(1);
            decimal amount = Math.Round((totalAmount * shares) / totalShares, 2, MidpointRounding.AwayFromZero);
            sumCalculated += amount;
            preliminary.Add((input, amount, shares));
        }

        decimal remainder = totalAmount - sumCalculated;
        var result = new List<CalculatedSplit>(inputs.Count);

        // Allocate remainder to highest shares participant
        int maxIndex = 0;
        int maxShares = -1;
        for (int i = 0; i < preliminary.Count; i++)
        {
            if (preliminary[i].Shares > maxShares)
            {
                maxShares = preliminary[i].Shares;
                maxIndex = i;
            }
        }

        for (int i = 0; i < preliminary.Count; i++)
        {
            var item = preliminary[i];
            decimal finalAmount = item.Amount;
            if (i == maxIndex)
            {
                finalAmount += remainder;
            }

            decimal percent = totalAmount > 0 ? Math.Round((finalAmount / totalAmount) * 100m, 2) : 0m;
            result.Add(new CalculatedSplit(item.Input.MemberId, finalAmount, percent, item.Shares));
        }

        return result;
    }
}
