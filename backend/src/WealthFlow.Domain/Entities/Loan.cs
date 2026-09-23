using WealthFlow.Domain.Common;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Peer debt or gift obligation tracking principal amount, outstanding balance, and counterparty.
/// </summary>
public class Loan : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public LoanDirection Direction { get; private set; }
    public string CounterpartyName { get; private set; } = string.Empty;
    public string? CounterpartyContact { get; private set; }
    public decimal PrincipalAmount { get; private set; }
    public decimal OutstandingBalance { get; private set; }
    public DateTime? DueDate { get; private set; }
    public Guid? DisbursementAccountId { get; private set; }
    public string? Notes { get; private set; }
    public LoanStatus Status { get; private set; } = LoanStatus.Open;
    public bool IsSettled { get; private set; } = false;

    public List<LoanRepayment> Repayments { get; private set; } = new();

    protected Loan() { }

    public Loan(
        Guid userId,
        LoanDirection direction,
        string counterpartyName,
        decimal principalAmount,
        string? counterpartyContact = null,
        DateTime? dueDate = null,
        Guid? disbursementAccountId = null,
        string? notes = null)
    {
        UserId = userId;
        Direction = direction;
        CounterpartyName = counterpartyName;
        CounterpartyContact = counterpartyContact;
        PrincipalAmount = principalAmount;
        OutstandingBalance = principalAmount;
        DueDate = dueDate.HasValue 
            ? (dueDate.Value.Kind == DateTimeKind.Utc ? dueDate.Value : DateTime.SpecifyKind(dueDate.Value, DateTimeKind.Utc)) 
            : null;
        DisbursementAccountId = disbursementAccountId;
        Notes = notes;
        Status = LoanStatus.Open;
        IsSettled = false;
    }

    public void RecordRepayment(decimal repaymentAmount)
    {
        if (repaymentAmount <= 0)
        {
            throw new ArgumentException("Repayment amount must be greater than zero.", nameof(repaymentAmount));
        }

        OutstandingBalance = Math.Max(0m, OutstandingBalance - repaymentAmount);
        if (OutstandingBalance == 0m)
        {
            IsSettled = true;
            Status = LoanStatus.FullySettled;
        }
        else
        {
            Status = LoanStatus.PartiallyRepaid;
        }
        SetUpdated();
    }
}
