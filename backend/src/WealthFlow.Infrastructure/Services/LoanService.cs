using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Loans.DTOs;
using WealthFlow.Application.Features.Loans.Interfaces;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Infrastructure.Services;

public class LoanService : ILoanService
{
    private readonly IUnitOfWork _unitOfWork;

    public LoanService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<LoanSummaryDto> GetLoanSummaryAsync(Guid userId, string? directionFilter = null, CancellationToken cancellationToken = default)
    {
        var allLoans = await _unitOfWork.Loans.GetLoansByUserAsync(userId, cancellationToken);
        var accounts = await _unitOfWork.Accounts.GetAccountsByUserAsync(userId, true, cancellationToken);
        var accountMap = accounts.ToDictionary(a => a.Id, a => a.Name);

        var totalReceivable = allLoans
            .Where(l => l.Direction == LoanDirection.Given && !l.IsSettled)
            .Sum(l => l.OutstandingBalance);

        var totalPayable = allLoans
            .Where(l => l.Direction == LoanDirection.Received && !l.IsSettled)
            .Sum(l => l.OutstandingBalance);

        var netPosition = totalReceivable - totalPayable;
        var activeLent = allLoans.Count(l => l.Direction == LoanDirection.Given && !l.IsSettled);
        var activeBorrowed = allLoans.Count(l => l.Direction == LoanDirection.Received && !l.IsSettled);

        var filteredLoans = allLoans.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(directionFilter) && !directionFilter.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            if (Enum.TryParse<LoanDirection>(directionFilter, true, out var dir))
            {
                filteredLoans = filteredLoans.Where(l => l.Direction == dir);
            }
        }

        var loanDtos = filteredLoans.Select(l => MapToDto(l, accountMap)).ToList();

        return new LoanSummaryDto(
            TotalReceivable: totalReceivable,
            TotalPayable: totalPayable,
            NetBilateralPosition: netPosition,
            ActiveLentCount: activeLent,
            ActiveBorrowedCount: activeBorrowed,
            Loans: loanDtos
        );
    }

    public async Task<IReadOnlyList<LoanDto>> GetLoansAsync(Guid userId, string? directionFilter = null, CancellationToken cancellationToken = default)
    {
        var summary = await GetLoanSummaryAsync(userId, directionFilter, cancellationToken);
        return summary.Loans;
    }

    public async Task<LoanDto> GetLoanByIdAsync(Guid userId, Guid loanId, CancellationToken cancellationToken = default)
    {
        var loan = await _unitOfWork.Loans.GetByIdWithRepaymentsAsync(loanId, userId, cancellationToken);
        if (loan == null)
        {
            throw new KeyNotFoundException($"Loan with ID {loanId} was not found.");
        }

        var accounts = await _unitOfWork.Accounts.GetAccountsByUserAsync(userId, true, cancellationToken);
        var accountMap = accounts.ToDictionary(a => a.Id, a => a.Name);

        return MapToDto(loan, accountMap);
    }

    public async Task<LoanDto> CreateLoanAsync(Guid userId, CreateLoanRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.CounterpartyName))
        {
            throw new ArgumentException("Counterparty name is required.", nameof(request));
        }

        if (request.PrincipalAmount <= 0)
        {
            throw new ArgumentException("Principal amount must be greater than zero.", nameof(request));
        }

        if (!Enum.TryParse<LoanDirection>(request.Direction, true, out var direction))
        {
            throw new ArgumentException($"Invalid loan direction: {request.Direction}. Must be 'Given' or 'Received'.", nameof(request));
        }

        Account? disbursementAccount = null;
        if (request.DisbursementAccountId.HasValue)
        {
            disbursementAccount = await _unitOfWork.Accounts.GetByIdAsync(request.DisbursementAccountId.Value, cancellationToken);
            if (disbursementAccount == null || disbursementAccount.UserId != userId)
            {
                throw new KeyNotFoundException($"Disbursement account with ID {request.DisbursementAccountId.Value} was not found.");
            }
        }

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var loan = new Loan(
                userId: userId,
                direction: direction,
                counterpartyName: request.CounterpartyName.Trim(),
                principalAmount: request.PrincipalAmount,
                counterpartyContact: request.CounterpartyContact?.Trim(),
                dueDate: request.DueDate,
                disbursementAccountId: request.DisbursementAccountId,
                notes: request.Notes?.Trim()
            );

            await _unitOfWork.Loans.AddAsync(loan, cancellationToken);

            // If a bank account is linked to the disbursement, adjust balance atomically
            if (disbursementAccount != null)
            {
                var txDateUtc = DateTime.UtcNow;
                if (direction == LoanDirection.Given)
                {
                    // Money lent: bank decreases
                    disbursementAccount.AdjustBalance(-request.PrincipalAmount);
                    var tx = new Transaction(
                        userId: userId,
                        accountId: disbursementAccount.Id,
                        amount: request.PrincipalAmount,
                        transactionDate: txDateUtc,
                        eventType: TransactionEventType.LoanGiven,
                        description: $"Loan Given to {loan.CounterpartyName}",
                        notes: request.Notes,
                        linkedEntityId: loan.Id
                    );
                    await _unitOfWork.Transactions.AddAsync(tx, cancellationToken);
                }
                else
                {
                    // Money borrowed: bank increases
                    disbursementAccount.AdjustBalance(request.PrincipalAmount);
                    var tx = new Transaction(
                        userId: userId,
                        accountId: disbursementAccount.Id,
                        amount: request.PrincipalAmount,
                        transactionDate: txDateUtc,
                        eventType: TransactionEventType.LoanReceived,
                        description: $"Loan Received from {loan.CounterpartyName}",
                        notes: request.Notes,
                        linkedEntityId: loan.Id
                    );
                    await _unitOfWork.Transactions.AddAsync(tx, cancellationToken);
                }
            }

            await _unitOfWork.CommitTransactionAsync(cancellationToken);

            var accounts = await _unitOfWork.Accounts.GetAccountsByUserAsync(userId, true, cancellationToken);
            var accountMap = accounts.ToDictionary(a => a.Id, a => a.Name);
            return MapToDto(loan, accountMap);
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync(cancellationToken);
            throw;
        }
    }

    public async Task<RecordRepaymentResponse> RecordRepaymentAsync(Guid userId, Guid loanId, RecordRepaymentRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Amount <= 0)
        {
            throw new ArgumentException("Repayment amount must be greater than zero.", nameof(request));
        }

        var loan = await _unitOfWork.Loans.GetByIdWithRepaymentsAsync(loanId, userId, cancellationToken);
        if (loan == null)
        {
            throw new KeyNotFoundException($"Loan with ID {loanId} was not found.");
        }

        if (loan.IsSettled || loan.OutstandingBalance == 0m)
        {
            throw new InvalidOperationException("Loan is already fully settled.");
        }

        var account = await _unitOfWork.Accounts.GetByIdAsync(request.AccountId, cancellationToken);
        if (account == null || account.UserId != userId)
        {
            throw new KeyNotFoundException($"Account with ID {request.AccountId} was not found.");
        }

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var repaymentDateUtc = request.RepaymentDate.Kind == DateTimeKind.Utc
                ? request.RepaymentDate
                : DateTime.SpecifyKind(request.RepaymentDate, DateTimeKind.Utc);

            var repayment = new LoanRepayment(
                loanId: loan.Id,
                accountId: account.Id,
                amount: request.Amount,
                repaymentDate: repaymentDateUtc,
                notes: request.Notes?.Trim()
            );

            await _unitOfWork.LoanRepayments.AddAsync(repayment, cancellationToken);
            loan.RecordRepayment(request.Amount);

            // Atomically adjust account balance and log transaction
            if (loan.Direction == LoanDirection.Given)
            {
                // Counterparty paying back user: account increases
                account.AdjustBalance(request.Amount);
                var tx = new Transaction(
                    userId: userId,
                    accountId: account.Id,
                    amount: request.Amount,
                    transactionDate: repaymentDateUtc,
                    eventType: TransactionEventType.Income,
                    description: $"Repayment received from {loan.CounterpartyName}",
                    notes: request.Notes,
                    linkedEntityId: loan.Id
                );
                await _unitOfWork.Transactions.AddAsync(tx, cancellationToken);
            }
            else
            {
                // User paying back counterparty: account decreases
                account.AdjustBalance(-request.Amount);
                var tx = new Transaction(
                    userId: userId,
                    accountId: account.Id,
                    amount: request.Amount,
                    transactionDate: repaymentDateUtc,
                    eventType: TransactionEventType.Expense,
                    description: $"Repayment paid to {loan.CounterpartyName}",
                    notes: request.Notes,
                    linkedEntityId: loan.Id
                );
                await _unitOfWork.Transactions.AddAsync(tx, cancellationToken);
            }

            await _unitOfWork.CommitTransactionAsync(cancellationToken);

            return new RecordRepaymentResponse(
                RepaymentId: repayment.Id,
                LoanId: loan.Id,
                RepaidAmount: request.Amount,
                RemainingBalance: loan.OutstandingBalance,
                Status: loan.Status.ToString(),
                IsSettled: loan.IsSettled,
                UpdatedAccountBalance: account.CurrentBalance
            );
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync(cancellationToken);
            throw;
        }
    }

    public async Task DeleteLoanAsync(Guid userId, Guid loanId, CancellationToken cancellationToken = default)
    {
        var loan = await _unitOfWork.Loans.GetByIdWithRepaymentsAsync(loanId, userId, cancellationToken);
        if (loan == null)
        {
            throw new KeyNotFoundException($"Loan with ID {loanId} was not found.");
        }

        await _unitOfWork.Loans.DeleteAsync(loan, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static LoanDto MapToDto(Loan loan, IReadOnlyDictionary<Guid, string> accountMap)
    {
        var totalRepaid = loan.PrincipalAmount - loan.OutstandingBalance;
        var percentage = loan.PrincipalAmount > 0
            ? Math.Round((totalRepaid / loan.PrincipalAmount) * 100m, 2)
            : 0m;

        var repaymentDtos = (loan.Repayments ?? new List<LoanRepayment>())
            .OrderByDescending(r => r.RepaymentDate)
            .Select(r => new LoanRepaymentDto(
                Id: r.Id,
                LoanId: r.LoanId,
                AccountId: r.AccountId,
                AccountName: accountMap.TryGetValue(r.AccountId, out var accName) ? accName : null,
                Amount: r.Amount,
                RepaymentDate: r.RepaymentDate,
                Notes: r.Notes,
                CreatedAtUtc: r.CreatedAtUtc
            ))
            .ToList();

        accountMap.TryGetValue(loan.DisbursementAccountId ?? Guid.Empty, out var disbName);

        return new LoanDto(
            Id: loan.Id,
            Direction: loan.Direction.ToString(),
            CounterpartyName: loan.CounterpartyName,
            CounterpartyContact: loan.CounterpartyContact,
            PrincipalAmount: loan.PrincipalAmount,
            OutstandingBalance: loan.OutstandingBalance,
            TotalRepaidAmount: totalRepaid,
            RepaymentPercentage: percentage,
            DueDate: loan.DueDate,
            DisbursementAccountId: loan.DisbursementAccountId,
            DisbursementAccountName: disbName,
            Notes: loan.Notes,
            Status: loan.Status.ToString(),
            IsSettled: loan.IsSettled,
            Repayments: repaymentDtos,
            CreatedAtUtc: loan.CreatedAtUtc
        );
    }
}
