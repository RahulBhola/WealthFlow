using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Data.DTOs;

namespace WealthFlow.Api.Controllers;

/// <summary>
/// Endpoints for exporting and importing comprehensive user financial data in JSON and CSV formats.
/// Supports atomic, transactional migration and offline backup restoration.
/// </summary>
[ApiController]
[Route("api/v1/data")]
[Authorize]
public class DataController : ControllerBase
{
    private readonly IDataTransferService _dataTransferService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<DataController> _logger;

    public DataController(
        IDataTransferService dataTransferService,
        ICurrentUserService currentUserService,
        ILogger<DataController> logger)
    {
        _dataTransferService = dataTransferService;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Exports all user financial records in JSON format (or transactions in CSV).
    /// </summary>
    /// <param name="format">Export format: "json" (default) or "csv".</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    [HttpGet("export")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ExportData([FromQuery] string format = "json", CancellationToken cancellationToken = default)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue || userId.Value == Guid.Empty)
        {
            return Unauthorized();
        }

        var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");

        if (format.Equals("csv", StringComparison.OrdinalIgnoreCase))
        {
            var csvBytes = await _dataTransferService.ExportTransactionsCsvAsync(userId.Value, cancellationToken);
            return File(csvBytes, "text/csv", $"wealthflow-transactions-{timestamp}.csv");
        }

        var exportDto = await _dataTransferService.ExportUserDataJsonAsync(userId.Value, cancellationToken);
        var jsonBytes = JsonSerializer.SerializeToUtf8Bytes(exportDto, new JsonSerializerOptions { WriteIndented = true });

        return File(jsonBytes, "application/json", $"wealthflow-export-{timestamp}.json");
    }

    /// <summary>
    /// Imports financial records from a JSON payload or uploaded backup file.
    /// Operates inside an atomic database transaction.
    /// </summary>
    [HttpPost("import")]
    [ProducesResponseType(typeof(DataImportResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ImportData(
        [FromBody] DataExportDto? jsonData,
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue || userId.Value == Guid.Empty)
        {
            return Unauthorized();
        }

        // If JSON payload provided in request body
        if (jsonData != null && (jsonData.Accounts.Any() || jsonData.Transactions.Any() || jsonData.Categories.Any()))
        {
            var result = await _dataTransferService.ImportUserDataJsonAsync(userId.Value, jsonData, cancellationToken);
            if (!result.Success)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        // If file uploaded via multipart form
        if (file != null && file.Length > 0)
        {
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (ext == ".csv")
            {
                using var stream = file.OpenReadStream();
                var result = await _dataTransferService.ImportTransactionsCsvAsync(userId.Value, stream, cancellationToken);
                if (!result.Success)
                {
                    return BadRequest(result);
                }
                return Ok(result);
            }

            if (ext == ".json")
            {
                using var stream = file.OpenReadStream();
                var parsedDto = await JsonSerializer.DeserializeAsync<DataExportDto>(stream, cancellationToken: cancellationToken);
                if (parsedDto == null)
                {
                    return BadRequest(new DataImportResultDto
                    {
                        Success = false,
                        Message = "Could not parse JSON file contents."
                    });
                }

                var result = await _dataTransferService.ImportUserDataJsonAsync(userId.Value, parsedDto, cancellationToken);
                if (!result.Success)
                {
                    return BadRequest(result);
                }
                return Ok(result);
            }

            return BadRequest(new DataImportResultDto
            {
                Success = false,
                Message = $"Unsupported file format '{ext}'. Please upload a .json or .csv file."
            });
        }

        return BadRequest(new DataImportResultDto
        {
            Success = false,
            Message = "No valid JSON payload or file provided for import."
        });
    }
}
