using WealthFlow.Application.Features.Loans.DTOs;

namespace WealthFlow.Application.Features.Loans.Interfaces;

public interface ILoanService
{
    Task<LoanSummaryDto> GetLoanSummaryAsync(Guid userId, string? directionFilter = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LoanDto>> GetLoansAsync(Guid userId, string? directionFilter = null, CancellationToken cancellationToken = default);
    Task<LoanDto> GetLoanByIdAsync(Guid userId, Guid loanId, CancellationToken cancellationToken = default);
    Task<LoanDto> CreateLoanAsync(Guid userId, CreateLoanRequest request, CancellationToken cancellationToken = default);
    Task<RecordRepaymentResponse> RecordRepaymentAsync(Guid userId, Guid loanId, RecordRepaymentRequest request, CancellationToken cancellationToken = default);
    Task DeleteLoanAsync(Guid userId, Guid loanId, CancellationToken cancellationToken = default);
}
