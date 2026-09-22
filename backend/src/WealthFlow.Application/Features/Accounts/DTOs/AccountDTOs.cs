namespace WealthFlow.Application.Features.Accounts.DTOs;

public record CreateAccountRequest(
    string Name,
    string AccountType,
    decimal OpeningBalance,
    string? AccountNumberMask = null,
    string? ColorTag = null,
    int SortOrder = 0,
    string? Currency = "INR");

public record UpdateAccountRequest(
    string Name,
    string AccountType,
    string? AccountNumberMask = null,
    string? ColorTag = null,
    int SortOrder = 0,
    string? Currency = "INR");

public record AccountDto(
    Guid Id,
    string Name,
    string AccountType,
    decimal OpeningBalance,
    decimal CurrentBalance,
    string Currency,
    string? AccountNumberMask,
    string? ColorTag,
    bool IsActive,
    int SortOrder,
    DateTime CreatedAtUtc);

public record AccountSummaryDto(
    decimal TotalLiquidBalance,
    decimal TotalBankBalance,
    decimal TotalCashBalance,
    decimal TotalWalletBalance,
    decimal TotalSavingsBalance,
    int ActiveAccountCount);

public record ReconcileAccountResponse(
    Guid AccountId,
    string AccountName,
    decimal OpeningBalance,
    decimal PreviousBalance,
    decimal ReconciledBalance,
    decimal Discrepancy,
    bool HasDiscrepancy,
    int TransactionCount,
    DateTime ReconciledAtUtc);
