using System.Security.Cryptography;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using WealthFlow.Application.Common.Interfaces;

namespace WealthFlow.Infrastructure.Services.Storage;

/// <summary>
/// Google Drive API v3 storage service active when deployed with PostgreSQL.
/// Uploads receipts and financial documents to a designated private Google Drive folder using a Service Account.
/// </summary>
public class GoogleDriveStorageService : IFileStorageService
{
    private readonly ILogger<GoogleDriveStorageService> _logger;
    private readonly string? _rootFolderId;
    private readonly string? _serviceAccountKeyPath;
    private readonly string? _serviceAccountKeyJson;
    private readonly string _fallbackLocalDir;
    private DriveService? _driveService;
    private bool _initialized;

    public GoogleDriveStorageService(IConfiguration configuration, ILogger<GoogleDriveStorageService> logger)
    {
        _logger = logger;
        _rootFolderId = configuration["GoogleDrive:RootFolderId"] ?? configuration["GOOGLE_DRIVE_ROOT_FOLDER_ID"];
        _serviceAccountKeyPath = configuration["GoogleDrive:ServiceAccountKeyJsonPath"] ?? Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS");
        _serviceAccountKeyJson = configuration["GoogleDrive:ServiceAccountKeyJson"];

        _fallbackLocalDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "App_Data", "uploads", "googledrive_mock");
    }

    private void EnsureInitialized()
    {
        if (_initialized) return;

        try
        {
            GoogleCredential? credential = null;

            if (!string.IsNullOrWhiteSpace(_serviceAccountKeyJson))
            {
                credential = GoogleCredential.FromJson(_serviceAccountKeyJson)
                    .CreateScoped(DriveService.ScopeConstants.Drive);
            }
            else if (!string.IsNullOrWhiteSpace(_serviceAccountKeyPath) && File.Exists(_serviceAccountKeyPath))
            {
                credential = GoogleCredential.FromFile(_serviceAccountKeyPath)
                    .CreateScoped(DriveService.ScopeConstants.Drive);
            }

            if (credential != null)
            {
                _driveService = new DriveService(new BaseClientService.Initializer
                {
                    HttpClientInitializer = credential,
                    ApplicationName = "WealthFlow"
                });
                _logger.LogInformation("Google Drive API v3 storage service initialized with Google Service Account.");
            }
            else
            {
                _logger.LogWarning("No Google Service Account credentials found. GoogleDriveStorageService will operate in local development fallback mode ({Directory}).", _fallbackLocalDir);
                Directory.CreateDirectory(_fallbackLocalDir);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Google Drive client. Falling back to local directory persistence.");
            Directory.CreateDirectory(_fallbackLocalDir);
        }
        finally
        {
            _initialized = true;
        }
    }

    public async Task<FileUploadResult> UploadFileAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        EnsureInitialized();

        var ext = Path.GetExtension(fileName);
        var storedFileName = $"receipt_{Guid.NewGuid():N}{ext}";

        // Calculate SHA-256 checksum and measure size
        using var sha256 = SHA256.Create();
        var memoryStream = new MemoryStream();
        await fileStream.CopyToAsync(memoryStream, cancellationToken);
        memoryStream.Position = 0;

        var hashBytes = sha256.ComputeHash(memoryStream);
        var checksum = Convert.ToHexString(hashBytes).ToLowerInvariant();
        var fileSizeBytes = memoryStream.Length;
        memoryStream.Position = 0;

        if (_driveService != null)
        {
            try
            {
                var fileMetadata = new Google.Apis.Drive.v3.Data.File
                {
                    Name = storedFileName,
                    MimeType = contentType,
                    Description = $"WealthFlow receipt attachment: {fileName} (SHA256: {checksum})"
                };

                if (!string.IsNullOrWhiteSpace(_rootFolderId))
                {
                    fileMetadata.Parents = new List<string> { _rootFolderId };
                }

                var request = _driveService.Files.Create(fileMetadata, memoryStream, contentType);
                request.Fields = "id, name, size, mimeType";

                var progress = await request.UploadAsync(cancellationToken);
                if (progress.Status == Google.Apis.Upload.UploadStatus.Completed)
                {
                    var file = request.ResponseBody;
                    _logger.LogInformation("Uploaded receipt {FileName} to Google Drive. FileId={FileId}", fileName, file.Id);
                    return new FileUploadResult(file.Id, storedFileName, fileSizeBytes, contentType, checksum);
                }

                throw new InvalidOperationException($"Google Drive upload failed: {progress.Exception?.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Google Drive upload failed for {FileName}. Storing to local fallback directory.", fileName);
            }
        }

        // Fallback local persistence
        Directory.CreateDirectory(_fallbackLocalDir);
        var localFilePath = Path.Combine(_fallbackLocalDir, storedFileName);
        memoryStream.Position = 0;
        using (var fs = new FileStream(localFilePath, FileMode.Create, FileAccess.Write))
        {
            await memoryStream.CopyToAsync(fs, cancellationToken);
        }

        var relativePath = Path.Combine("googledrive_mock", storedFileName);
        return new FileUploadResult(relativePath, storedFileName, fileSizeBytes, contentType, checksum);
    }

    public async Task<FileDownloadResult?> DownloadFileAsync(
        string storagePath,
        CancellationToken cancellationToken = default)
    {
        EnsureInitialized();

        if (_driveService != null && !storagePath.StartsWith("googledrive_mock"))
        {
            try
            {
                var getReq = _driveService.Files.Get(storagePath);
                getReq.Fields = "id, name, mimeType, size";
                var fileMeta = await getReq.ExecuteAsync(cancellationToken);

                var stream = new MemoryStream();
                await getReq.DownloadAsync(stream, cancellationToken);
                stream.Position = 0;

                return new FileDownloadResult(
                    stream,
                    fileMeta.MimeType ?? "application/octet-stream",
                    fileMeta.Name ?? Path.GetFileName(storagePath));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to download file {StoragePath} from Google Drive.", storagePath);
            }
        }

        // Local fallback download
        var fileName = Path.GetFileName(storagePath);
        var localFilePath = Path.Combine(_fallbackLocalDir, fileName);

        if (File.Exists(localFilePath))
        {
            var memoryStream = new MemoryStream();
            using (var fs = new FileStream(localFilePath, FileMode.Open, FileAccess.Read))
            {
                await fs.CopyToAsync(memoryStream, cancellationToken);
            }
            memoryStream.Position = 0;

            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            var mime = ext switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".webp" => "image/webp",
                ".pdf" => "application/pdf",
                _ => "application/octet-stream"
            };

            return new FileDownloadResult(memoryStream, mime, fileName);
        }

        return null;
    }

    public async Task<bool> DeleteFileAsync(
        string storagePath,
        CancellationToken cancellationToken = default)
    {
        EnsureInitialized();

        if (_driveService != null && !storagePath.StartsWith("googledrive_mock"))
        {
            try
            {
                await _driveService.Files.Delete(storagePath).ExecuteAsync(cancellationToken);
                _logger.LogInformation("Deleted file {StoragePath} from Google Drive.", storagePath);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete file {StoragePath} from Google Drive.", storagePath);
            }
        }

        var fileName = Path.GetFileName(storagePath);
        var localFilePath = Path.Combine(_fallbackLocalDir, fileName);
        if (File.Exists(localFilePath))
        {
            File.Delete(localFilePath);
            return true;
        }

        return false;
    }
}
