using Microsoft.EntityFrameworkCore.Storage;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Infrastructure.Persistence.Repositories;

namespace WealthFlow.Infrastructure.Persistence;

/// <summary>
/// Coordinates transactions and manages repository lifecycles for unified atomic unit of work operations.
/// </summary>
public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _dbContext;
    private IDbContextTransaction? _currentTransaction;

    private IAccountRepository? _accountRepository;
    private ICategoryRepository? _categoryRepository;
    private ITransactionRepository? _transactionRepository;
    private IBudgetRepository? _budgetRepository;
    private ITripRepository? _tripRepository;
    private ISipRepository? _sipRepository;
    private ICreditCardRepository? _creditCardRepository;
    private ILoanRepository? _loanRepository;
    private IRepository<WealthFlow.Domain.Entities.LoanRepayment>? _loanRepaymentRepository;
    private IGiftRepository? _giftRepository;

    public UnitOfWork(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public IAccountRepository Accounts => _accountRepository ??= new AccountRepository(_dbContext);
    public ICategoryRepository Categories => _categoryRepository ??= new CategoryRepository(_dbContext);
    public ITransactionRepository Transactions => _transactionRepository ??= new TransactionRepository(_dbContext);
    public IBudgetRepository Budgets => _budgetRepository ??= new BudgetRepository(_dbContext);
    public ITripRepository Trips => _tripRepository ??= new TripRepository(_dbContext);
    public ISipRepository Sips => _sipRepository ??= new SipRepository(_dbContext);
    public ICreditCardRepository CreditCards => _creditCardRepository ??= new CreditCardRepository(_dbContext);
    public ILoanRepository Loans => _loanRepository ??= new LoanRepository(_dbContext);
    public IRepository<WealthFlow.Domain.Entities.LoanRepayment> LoanRepayments => _loanRepaymentRepository ??= new Repository<WealthFlow.Domain.Entities.LoanRepayment>(_dbContext);
    public IGiftRepository Gifts => _giftRepository ??= new GiftRepository(_dbContext);

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_currentTransaction != null || _dbContext.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory")
        {
            return;
        }

        _currentTransaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
    }

    public async Task CommitTransactionAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            if (_currentTransaction != null)
            {
                await _currentTransaction.CommitAsync(cancellationToken);
            }
        }
        catch
        {
            await RollbackTransactionAsync(cancellationToken);
            throw;
        }
        finally
        {
            if (_currentTransaction != null)
            {
                await _currentTransaction.DisposeAsync();
                _currentTransaction = null;
            }
        }
    }

    public async Task RollbackTransactionAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (_currentTransaction != null)
            {
                await _currentTransaction.RollbackAsync(cancellationToken);
            }
        }
        finally
        {
            if (_currentTransaction != null)
            {
                await _currentTransaction.DisposeAsync();
                _currentTransaction = null;
            }
        }
    }

    public void Dispose()
    {
        _currentTransaction?.Dispose();
        _dbContext.Dispose();
        GC.SuppressFinalize(this);
    }
}
