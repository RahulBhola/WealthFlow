using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Attachments.DTOs;
using WealthFlow.Domain.Entities;

namespace WealthFlow.Api.Controllers;

/// <summary>
/// Endpoints for managing file and receipt attachments.
/// Provides secure server-side streaming proxying to prevent direct cloud storage exposure.
/// Enforces magic-byte validation and strict 5MB file caps.
/// </summary>
[ApiController]
[Route("api/v1/attachments")]
[Authorize]
public class AttachmentsController : ControllerBase
{
    private readonly IFileStorageService _fileStorageService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<AttachmentsController> _logger;

    private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB cap

    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    };

    public AttachmentsController(
        IFileStorageService fileStorageService,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService,
        ILogger<AttachmentsController> logger)
    {
        _fileStorageService = fileStorageService;
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Uploads an attachment linked to a transaction or trip expense.
    /// Validates magic number header bytes and file size limits.
    /// </summary>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(AttachmentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadAttachment(
        [FromForm] IFormFile file,
        [FromForm] string linkedEntityType,
        [FromForm] Guid linkedEntityId,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue || userId.Value == Guid.Empty)
        {
            return Unauthorized();
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { code = "INVALID_FILE", detail = "File payload is empty or missing." });
        }

        if (file.Length > MaxFileSizeBytes)
        {
            return BadRequest(new { code = "FILE_TOO_LARGE", detail = $"File size ({file.Length} bytes) exceeds the maximum allowed 5 MB cap." });
        }

        var contentType = file.ContentType?.ToLowerInvariant() ?? string.Empty;
        if (!AllowedMimeTypes.Contains(contentType))
        {
            return BadRequest(new { code = "INVALID_MIME_TYPE", detail = $"File type '{contentType}' is not supported. Allowed: JPEG, PNG, WEBP, PDF." });
        }

        // Validate magic number binary header signature
        using var stream = file.OpenReadStream();
        if (!IsValidBinarySignature(stream, contentType))
        {
            return BadRequest(new { code = "INVALID_FILE_SIGNATURE", detail = "File binary signature does not match the declared MIME type." });
        }

        stream.Position = 0;
        var sanitizedExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var storedFileName = $"attachment_{Guid.NewGuid():N}{sanitizedExtension}";

        var uploadResult = await _fileStorageService.UploadFileAsync(
            stream,
            file.FileName,
            contentType,
            cancellationToken);

        var attachment = new Attachment(
            userId: userId.Value,
            linkedEntityType: linkedEntityType ?? "Transaction",
            linkedEntityId: linkedEntityId,
            originalFileName: file.FileName,
            storedFileName: storedFileName,
            mimeType: contentType,
            fileSizeBytes: file.Length,
            storagePath: uploadResult.StoragePath
        );

        await _unitOfWork.Attachments.AddAsync(attachment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Attachment {AttachmentId} created for user {UserId} linking to {EntityType}:{EntityId}",
            attachment.Id, userId.Value, linkedEntityType, linkedEntityId);

        var dto = new AttachmentDto(
            attachment.Id,
            attachment.UserId,
            attachment.LinkedEntityType,
            attachment.LinkedEntityId,
            attachment.OriginalFileName,
            attachment.StoredFileName,
            attachment.MimeType,
            attachment.FileSizeBytes,
            attachment.StoragePath,
            attachment.CreatedAtUtc
        );

        return CreatedAtAction(nameof(GetAttachmentById), new { id = attachment.Id }, dto);
    }

    /// <summary>
    /// Secure proxy streaming download endpoint.
    /// Streams file bytes with Content-Disposition: attachment without exposing raw cloud storage URIs.
    /// </summary>
    [HttpGet("{id:guid}/download")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadAttachment(Guid id, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue || userId.Value == Guid.Empty)
        {
            return Unauthorized();
        }

        var attachment = await _unitOfWork.Attachments.GetByIdAsync(id, cancellationToken);
        if (attachment == null || attachment.IsDeleted)
        {
            return NotFound(new { code = "ATTACHMENT_NOT_FOUND", detail = $"Attachment with ID {id} not found." });
        }

        // BOLA Authorization Check
        if (attachment.UserId != userId.Value)
        {
            return Forbid();
        }

        var downloadResult = await _fileStorageService.DownloadFileAsync(attachment.StoragePath, cancellationToken);
        if (downloadResult == null)
        {
            return NotFound(new { code = "FILE_CONTENT_NOT_FOUND", detail = "The binary for this attachment could not be located in storage." });
        }

        var fileName = !string.IsNullOrWhiteSpace(attachment.OriginalFileName) ? attachment.OriginalFileName : downloadResult.FileName;
        var contentType = !string.IsNullOrWhiteSpace(attachment.MimeType) ? attachment.MimeType : downloadResult.ContentType;

        return File(downloadResult.ContentStream, contentType, fileName, enableRangeProcessing: true);
    }

    /// <summary>
    /// Retrieves attachment metadata by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AttachmentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAttachmentById(Guid id, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue || userId.Value == Guid.Empty)
        {
            return Unauthorized();
        }

        var attachment = await _unitOfWork.Attachments.GetByIdAsync(id, cancellationToken);
        if (attachment == null || attachment.IsDeleted)
        {
            return NotFound(new { code = "ATTACHMENT_NOT_FOUND", detail = $"Attachment with ID {id} not found." });
        }

        if (attachment.UserId != userId.Value)
        {
            return Forbid();
        }

        var dto = new AttachmentDto(
            attachment.Id,
            attachment.UserId,
            attachment.LinkedEntityType,
            attachment.LinkedEntityId,
            attachment.OriginalFileName,
            attachment.StoredFileName,
            attachment.MimeType,
            attachment.FileSizeBytes,
            attachment.StoragePath,
            attachment.CreatedAtUtc
        );

        return Ok(dto);
    }

    /// <summary>
    /// Retrieves all attachments linked to a specific entity (e.g. Transaction or TripExpense).
    /// </summary>
    [HttpGet("by-entity")]
    [ProducesResponseType(typeof(IEnumerable<AttachmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAttachmentsByEntity(
        [FromQuery] string entityType,
        [FromQuery] Guid entityId,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue || userId.Value == Guid.Empty)
        {
            return Unauthorized();
        }

        var attachments = await _unitOfWork.Attachments.ListAsync(
            a => a.UserId == userId.Value && a.LinkedEntityType == entityType && a.LinkedEntityId == entityId,
            cancellationToken);

        var dtos = attachments.Select(a => new AttachmentDto(
            a.Id,
            a.UserId,
            a.LinkedEntityType,
            a.LinkedEntityId,
            a.OriginalFileName,
            a.StoredFileName,
            a.MimeType,
            a.FileSizeBytes,
            a.StoragePath,
            a.CreatedAtUtc
        ));

        return Ok(dtos);
    }

    /// <summary>
    /// Deletes an attachment and removes its binary from cloud storage.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAttachment(Guid id, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue || userId.Value == Guid.Empty)
        {
            return Unauthorized();
        }

        var attachment = await _unitOfWork.Attachments.GetByIdAsync(id, cancellationToken);
        if (attachment == null)
        {
            return NotFound(new { code = "ATTACHMENT_NOT_FOUND", detail = $"Attachment with ID {id} not found." });
        }

        if (attachment.UserId != userId.Value)
        {
            return Forbid();
        }

        await _fileStorageService.DeleteFileAsync(attachment.StoragePath, cancellationToken);
        await _unitOfWork.Attachments.DeleteAsync(attachment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Attachment {AttachmentId} deleted by user {UserId}", id, userId.Value);
        return NoContent();
    }

    /// <summary>
    /// Validates binary magic header numbers for supported file formats.
    /// </summary>
    private static bool IsValidBinarySignature(Stream stream, string contentType)
    {
        if (stream.Length < 4) return false;

        var header = new byte[12];
        int bytesRead = stream.Read(header, 0, header.Length);
        stream.Position = 0;

        if (bytesRead < 4) return false;

        return contentType switch
        {
            "image/jpeg" => header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            "image/png" => header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47,
            "application/pdf" => header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46,
            "image/webp" => bytesRead >= 12 &&
                            header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 && // "RIFF"
                            header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50, // "WEBP"
            _ => false
        };
    }
}
