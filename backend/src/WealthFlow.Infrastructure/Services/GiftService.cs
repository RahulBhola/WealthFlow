using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Gifts.DTOs;
using WealthFlow.Application.Features.Gifts.Interfaces;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Infrastructure.Services;

public class GiftService : IGiftService
{
    private readonly IUnitOfWork _unitOfWork;

    public GiftService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<GiftSummaryDto> GetGiftSummaryAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var gifts = await _unitOfWork.Gifts.GetGiftsByUserAsync(userId, cancellationToken);
        var accounts = await _unitOfWork.Accounts.GetAccountsByUserAsync(userId, true, cancellationToken);
        var accountMap = accounts.ToDictionary(a => a.Id, a => a.Name);

        var totalGiven = gifts.Where(g => g.Direction == GiftDirection.Given).Sum(g => g.Amount);
        var totalReceived = gifts.Where(g => g.Direction == GiftDirection.Received).Sum(g => g.Amount);
        var netFlow = totalReceived - totalGiven;

        var dtos = gifts.Select(g => MapToDto(g, accountMap)).ToList();

        return new GiftSummaryDto(
            TotalGiftsGiven: totalGiven,
            TotalGiftsReceived: totalReceived,
            NetGiftFlow: netFlow,
            TotalGiftsCount: gifts.Count,
            Gifts: dtos
        );
    }

    public async Task<IReadOnlyList<GiftDto>> GetGiftsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var summary = await GetGiftSummaryAsync(userId, cancellationToken);
        return summary.Gifts;
    }

    public async Task<GiftDto> CreateGiftAsync(Guid userId, CreateGiftRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RecipientOrGiver))
        {
            throw new ArgumentException("Recipient or Giver name is required.", nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.Occasion))
        {
            throw new ArgumentException("Occasion is required.", nameof(request));
        }

        if (request.Amount <= 0)
        {
            throw new ArgumentException("Gift amount must be greater than zero.", nameof(request));
        }

        if (!Enum.TryParse<GiftDirection>(request.Direction, true, out var direction))
        {
            throw new ArgumentException($"Invalid gift direction: {request.Direction}. Must be 'Given' or 'Received'.", nameof(request));
        }

        var account = await _unitOfWork.Accounts.GetByIdAsync(request.AccountId, cancellationToken);
        if (account == null || account.UserId != userId)
        {
            throw new KeyNotFoundException($"Account with ID {request.AccountId} was not found.");
        }

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var dateUtc = request.Date.Kind == DateTimeKind.Utc
                ? request.Date
                : DateTime.SpecifyKind(request.Date, DateTimeKind.Utc);

            var isGiven = direction == GiftDirection.Given;
            var description = isGiven
                ? $"Gift to {request.RecipientOrGiver} ({request.Occasion})"
                : $"Gift from {request.RecipientOrGiver} ({request.Occasion})";

            // Atomically update account balance
            if (isGiven)
            {
                account.AdjustBalance(-request.Amount);
            }
            else
            {
                account.AdjustBalance(request.Amount);
            }

            var transaction = new Transaction(
                userId: userId,
                accountId: account.Id,
                amount: request.Amount,
                transactionDate: dateUtc,
                eventType: TransactionEventType.Gift,
                description: description,
                notes: request.Notes
            );

            await _unitOfWork.Transactions.AddAsync(transaction, cancellationToken);

            var gift = new Gift(
                userId: userId,
                direction: direction,
                recipientOrGiver: request.RecipientOrGiver.Trim(),
                occasion: request.Occasion.Trim(),
                amount: request.Amount,
                accountId: account.Id,
                date: dateUtc,
                notes: request.Notes?.Trim(),
                transactionId: transaction.Id
            );

            await _unitOfWork.Gifts.AddAsync(gift, cancellationToken);

            await _unitOfWork.CommitTransactionAsync(cancellationToken);

            var accounts = await _unitOfWork.Accounts.GetAccountsByUserAsync(userId, true, cancellationToken);
            var accountMap = accounts.ToDictionary(a => a.Id, a => a.Name);
            return MapToDto(gift, accountMap);
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync(cancellationToken);
            throw;
        }
    }

    public async Task DeleteGiftAsync(Guid userId, Guid giftId, CancellationToken cancellationToken = default)
    {
        var gift = await _unitOfWork.Gifts.GetByIdAsync(giftId, cancellationToken);
        if (gift == null || gift.UserId != userId)
        {
            throw new KeyNotFoundException($"Gift with ID {giftId} was not found.");
        }

        await _unitOfWork.Gifts.DeleteAsync(gift, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static GiftDto MapToDto(Gift gift, IReadOnlyDictionary<Guid, string> accountMap)
    {
        accountMap.TryGetValue(gift.AccountId, out var accountName);

        return new GiftDto(
            Id: gift.Id,
            Direction: gift.Direction.ToString(),
            RecipientOrGiver: gift.RecipientOrGiver,
            Occasion: gift.Occasion,
            Amount: gift.Amount,
            AccountId: gift.AccountId,
            AccountName: accountName,
            Date: gift.Date,
            Notes: gift.Notes,
            TransactionId: gift.TransactionId,
            CreatedAtUtc: gift.CreatedAtUtc
        );
    }
}
