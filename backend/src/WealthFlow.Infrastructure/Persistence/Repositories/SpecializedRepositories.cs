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
/// Specialized TripMember repository implementing queries using pure LINQ.
/// </summary>
public class TripMemberRepository : Repository<TripMember>, ITripMemberRepository
{
    public TripMemberRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<TripMember>> GetMembersByTripAsync(Guid tripId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(m => m.TripId == tripId)
            .OrderBy(m => m.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<TripMember?> GetMemberByGuestTokenHashAsync(Guid tripId, string tokenHash, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .FirstOrDefaultAsync(m => m.TripId == tripId && m.GuestSecureTokenHash == tokenHash, cancellationToken);
    }
}

/// <summary>
/// Specialized TripExpense repository implementing queries using pure LINQ.
/// </summary>
public class TripExpenseRepository : Repository<TripExpense>, ITripExpenseRepository
{
    public TripExpenseRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<TripExpense>> GetExpensesByTripAsync(Guid tripId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(e => e.TripId == tripId)
            .OrderByDescending(e => e.ExpenseDate)
            .ToListAsync(cancellationToken);
    }
}

/// <summary>
/// Specialized TripExpenseSplit repository implementing queries using pure LINQ.
/// </summary>
public class TripExpenseSplitRepository : Repository<TripExpenseSplit>, ITripExpenseSplitRepository
{
    public TripExpenseSplitRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<TripExpenseSplit>> GetSplitsByExpenseAsync(Guid expenseId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(s => s.TripExpenseId == expenseId)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<TripExpenseSplit>> GetSplitsByTripAsync(Guid tripId, CancellationToken cancellationToken = default)
    {
        return await (from s in _dbContext.TripExpenseSplits
                      join e in _dbContext.TripExpenses on s.TripExpenseId equals e.Id
                      where e.TripId == tripId
                      select s)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }
}

/// <summary>
/// Specialized TripAdvance repository implementing queries using pure LINQ.
/// </summary>
public class TripAdvanceRepository : Repository<TripAdvance>, ITripAdvanceRepository
{
    public TripAdvanceRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<TripAdvance>> GetAdvancesByTripAsync(Guid tripId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(a => a.TripId == tripId)
            .OrderByDescending(a => a.AdvanceDate)
            .ToListAsync(cancellationToken);
    }
}

/// <summary>
/// Specialized TripSettlement repository implementing queries using pure LINQ.
/// </summary>
public class TripSettlementRepository : Repository<TripSettlement>, ITripSettlementRepository
{
    public TripSettlementRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<TripSettlement>> GetSettlementsByTripAsync(Guid tripId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(s => s.TripId == tripId)
            .OrderByDescending(s => s.SettledAtUtc)
            .ToListAsync(cancellationToken);
    }
}


/// <summary>
/// Specialized SIP repository implementing queries using pure LINQ.
/// </summary>
public class SipRepository : Repository<SIP>, ISipRepository
{
    public SipRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<SIP>> GetSipsByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.ExecutionDay)
            .ToListAsync(cancellationToken);
    }

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
            .Where(s => s.UserId == userId && s.IsJoint)
            .OrderBy(s => s.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<SIP?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, cancellationToken);
    }

    public async Task<IReadOnlyList<SIP>> GetDueSipsAsync(int executionDay, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(s => s.Status == SipStatus.Active && s.ExecutionDay == executionDay)
            .ToListAsync(cancellationToken);
    }
}

/// <summary>
/// Specialized Investment repository implementing queries using pure LINQ.
/// </summary>
public class InvestmentRepository : Repository<Investment>, IInvestmentRepository
{
    public InvestmentRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<Investment>> GetInvestmentsByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(i => i.UserId == userId)
            .OrderBy(i => i.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Investment?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId, cancellationToken);
    }
}

/// <summary>
/// Specialized JointSipReconciliation repository implementing queries using pure LINQ.
/// </summary>
public class JointSipReconciliationRepository : Repository<JointSipReconciliation>, IJointSipReconciliationRepository
{
    public JointSipReconciliationRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<JointSipReconciliation>> GetReconciliationsBySipAsync(Guid sipId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(r => r.SIPId == sipId)
            .OrderByDescending(r => r.Year)
            .ThenByDescending(r => r.Month)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<JointSipReconciliation>> GetReconciliationsByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.Year)
            .ThenByDescending(r => r.Month)
            .ToListAsync(cancellationToken);
    }

    public async Task<JointSipReconciliation?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId, cancellationToken);
    }
}


/// <summary>
/// Specialized CreditCard repository implementing queries using pure LINQ.
/// </summary>
public class CreditCardRepository : Repository<CreditCard>, ICreditCardRepository
{
    public CreditCardRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<CreditCard>> GetCreditCardsByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.CardName)
            .ToListAsync(cancellationToken);
    }

    public async Task<CreditCard?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId, cancellationToken);
    }
}

/// <summary>
/// Specialized Loan repository implementing queries using pure LINQ.
/// </summary>
public class LoanRepository : Repository<Loan>, ILoanRepository
{
    public LoanRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<Loan>> GetLoansByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(l => l.Repayments)
            .Where(l => l.UserId == userId)
            .OrderByDescending(l => l.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<Loan?> GetByIdWithRepaymentsAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(l => l.Repayments)
            .FirstOrDefaultAsync(l => l.Id == id && l.UserId == userId, cancellationToken);
    }
}

/// <summary>
/// Specialized Gift repository implementing queries using pure LINQ.
/// </summary>
public class GiftRepository : Repository<Gift>, IGiftRepository
{
    public GiftRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<Gift>> GetGiftsByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(g => g.UserId == userId)
            .OrderByDescending(g => g.Date)
            .ToListAsync(cancellationToken);
    }
}

/// <summary>
/// Specialized SyncOperationLog repository implementing pure LINQ queries for background sync, idempotency, and conflicts.
/// </summary>
public class SyncOperationLogRepository : Repository<SyncOperationLog>, ISyncOperationLogRepository
{
    public SyncOperationLogRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<SyncOperationLog?> GetByIdempotencyKeyAsync(Guid idempotencyKey, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .FirstOrDefaultAsync(s => s.IdempotencyKey == idempotencyKey, cancellationToken);
    }

    public async Task<IReadOnlyList<SyncOperationLog>> GetConflictLogsByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(s => s.UserId == userId && s.Status == "Conflict")
            .OrderByDescending(s => s.ServerTimestampUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SyncOperationLog>> GetRecentLogsAsync(int count, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .OrderByDescending(s => s.ServerTimestampUtc)
            .Take(count)
            .ToListAsync(cancellationToken);
    }

    public async Task<(int TotalProcessedToday, int ConflictCountToday, int DeadLetterCount)> GetTelemetryStatsAsync(CancellationToken cancellationToken = default)
    {
        var todayUtc = DateTime.UtcNow.Date;
        var totalToday = await _dbSet.CountAsync(s => s.ServerTimestampUtc >= todayUtc, cancellationToken);
        var conflictToday = await _dbSet.CountAsync(s => s.ServerTimestampUtc >= todayUtc && s.Status == "Conflict", cancellationToken);
        var deadLetter = await _dbSet.CountAsync(s => s.Status == "Failed", cancellationToken);

        return (totalToday, conflictToday, deadLetter);
    }
}

/// <summary>
/// Specialized AuditLog repository implementing filtering, pagination, and telemetry queries.
/// </summary>
public class AuditLogRepository : Repository<AuditLog>, IAuditLogRepository
{
    public AuditLogRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<(IReadOnlyList<AuditLog> Items, int TotalCount)> GetPagedAuditLogsAsync(
        int page,
        int pageSize,
        string? entityName = null,
        string? action = null,
        Guid? userId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbSet.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityName))
        {
            query = query.Where(a => a.EntityName.ToLower() == entityName.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(a => a.Action.ToUpper() == action.ToUpper());
        }

        if (userId.HasValue && userId.Value != Guid.Empty)
        {
            query = query.Where(a => a.UserId == userId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(a => a.TimestampUtc >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(a => a.TimestampUtc <= endDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(a =>
                a.EntityName.ToLower().Contains(s) ||
                a.Action.ToLower().Contains(s) ||
                (a.IpAddress != null && a.IpAddress.ToLower().Contains(s)) ||
                (a.NewValuesJson != null && a.NewValuesJson.ToLower().Contains(s)) ||
                (a.OldValuesJson != null && a.OldValuesJson.ToLower().Contains(s)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(a => a.TimestampUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<IReadOnlyList<AuditLog>> GetRecentLogsAsync(int count, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .OrderByDescending(a => a.TimestampUtc)
            .Take(count)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> GetTodayCountAsync(CancellationToken cancellationToken = default)
    {
        var todayUtc = DateTime.UtcNow.Date;
        return await _dbSet.CountAsync(a => a.TimestampUtc >= todayUtc, cancellationToken);
    }
}

/// <summary>
/// Specialized Attachment repository implementing queries using pure LINQ.
/// </summary>
public class AttachmentRepository : Repository<Attachment>, IAttachmentRepository
{
    public AttachmentRepository(ApplicationDbContext dbContext) : base(dbContext) { }

    public async Task<IReadOnlyList<Attachment>> GetByEntityAsync(
        string linkedEntityType,
        Guid linkedEntityId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(a => a.UserId == userId && a.LinkedEntityType == linkedEntityType && a.LinkedEntityId == linkedEntityId)
            .OrderByDescending(a => a.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<Attachment?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, cancellationToken);
    }
}

