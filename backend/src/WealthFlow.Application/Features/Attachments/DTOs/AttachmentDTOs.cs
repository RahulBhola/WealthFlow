namespace WealthFlow.Application.Features.Attachments.DTOs;

/// <summary>
/// DTO representing attachment metadata.
/// </summary>
public record AttachmentDto(
    Guid Id,
    Guid UserId,
    string LinkedEntityType,
    Guid LinkedEntityId,
    string OriginalFileName,
    string StoredFileName,
    string MimeType,
    long FileSizeBytes,
    string StoragePath,
    DateTime CreatedAtUtc
);

/// <summary>
/// Request for uploading an attachment.
/// </summary>
public class UploadAttachmentRequest
{
    public string LinkedEntityType { get; set; } = string.Empty;
    public Guid LinkedEntityId { get; set; }
}
