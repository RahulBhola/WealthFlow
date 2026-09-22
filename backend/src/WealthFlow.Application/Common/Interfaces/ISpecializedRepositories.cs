using WealthFlow.Domain.Entities;

namespace WealthFlow.Application.Common.Interfaces;

/// <summary>
/// Specialized repository contract for Account domain entities.
/// </summary>
public interface IAccountRepository : IRepository<Account>
{
    Task<IReadOnlyList<Account>> GetAccountsByUserAsync(Guid userId, bool includeArchived = false, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Account>> GetActiveAccountsByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<decimal> GetTotalLiquidBalanceByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> HasTransactionsAsync(Guid accountId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Specialized repository contract for Category domain entities.
/// </summary>
public interface ICategoryRepository : IRepository<Category>
{
    Task<IReadOnlyList<Category>> GetCategoriesByUserAsync(Guid? userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Category>> GetSubcategoriesAsync(Guid parentCategoryId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Specialized repository contract for Transaction ledger entities.
/// </summary>
public interface ITransactionRepository : IRepository<Transaction>
{
    Task<IReadOnlyList<Transaction>> GetRecentTransactionsAsync(Guid userId, int count, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Transaction>> GetByAccountAsync(Guid accountId, CancellationToken cancellationToken = default);
    Task<bool> ExistsByIdempotencyKeyAsync(Guid idempotencyKey, CancellationToken cancellationToken = default);
}

/// <summary>
/// Specialized repository contract for collaborative Trip entities.
/// </summary>
public interface ITripRepository : IRepository<Trip>
{
    Task<IReadOnlyList<Trip>> GetTripsByUserAsync(Guid userId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Specialized repository contract for Systematic Investment Plans (SIPs).
/// </summary>
public interface ISipRepository : IRepository<SIP>
{
    Task<IReadOnlyList<SIP>> GetActiveSipsByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SIP>> GetJointSipsByUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
