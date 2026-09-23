namespace WealthFlow.Application.Features.Loans.DTOs;

public record LoanRepaymentDto(
    Guid Id,
    Guid LoanId,
    Guid AccountId,
    string? AccountName,
    decimal Amount,
    DateTime RepaymentDate,
    string? Notes,
    DateTime CreatedAtUtc
);

public record LoanDto(
    Guid Id,
    string Direction,
    string CounterpartyName,
    string? CounterpartyContact,
    decimal PrincipalAmount,
    decimal OutstandingBalance,
    decimal TotalRepaidAmount,
    decimal RepaymentPercentage,
    DateTime? DueDate,
    Guid? DisbursementAccountId,
    string? DisbursementAccountName,
    string? Notes,
    string Status,
    bool IsSettled,
    IReadOnlyList<LoanRepaymentDto> Repayments,
    DateTime CreatedAtUtc
);

public record LoanSummaryDto(
    decimal TotalReceivable,
    decimal TotalPayable,
    decimal NetBilateralPosition,
    int ActiveLentCount,
    int ActiveBorrowedCount,
    IReadOnlyList<LoanDto> Loans
);

public record CreateLoanRequest(
    string Direction,
    string CounterpartyName,
    decimal PrincipalAmount,
    string? CounterpartyContact = null,
    DateTime? DueDate = null,
    Guid? DisbursementAccountId = null,
    string? Notes = null
);

public record RecordRepaymentRequest(
    Guid AccountId,
    decimal Amount,
    DateTime RepaymentDate,
    string? Notes = null
);

public record RecordRepaymentResponse(
    Guid RepaymentId,
    Guid LoanId,
    decimal RepaidAmount,
    decimal RemainingBalance,
    string Status,
    bool IsSettled,
    decimal UpdatedAccountBalance
);
