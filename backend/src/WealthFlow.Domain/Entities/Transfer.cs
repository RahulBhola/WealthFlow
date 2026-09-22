using WealthFlow.Domain.Common;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Inter-account fund transfer linking a source account and a destination account.
/// </summary>
public class Transfer : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public Guid SourceAccountId { get; private set; }
    public Guid DestinationAccountId { get; private set; }
    public decimal Amount { get; private set; }
    public decimal FeeAmount { get; private set; }
    public DateTime TransferDate { get; private set; }
    public string? Notes { get; private set; }

    protected Transfer() { }

    public Transfer(
        Guid userId,
        Guid sourceAccountId,
        Guid destinationAccountId,
        decimal amount,
        DateTime transferDate,
        decimal feeAmount = 0m,
        string? notes = null)
    {
        UserId = userId;
        SourceAccountId = sourceAccountId;
        DestinationAccountId = destinationAccountId;
        Amount = amount;
        FeeAmount = feeAmount;
        TransferDate = transferDate.Kind == DateTimeKind.Utc ? transferDate : DateTime.SpecifyKind(transferDate, DateTimeKind.Utc);
        Notes = notes;
    }
}
