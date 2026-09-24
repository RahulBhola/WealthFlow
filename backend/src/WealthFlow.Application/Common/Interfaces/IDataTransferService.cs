using WealthFlow.Application.Features.Data.DTOs;

namespace WealthFlow.Application.Common.Interfaces;

/// <summary>
/// Service contract for exporting and importing comprehensive user financial data.
/// </summary>
public interface IDataTransferService
{
    /// <summary>
    /// Exports all user financial records (accounts, categories, transactions, budgets, cards, loans, investments, trips) to structured JSON.
    /// </summary>
    Task<DataExportDto> ExportUserDataJsonAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Exports user transactions to standard CSV format.
    /// </summary>
    Task<byte[]> ExportTransactionsCsvAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Imports structured JSON financial data within an atomic transaction.
    /// </summary>
    Task<DataImportResultDto> ImportUserDataJsonAsync(Guid userId, DataExportDto importData, CancellationToken cancellationToken = default);

    /// <summary>
    /// Imports transactions from CSV stream within an atomic transaction.
    /// </summary>
    Task<DataImportResultDto> ImportTransactionsCsvAsync(Guid userId, Stream csvStream, CancellationToken cancellationToken = default);
}
