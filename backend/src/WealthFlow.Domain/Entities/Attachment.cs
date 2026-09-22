using WealthFlow.Domain.Common;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// File or receipt attachment metadata linked to a transaction or trip expense.
/// </summary>
public class Attachment : BaseEntity, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public string LinkedEntityType { get; private set; } = string.Empty; // "Transaction" or "TripExpense"
    public Guid LinkedEntityId { get; private set; }
    public string OriginalFileName { get; private set; } = string.Empty;
    public string StoredFileName { get; private set; } = string.Empty;
    public string MimeType { get; private set; } = string.Empty;
    public long FileSizeBytes { get; private set; }
    public string StoragePath { get; private set; } = string.Empty;

    protected Attachment() { }

    public Attachment(
        Guid userId,
        string linkedEntityType,
        Guid linkedEntityId,
        string originalFileName,
        string storedFileName,
        string mimeType,
        long fileSizeBytes,
        string storagePath)
    {
        UserId = userId;
        LinkedEntityType = linkedEntityType;
        LinkedEntityId = linkedEntityId;
        OriginalFileName = originalFileName;
        StoredFileName = storedFileName;
        MimeType = mimeType;
        FileSizeBytes = fileSizeBytes;
        StoragePath = storagePath;
    }
}
