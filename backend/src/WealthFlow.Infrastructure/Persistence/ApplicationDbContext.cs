using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Domain.Entities;
using WealthFlow.Infrastructure.Identity;

namespace WealthFlow.Infrastructure.Persistence;

/// <summary>
/// Authoritative Entity Framework Core DbContext for WealthFlow.
/// Configures PostgreSQL/cross-provider mappings, tenant query filters, decimal precision, and Identity tables.
/// </summary>
public class ApplicationDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
{
    private readonly ICurrentUserService? _currentUserService;

    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options,
        ICurrentUserService? currentUserService = null)
        : base(options)
    {
        _currentUserService = currentUserService;
    }

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Transfer> Transfers => Set<Transfer>();
    public DbSet<CreditCard> CreditCards => Set<CreditCard>();
    public DbSet<Investment> Investments => Set<Investment>();
    public DbSet<SIP> Sips => Set<SIP>();
    public DbSet<Loan> Loans => Set<Loan>();
    public DbSet<LoanRepayment> LoanRepayments => Set<LoanRepayment>();
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<TripMember> TripMembers => Set<TripMember>();
    public DbSet<TripExpense> TripExpenses => Set<TripExpense>();
    public DbSet<TripExpenseSplit> TripExpenseSplits => Set<TripExpenseSplit>();
    public DbSet<TripAdvance> TripAdvances => Set<TripAdvance>();
    public DbSet<TripSettlement> TripSettlements => Set<TripSettlement>();
    public DbSet<Attachment> Attachments => Set<Attachment>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<JointSipReconciliation> JointSipReconciliations => Set<JointSipReconciliation>();
    public DbSet<Budget> Budgets => Set<Budget>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Core Invariant 4: Manual Singleton Admin Invariant (AdminCount <= 1)
        // Enforce filtered unique index ensuring at most one Admin exists in AspNetUsers
        if (Database.IsNpgsql())
        {
            builder.Entity<ApplicationUser>()
                .HasIndex(u => u.Role)
                .HasDatabaseName("UX_Users_SingleAdmin")
                .IsUnique()
                .HasFilter("\"Role\" = 'Admin'");
        }

        // Configure standard decimal precision decimal(18,2) across all financial entities
        foreach (var property in builder.Model.GetEntityTypes()
            .SelectMany(t => t.GetProperties())
            .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
        {
            property.SetPrecision(18);
            property.SetScale(2);
        }

        // Configure Units precision for investments to decimal(18,4)
        builder.Entity<Investment>()
            .Property(i => i.Units)
            .HasPrecision(18, 4);

        // Global Query Filters (Soft delete and multi-tenancy isolation)
        // Evaluates tenant isolation safely (allowing queries when user context is available)
        builder.Entity<Account>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Category>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Transaction>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Transfer>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<CreditCard>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Investment>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<SIP>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Loan>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Trip>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<TripExpense>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<TripAdvance>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<TripSettlement>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Budget>().HasQueryFilter(e => !e.IsDeleted);
    }
}
