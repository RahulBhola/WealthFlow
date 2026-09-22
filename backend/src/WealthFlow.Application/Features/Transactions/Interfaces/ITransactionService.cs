using WealthFlow.Application.Features.Transactions.DTOs;

namespace WealthFlow.Application.Features.Transactions.Interfaces;

/// <summary>
/// Application service contract for transactional ledger operations, transfers, and balance mutation atomicity.
/// </summary>
public interface ITransactionService
{
    Task<PagedResult<TransactionDto>> GetTransactionsAsync(
        Guid userId,
        int page = 1,
        int pageSize = 20,
        DateTime? startDate = null,
        DateTime? endDate = null,
        Guid? accountId = null,
        Guid? categoryId = null,
        string? eventType = null,
        string? search = null,
        CancellationToken cancellationToken = default);

    Task<TransactionDto?> GetTransactionByIdAsync(
        Guid userId,
        Guid id,
        CancellationToken cancellationToken = default);

    Task<TransactionDto> CreateTransactionAsync(
        Guid userId,
        CreateTransactionRequest request,
        CancellationToken cancellationToken = default);

    Task<TransactionDto> UpdateTransactionAsync(
        Guid userId,
        Guid id,
        UpdateTransactionRequest request,
        CancellationToken cancellationToken = default);

    Task DeleteTransactionAsync(
        Guid userId,
        Guid id,
        CancellationToken cancellationToken = default);

    Task<TransactionSummaryDto> GetSummaryAsync(
        Guid userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default);
}
