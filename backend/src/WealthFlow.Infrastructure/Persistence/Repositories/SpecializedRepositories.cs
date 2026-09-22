using Microsoft.EntityFrameworkCore;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;
using WealthFlow.Infrastructure.Persistence;

namespace WealthFlow.Infrastructure.Persistence.Repositories;

/// <summary>
/// Specialized Account repository implementing queries using pure LINQ.
/// </summary>
public class AccountRepository : Repository<Account>, IAccountRepository
{
    public AccountRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<Account>> GetAccountsByUserAsync(Guid userId, bool includeArchived = false, CancellationToken cancellationToken = default)
    {
        var query = _dbSet
            .AsNoTracking()
            .Where(a => a.UserId == userId);

        if (!includeArchived)
        {
            query = query.Where(a => a.IsActive);
        }

        return await query
            .OrderBy(a => a.SortOrder)
            .ThenBy(a => a.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Account>> GetActiveAccountsByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await GetAccountsByUserAsync(userId, includeArchived: false, cancellationToken);
    }

    public async Task<decimal> GetTotalLiquidBalanceByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(a => a.UserId == userId && a.IsActive && (a.AccountType == AccountType.Bank || a.AccountType == AccountType.Cash || a.AccountType == AccountType.Wallet))
            .SumAsync(a => a.CurrentBalance, cancellationToken);
    }

    public async Task<bool> HasTransactionsAsync(Guid accountId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Transactions
            .AnyAsync(t => t.AccountId == accountId || t.LinkedEntityId == accountId, cancellationToken);
    }
}

/// <summary>
/// Specialized Category repository implementing queries using pure LINQ.
/// </summary>
public class CategoryRepository : Repository<Category>, ICategoryRepository
{
    public CategoryRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<Category>> GetCategoriesByUserAsync(Guid? userId, CancellationToken cancellationToken = default)
    {
        var query = _dbSet
            .AsNoTracking()
            .Where(c => c.IsActive);

        if (userId.HasValue)
        {
            query = query.Where(c => c.UserId == null || c.UserId == userId.Value);
        }
        else
        {
            query = query.Where(c => c.UserId == null);
        }

        return await query
            .OrderBy(c => c.ParentCategoryId)
            .ThenBy(c => c.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Category>> GetSubcategoriesAsync(Guid parentCategoryId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(c => c.ParentCategoryId == parentCategoryId && c.IsActive)
            .OrderBy(c => c.Name)
            .ToListAsync(cancellationToken);
    }
}

/// <summary>
/// Specialized Transaction repository implementing queries using pure LINQ.
/// </summary>
public class TransactionRepository : Repository<Transaction>, ITransactionRepository
{
    public TransactionRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<Transaction>> GetRecentTransactionsAsync(Guid userId, int count, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.TransactionDate)
            .Take(count)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Transaction>> GetByAccountAsync(Guid accountId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(t => t.AccountId == accountId)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> ExistsByIdempotencyKeyAsync(Guid idempotencyKey, CancellationToken cancellationToken = default)
    {
        return await _dbSet.AnyAsync(t => t.IdempotencyKey == idempotencyKey, cancellationToken);
    }

    public async Task<(IReadOnlyList<Transaction> Items, int TotalCount)> GetPagedTransactionsAsync(
        Guid userId,
        int page,
        int pageSize,
        DateTime? startDate = null,
        DateTime? endDate = null,
        Guid? accountId = null,
        Guid? categoryId = null,
        TransactionEventType? eventType = null,
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbSet
            .AsNoTracking()
            .Where(t => t.UserId == userId);

        if (startDate.HasValue)
        {
            query = query.Where(t => t.TransactionDate >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(t => t.TransactionDate <= endDate.Value);
        }

        if (accountId.HasValue)
        {
            query = query.Where(t => t.AccountId == accountId.Value || t.LinkedEntityId == accountId.Value);
        }

        if (categoryId.HasValue)
        {
            query = query.Where(t => t.CategoryId == categoryId.Value);
        }

        if (eventType.HasValue)
        {
            query = query.Where(t => t.EventType == eventType.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            query = query.Where(t => t.Description.ToLower().Contains(searchLower) || (t.Merchant != null && t.Merchant.ToLower().Contains(searchLower)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var safePage = page < 1 ? 1 : page;
        var safePageSize = pageSize < 1 ? 20 : (pageSize > 100 ? 100 : pageSize);

        var items = await query
            .OrderByDescending(t => t.TransactionDate)
            .ThenByDescending(t => t.CreatedAtUtc)
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<IReadOnlyDictionary<Guid, decimal>> GetMonthlyCategorySpendingAsync(
        Guid userId,
        int year,
        int month,
        CancellationToken cancellationToken = default)
    {
        var startDate = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var endDate = startDate.AddMonths(1);

        var spending = await _dbSet
            .AsNoTracking()
            .Where(t => t.UserId == userId
                && t.EventType == TransactionEventType.Expense
                && t.CategoryId != null
                && t.TransactionDate >= startDate
                && t.TransactionDate < endDate)
            .GroupBy(t => t.CategoryId!.Value)
            .Select(g => new { CategoryId = g.Key, TotalAmount = g.Sum(t => t.Amount) })
            .ToListAsync(cancellationToken);

        return spending.ToDictionary(x => x.CategoryId, x => x.TotalAmount);
    }
}

/// <summary>
/// Specialized Budget repository implementing queries using pure LINQ.
/// </summary>
public class BudgetRepository : Repository<Budget>, IBudgetRepository
{
    public BudgetRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<Budget>> GetBudgetsByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(b => b.UserId == userId && b.IsActive)
            .OrderBy(b => b.CategoryId)
            .ToListAsync(cancellationToken);
    }

    public async Task<Budget?> GetBudgetByCategoryAsync(Guid userId, Guid categoryId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.UserId == userId && b.CategoryId == categoryId && b.IsActive, cancellationToken);
    }
}

/// <summary>
/// Specialized Trip repository implementing queries using pure LINQ.
/// </summary>
public class TripRepository : Repository<Trip>, ITripRepository
{
    public TripRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<Trip>> GetTripsByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(t => t.HostUserId == userId)
            .OrderByDescending(t => t.StartDate)
            .ToListAsync(cancellationToken);
    }
}

/// <summary>
/// Specialized SIP repository implementing queries using pure LINQ.
/// </summary>
public class SipRepository : Repository<SIP>, ISipRepository
{
    public SipRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<SIP>> GetActiveSipsByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == SipStatus.Active)
            .OrderBy(s => s.ExecutionDay)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SIP>> GetJointSipsByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.IsJoint)
            .OrderBy(s => s.Name)
            .ToListAsync(cancellationToken);
    }
}
