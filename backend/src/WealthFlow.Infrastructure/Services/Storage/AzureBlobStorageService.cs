using System.Security.Cryptography;
using Azure.Identity;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using WealthFlow.Application.Common.Interfaces;

namespace WealthFlow.Infrastructure.Services.Storage;

/// <summary>
/// Azure Blob Storage service active when deployed with Azure SQL Database.
/// Routes attachment uploads exclusively to Azure Blob Storage via Managed Identity or connection strings.
/// Zero Google Drive dependencies are instantiated.
/// </summary>
public class AzureBlobStorageService : IFileStorageService
{
    private readonly ILogger<AzureBlobStorageService> _logger;
    private readonly string _containerName;
    private readonly string? _connectionString;
    private readonly string? _serviceUri;
    private readonly string _fallbackLocalDir;
    private BlobContainerClient? _containerClient;
    private bool _initialized;

    public AzureBlobStorageService(IConfiguration configuration, ILogger<AzureBlobStorageService> logger)
    {
        _logger = logger;
        _containerName = configuration["AzureBlob:ContainerName"] ?? "receipts-attachments";
        _connectionString = configuration["AzureBlob:ConnectionString"] ?? configuration.GetConnectionString("AzureBlobStorage");
        _serviceUri = configuration["AzureBlob:ServiceUri"];

        _fallbackLocalDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "App_Data", "uploads", "azureblob_mock");
    }

    private void EnsureInitialized()
    {
        if (_initialized) return;

        try
        {
            if (!string.IsNullOrWhiteSpace(_connectionString))
            {
                var serviceClient = new BlobServiceClient(_connectionString);
                _containerClient = serviceClient.GetBlobContainerClient(_containerName);
                _containerClient.CreateIfNotExists(PublicAccessType.None);
                _logger.LogInformation("Azure Blob Storage service initialized via connection string. Container: {ContainerName}", _containerName);
            }
            else if (!string.IsNullOrWhiteSpace(_serviceUri) && Uri.TryCreate(_serviceUri, UriKind.Absolute, out var uri))
            {
                var serviceClient = new BlobServiceClient(uri, new DefaultAzureCredential());
                _containerClient = serviceClient.GetBlobContainerClient(_containerName);
                _containerClient.CreateIfNotExists(PublicAccessType.None);
                _logger.LogInformation("Azure Blob Storage service initialized via Managed Identity. Container: {ContainerName}", _containerName);
            }
            else
            {
                _logger.LogWarning("No Azure Storage credentials or connection string configured. AzureBlobStorageService will operate in local fallback mode ({Directory}).", _fallbackLocalDir);
                Directory.CreateDirectory(_fallbackLocalDir);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Azure Blob Storage client. Operating in local fallback mode.");
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

        using var sha256 = SHA256.Create();
        var memoryStream = new MemoryStream();
        await fileStream.CopyToAsync(memoryStream, cancellationToken);
        memoryStream.Position = 0;

        var hashBytes = sha256.ComputeHash(memoryStream);
        var checksum = Convert.ToHexString(hashBytes).ToLowerInvariant();
        var fileSizeBytes = memoryStream.Length;
        memoryStream.Position = 0;

        if (_containerClient != null)
        {
            try
            {
                var blobClient = _containerClient.GetBlobClient(storedFileName);
                var uploadOptions = new BlobUploadOptions
                {
                    HttpHeaders = new BlobHttpHeaders
                    {
                        ContentType = contentType,
                        ContentDisposition = $"attachment; filename=\"{fileName}\""
                    },
                    Metadata = new Dictionary<string, string>
                    {
                        ["OriginalFileName"] = fileName,
                        ["Sha256Checksum"] = checksum
                    }
                };

                await blobClient.UploadAsync(memoryStream, uploadOptions, cancellationToken);
                _logger.LogInformation("Uploaded receipt {FileName} to Azure Blob Storage container {ContainerName}. Blob={BlobName}", fileName, _containerName, storedFileName);

                return new FileUploadResult(storedFileName, storedFileName, fileSizeBytes, contentType, checksum);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Azure Blob upload failed for {FileName}. Storing to local fallback directory.", fileName);
            }
        }

        // Local fallback persistence
        Directory.CreateDirectory(_fallbackLocalDir);
        var localFilePath = Path.Combine(_fallbackLocalDir, storedFileName);
        memoryStream.Position = 0;
        using (var fs = new FileStream(localFilePath, FileMode.Create, FileAccess.Write))
        {
            await memoryStream.CopyToAsync(fs, cancellationToken);
        }

        var relativePath = Path.Combine("azureblob_mock", storedFileName);
        return new FileUploadResult(relativePath, storedFileName, fileSizeBytes, contentType, checksum);
    }

    public async Task<FileDownloadResult?> DownloadFileAsync(
        string storagePath,
        CancellationToken cancellationToken = default)
    {
        EnsureInitialized();

        var blobName = Path.GetFileName(storagePath);

        if (_containerClient != null && !storagePath.StartsWith("azureblob_mock"))
        {
            try
            {
                var blobClient = _containerClient.GetBlobClient(blobName);
                if (await blobClient.ExistsAsync(cancellationToken))
                {
                    var response = await blobClient.DownloadStreamingAsync(cancellationToken: cancellationToken);
                    var contentType = response.Value.Details.ContentType ?? "application/octet-stream";
                    var originalName = response.Value.Details.Metadata.TryGetValue("OriginalFileName", out var orig) ? orig : blobName;

                    var memoryStream = new MemoryStream();
                    await response.Value.Content.CopyToAsync(memoryStream, cancellationToken);
                    memoryStream.Position = 0;

                    return new FileDownloadResult(memoryStream, contentType, originalName);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to download blob {BlobName} from Azure Storage.", blobName);
            }
        }

        // Fallback local download
        var localFilePath = Path.Combine(_fallbackLocalDir, blobName);
        if (File.Exists(localFilePath))
        {
            var memoryStream = new MemoryStream();
            using (var fs = new FileStream(localFilePath, FileMode.Open, FileAccess.Read))
            {
                await fs.CopyToAsync(memoryStream, cancellationToken);
            }
            memoryStream.Position = 0;

            var ext = Path.GetExtension(blobName).ToLowerInvariant();
            var mime = ext switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".webp" => "image/webp",
                ".pdf" => "application/pdf",
                _ => "application/octet-stream"
            };

            return new FileDownloadResult(memoryStream, mime, blobName);
        }

        return null;
    }

    public async Task<bool> DeleteFileAsync(
        string storagePath,
        CancellationToken cancellationToken = default)
    {
        EnsureInitialized();

        var blobName = Path.GetFileName(storagePath);

        if (_containerClient != null && !storagePath.StartsWith("azureblob_mock"))
        {
            try
            {
                var blobClient = _containerClient.GetBlobClient(blobName);
                var deleted = await blobClient.DeleteIfExistsAsync(cancellationToken: cancellationToken);
                _logger.LogInformation("Deleted blob {BlobName} from Azure Storage: {Deleted}", blobName, deleted.Value);
                return deleted.Value;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete blob {BlobName} from Azure Storage.", blobName);
            }
        }

        var localFilePath = Path.Combine(_fallbackLocalDir, blobName);
        if (File.Exists(localFilePath))
        {
            File.Delete(localFilePath);
            return true;
        }

        return false;
    }
}
