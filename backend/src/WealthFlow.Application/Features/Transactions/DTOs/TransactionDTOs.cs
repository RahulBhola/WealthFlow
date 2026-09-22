namespace WealthFlow.Application.Features.Transactions.DTOs;

public record CreateTransactionRequest(
    Guid AccountId,
    decimal Amount,
    string EventType,
    DateTime TransactionDate,
    string Description,
    Guid? CategoryId = null,
    Guid? TargetAccountId = null,
    string? Merchant = null,
    string? Notes = null,
    string? Tags = null,
    Guid? IdempotencyKey = null
);

public record UpdateTransactionRequest(
    Guid AccountId,
    decimal Amount,
    string EventType,
    DateTime TransactionDate,
    string Description,
    Guid? CategoryId = null,
    Guid? TargetAccountId = null,
    string? Merchant = null,
    string? Notes = null,
    string? Tags = null
);

public record TransactionDto(
    Guid Id,
    Guid UserId,
    Guid AccountId,
    string AccountName,
    Guid? CategoryId,
    string? CategoryName,
    decimal Amount,
    DateTime TransactionDate,
    string EventType,
    string Description,
    string? Merchant,
    string? Notes,
    string? Tags,
    Guid? TargetAccountId,
    string? TargetAccountName,
    Guid IdempotencyKey,
    string SyncStatus,
    DateTime CreatedAtUtc
);

public record TransactionSummaryDto(
    decimal TotalInflows,
    decimal TotalOutflows,
    decimal NetCashFlow,
    int TotalCount
);

public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);
