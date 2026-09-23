namespace WealthFlow.Application.Features.Gifts.DTOs;

public record GiftDto(
    Guid Id,
    string Direction,
    string RecipientOrGiver,
    string Occasion,
    decimal Amount,
    Guid AccountId,
    string? AccountName,
    DateTime Date,
    string? Notes,
    Guid? TransactionId,
    DateTime CreatedAtUtc
);

public record GiftSummaryDto(
    decimal TotalGiftsGiven,
    decimal TotalGiftsReceived,
    decimal NetGiftFlow,
    int TotalGiftsCount,
    IReadOnlyList<GiftDto> Gifts
);

public record CreateGiftRequest(
    string Direction,
    string RecipientOrGiver,
    string Occasion,
    decimal Amount,
    Guid AccountId,
    DateTime Date,
    string? Notes = null
);
