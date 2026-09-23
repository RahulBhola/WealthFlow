using WealthFlow.Domain.Common;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Individual repayment transaction applied towards a peer loan.
/// </summary>
public class LoanRepayment : BaseEntity, IAggregateRoot
{
    public Guid LoanId { get; private set; }
    public Guid AccountId { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime RepaymentDate { get; private set; }
    public string? Notes { get; private set; }

    protected LoanRepayment() { }

    public LoanRepayment(
        Guid loanId,
        Guid accountId,
        decimal amount,
        DateTime repaymentDate,
        string? notes = null)
    {
        LoanId = loanId;
        AccountId = accountId;
        Amount = amount;
        RepaymentDate = repaymentDate.Kind == DateTimeKind.Utc ? repaymentDate : DateTime.SpecifyKind(repaymentDate, DateTimeKind.Utc);
        Notes = notes;
    }
}
