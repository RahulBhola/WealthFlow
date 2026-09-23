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
    Task<(IReadOnlyList<Transaction> Items, int TotalCount)> GetPagedTransactionsAsync(
        Guid userId,
        int page,
        int pageSize,
        DateTime? startDate = null,
        DateTime? endDate = null,
        Guid? accountId = null,
        Guid? categoryId = null,
        WealthFlow.Domain.Enums.TransactionEventType? eventType = null,
        string? search = null,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<Guid, decimal>> GetMonthlyCategorySpendingAsync(
        Guid userId,
        int year,
        int month,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Specialized repository contract for Budget threshold entities.
/// </summary>
public interface IBudgetRepository : IRepository<Budget>
{
    Task<IReadOnlyList<Budget>> GetBudgetsByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Budget?> GetBudgetByCategoryAsync(Guid userId, Guid categoryId, CancellationToken cancellationToken = default);
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

/// <summary>
/// Specialized repository contract for Credit Card facilities.
/// </summary>
public interface ICreditCardRepository : IRepository<CreditCard>
{
    Task<IReadOnlyList<CreditCard>> GetCreditCardsByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<CreditCard?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Specialized repository contract for Bilateral Loan obligations.
/// </summary>
public interface ILoanRepository : IRepository<Loan>
{
    Task<IReadOnlyList<Loan>> GetLoansByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Loan?> GetByIdWithRepaymentsAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Specialized repository contract for Gift tracking.
/// </summary>
public interface IGiftRepository : IRepository<Gift>
{
    Task<IReadOnlyList<Gift>> GetGiftsByUserAsync(Guid userId, CancellationToken cancellationToken = default);
}

