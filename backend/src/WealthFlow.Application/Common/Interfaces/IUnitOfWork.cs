namespace WealthFlow.Application.Common.Interfaces;

/// <summary>
/// Unit of Work contract coordinating transactional persistence and repository access across business operations.
/// </summary>
public interface IUnitOfWork : IDisposable
{
    IAccountRepository Accounts { get; }
    ICategoryRepository Categories { get; }
    ITransactionRepository Transactions { get; }
    IBudgetRepository Budgets { get; }
    ITripRepository Trips { get; }
    ISipRepository Sips { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);
    Task CommitTransactionAsync(CancellationToken cancellationToken = default);
    Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
}
