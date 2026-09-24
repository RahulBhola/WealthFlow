namespace WealthFlow.Application.Common.Interfaces;

/// <summary>
/// Result metadata returned after a successful file upload to cloud/local storage.
/// </summary>
public record FileUploadResult(
    string StoragePath,
    string StoredFileName,
    long FileSizeBytes,
    string MimeType,
    string Sha256Checksum
);

/// <summary>
/// Result object wrapping a downloaded file stream and metadata.
/// </summary>
public record FileDownloadResult(
    Stream ContentStream,
    string ContentType,
    string FileName
);

/// <summary>
/// Decoupled file storage abstraction decoupling binary persistence from financial ledger records.
/// Dynamically bound to GoogleDriveStorageService (PostgreSQL mode) or AzureBlobStorageService (Azure SQL mode).
/// </summary>
public interface IFileStorageService
{
    /// <summary>
    /// Uploads an immutable binary stream to the configured cloud or local storage provider.
    /// </summary>
    Task<FileUploadResult> UploadFileAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Securely streams down an attachment file for proxy delivery without exposing direct public URLs.
    /// </summary>
    Task<FileDownloadResult?> DownloadFileAsync(
        string storagePath,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Permanently deletes an attachment binary from cloud storage.
    /// </summary>
    Task<bool> DeleteFileAsync(
        string storagePath,
        CancellationToken cancellationToken = default);
}
