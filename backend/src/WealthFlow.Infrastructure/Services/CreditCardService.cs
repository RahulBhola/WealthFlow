using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.CreditCards.DTOs;
using WealthFlow.Application.Features.CreditCards.Interfaces;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Infrastructure.Services;

public class CreditCardService : ICreditCardService
{
    private readonly IUnitOfWork _unitOfWork;

    public CreditCardService(IUnitOfWork _unitOfWork)
    {
        this._unitOfWork = _unitOfWork;
    }

    public async Task<CreditCardSummaryDto> GetCreditCardSummaryAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var cards = await _unitOfWork.CreditCards.GetCreditCardsByUserAsync(userId, cancellationToken);
        var cardDtos = cards.Select(MapToDto).ToList();

        var totalLimit = cards.Sum(c => c.CreditLimit);
        var totalBalance = cards.Sum(c => c.CurrentOutstanding);
        var totalAvailable = cards.Sum(c => c.AvailableCredit);
        var overallUtilization = totalLimit > 0m
            ? Math.Round((totalBalance / totalLimit) * 100m, 2)
            : 0m;

        return new CreditCardSummaryDto(
            TotalCreditLimit: totalLimit,
            TotalCurrentBalance: totalBalance,
            TotalAvailableCredit: totalAvailable,
            OverallUtilizationPercentage: overallUtilization,
            ActiveCardCount: cards.Count(c => c.IsActive),
            Cards: cardDtos
        );
    }

    public async Task<IReadOnlyList<CreditCardDto>> GetCreditCardsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var cards = await _unitOfWork.CreditCards.GetCreditCardsByUserAsync(userId, cancellationToken);
        return cards.Select(MapToDto).ToList();
    }

    public async Task<CreditCardDto> GetCreditCardByIdAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default)
    {
        var card = await _unitOfWork.CreditCards.GetByIdAsync(cardId, userId, cancellationToken);
        if (card == null)
        {
            throw new KeyNotFoundException($"Credit card with ID {cardId} was not found.");
        }

        return MapToDto(card);
    }

    public async Task<CreditCardDto> CreateCreditCardAsync(Guid userId, CreateCreditCardRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.CardName))
        {
            throw new ArgumentException("Card name is required.", nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.BankName))
        {
            throw new ArgumentException("Bank/Issuer name is required.", nameof(request));
        }

        if (request.CreditLimit <= 0)
        {
            throw new ArgumentException("Credit limit must be greater than zero.", nameof(request));
        }

        var card = new CreditCard(
            userId: userId,
            cardName: request.CardName.Trim(),
            issuer: request.BankName.Trim(),
            last4Digits: request.Last4Digits?.Trim() ?? string.Empty,
            creditLimit: request.CreditLimit,
            billingCycleDay: request.BillingCycleDay,
            dueDay: request.DueDay,
            colorTag: request.ColorTag
        );

        await _unitOfWork.CreditCards.AddAsync(card, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(card);
    }

    public async Task<CreditCardDto> UpdateCreditCardAsync(Guid userId, Guid cardId, UpdateCreditCardRequest request, CancellationToken cancellationToken = default)
    {
        var card = await _unitOfWork.CreditCards.GetByIdAsync(cardId, userId, cancellationToken);
        if (card == null)
        {
            throw new KeyNotFoundException($"Credit card with ID {cardId} was not found.");
        }

        card.UpdateDetails(
            cardName: request.CardName.Trim(),
            issuer: request.BankName.Trim(),
            creditLimit: request.CreditLimit,
            billingCycleDay: request.BillingCycleDay,
            dueDay: request.DueDay,
            colorTag: request.ColorTag
        );

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapToDto(card);
    }

    public async Task<CreditCardBillPaymentResponse> PayBillAsync(Guid userId, Guid cardId, PayCreditCardBillRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Amount <= 0)
        {
            throw new ArgumentException("Payment amount must be greater than zero.", nameof(request));
        }

        var card = await _unitOfWork.CreditCards.GetByIdAsync(cardId, userId, cancellationToken);
        if (card == null)
        {
            throw new KeyNotFoundException($"Credit card with ID {cardId} was not found.");
        }

        var sourceAccount = await _unitOfWork.Accounts.GetByIdAsync(request.SourceAccountId, cancellationToken);
        if (sourceAccount == null || sourceAccount.UserId != userId)
        {
            throw new KeyNotFoundException($"Source account with ID {request.SourceAccountId} was not found.");
        }

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            // Atomically debit bank account asset
            sourceAccount.AdjustBalance(-request.Amount);

            // Atomically decrease credit card liability
            card.RecordPayment(request.Amount);

            // Record transaction: Financial Event 11 (CreditCardPayment) - Net-zero P&L impact (debt settlement)
            var paymentDateUtc = request.PaymentDate.Kind == DateTimeKind.Utc 
                ? request.PaymentDate 
                : DateTime.SpecifyKind(request.PaymentDate, DateTimeKind.Utc);

            var transaction = new Transaction(
                userId: userId,
                accountId: sourceAccount.Id,
                amount: request.Amount,
                transactionDate: paymentDateUtc,
                eventType: TransactionEventType.CreditCardPayment,
                description: $"Credit Card Bill Payment - {card.CardName}",
                merchant: card.BankName,
                notes: request.Notes,
                linkedEntityId: card.Id
            );

            await _unitOfWork.Transactions.AddAsync(transaction, cancellationToken);

            await _unitOfWork.CommitTransactionAsync(cancellationToken);

            return new CreditCardBillPaymentResponse(
                TransactionId: transaction.Id,
                CreditCardId: card.Id,
                SourceAccountId: sourceAccount.Id,
                PaidAmount: request.Amount,
                RemainingBalance: card.CurrentOutstanding,
                UpdatedSourceAccountBalance: sourceAccount.CurrentBalance,
                PaymentDateUtc: paymentDateUtc
            );
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync(cancellationToken);
            throw;
        }
    }

    public async Task DeleteCreditCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default)
    {
        var card = await _unitOfWork.CreditCards.GetByIdAsync(cardId, userId, cancellationToken);
        if (card == null)
        {
            throw new KeyNotFoundException($"Credit card with ID {cardId} was not found.");
        }

        await _unitOfWork.CreditCards.DeleteAsync(card, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static CreditCardDto MapToDto(CreditCard card)
    {
        var now = DateTime.UtcNow;
        var (daysUntilDue, isOverdue, severity) = CalculateDueDateAlert(card.DueDay, card.CurrentOutstanding, now);

        return new CreditCardDto(
            Id: card.Id,
            CardName: card.CardName,
            BankName: card.Issuer,
            MaskedNumber: card.MaskedNumber,
            Last4Digits: card.Last4Digits,
            CreditLimit: card.CreditLimit,
            CurrentBalance: card.CurrentOutstanding,
            AvailableCredit: card.AvailableCredit,
            UtilizationPercentage: card.UtilizationPercentage,
            BillingCycleDay: card.BillingCycleDay,
            DueDay: card.DueDay,
            DaysUntilDue: daysUntilDue,
            IsOverdue: isOverdue,
            AlertSeverity: severity.ToString(),
            ColorTag: card.ColorTag,
            IsActive: card.IsActive,
            CreatedAtUtc: card.CreatedAtUtc
        );
    }

    private static (int DaysUntilDue, bool IsOverdue, CreditCardAlertSeverity Severity) CalculateDueDateAlert(int dueDay, decimal currentBalance, DateTime now)
    {
        var daysInMonth = DateTime.DaysInMonth(now.Year, now.Month);
        var targetDueDay = Math.Min(dueDay, daysInMonth);
        var thisMonthDueDate = new DateTime(now.Year, now.Month, targetDueDay, 23, 59, 59, DateTimeKind.Utc);

        DateTime nextDueDate;
        if (now <= thisMonthDueDate)
        {
            nextDueDate = thisMonthDueDate;
        }
        else
        {
            var nextMonth = now.AddMonths(1);
            var nextMonthDays = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month);
            nextDueDate = new DateTime(nextMonth.Year, nextMonth.Month, Math.Min(dueDay, nextMonthDays), 23, 59, 59, DateTimeKind.Utc);
        }

        var diff = (nextDueDate.Date - now.Date).Days;

        if (diff < 0 && currentBalance > 0)
        {
            return (diff, true, CreditCardAlertSeverity.Overdue);
        }

        if (diff <= 2)
        {
            return (diff, false, CreditCardAlertSeverity.Critical);
        }

        if (diff <= 7)
        {
            return (diff, false, CreditCardAlertSeverity.Warning);
        }

        return (diff, false, CreditCardAlertSeverity.Normal);
    }
}
