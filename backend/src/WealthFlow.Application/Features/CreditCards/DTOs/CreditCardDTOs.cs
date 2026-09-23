namespace WealthFlow.Application.Features.CreditCards.DTOs;

public record CreditCardDto(
    Guid Id,
    string CardName,
    string BankName,
    string MaskedNumber,
    string Last4Digits,
    decimal CreditLimit,
    decimal CurrentBalance,
    decimal AvailableCredit,
    decimal UtilizationPercentage,
    int BillingCycleDay,
    int DueDay,
    int DaysUntilDue,
    bool IsOverdue,
    string AlertSeverity,
    string ColorTag,
    bool IsActive,
    DateTime CreatedAtUtc
);

public record CreditCardSummaryDto(
    decimal TotalCreditLimit,
    decimal TotalCurrentBalance,
    decimal TotalAvailableCredit,
    decimal OverallUtilizationPercentage,
    int ActiveCardCount,
    IReadOnlyList<CreditCardDto> Cards
);

public record CreateCreditCardRequest(
    string CardName,
    string BankName,
    decimal CreditLimit,
    int BillingCycleDay,
    int DueDay,
    string Last4Digits,
    string? ColorTag = null
);

public record UpdateCreditCardRequest(
    string CardName,
    string BankName,
    decimal CreditLimit,
    int BillingCycleDay,
    int DueDay,
    string? ColorTag = null
);

public record PayCreditCardBillRequest(
    Guid SourceAccountId,
    decimal Amount,
    DateTime PaymentDate,
    string? Notes = null
);

public record CreditCardBillPaymentResponse(
    Guid TransactionId,
    Guid CreditCardId,
    Guid SourceAccountId,
    decimal PaidAmount,
    decimal RemainingBalance,
    decimal UpdatedSourceAccountBalance,
    DateTime PaymentDateUtc
);
