using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Accounts.DTOs;
using WealthFlow.Application.Features.Accounts.Interfaces;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;
using WealthFlow.Domain.Services;

namespace WealthFlow.Infrastructure.Services;

/// <summary>
/// Application service implementing financial account lifecycle, zero-trust masking, and balance reconciliation.
/// </summary>
public class AccountService : IAccountService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly BalanceCalculationService _balanceCalculationService;

    public AccountService(IUnitOfWork _unitOfWork, BalanceCalculationService? balanceCalculationService = null)
    {
        this._unitOfWork = _unitOfWork;
        _balanceCalculationService = balanceCalculationService ?? new BalanceCalculationService();
    }

    public async Task<IReadOnlyList<AccountDto>> GetAccountsByUserAsync(Guid userId, bool includeArchived = false, CancellationToken cancellationToken = default)
    {
        var accounts = await _unitOfWork.Accounts.GetAccountsByUserAsync(userId, includeArchived, cancellationToken);
        return accounts.Select(MapToDto).ToList();
    }

    public async Task<AccountDto?> GetAccountByIdAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default)
    {
        var account = await _unitOfWork.Accounts.GetByIdAsync(accountId, cancellationToken);
        if (account == null || account.UserId != userId)
        {
            return null;
        }

        return MapToDto(account);
    }

    public async Task<AccountDto> CreateAccountAsync(Guid userId, CreateAccountRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Account name is required.", nameof(request.Name));
        }

        var accountType = ParseAccountType(request.AccountType);
        var maskedAccountNumber = FormatAccountNumberMask(request.AccountNumberMask);

        var account = new Account(
            userId: userId,
            name: request.Name.Trim(),
            accountType: accountType,
            openingBalance: request.OpeningBalance,
            accountNumberMask: maskedAccountNumber,
            sortOrder: request.SortOrder,
            currency: string.IsNullOrWhiteSpace(request.Currency) ? "INR" : request.Currency.Trim().ToUpperInvariant(),
            colorTag: request.ColorTag?.Trim()
        );

        await _unitOfWork.Accounts.AddAsync(account, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(account);
    }

    public async Task<AccountDto> UpdateAccountAsync(Guid userId, Guid accountId, UpdateAccountRequest request, CancellationToken cancellationToken = default)
    {
        var account = await _unitOfWork.Accounts.GetByIdAsync(accountId, cancellationToken);
        if (account == null || account.UserId != userId)
        {
            throw new KeyNotFoundException($"Account with ID {accountId} was not found.");
        }

        var accountType = ParseAccountType(request.AccountType);
        var maskedAccountNumber = FormatAccountNumberMask(request.AccountNumberMask);

        account.UpdateDetails(
            name: request.Name.Trim(),
            accountType: accountType,
            accountNumberMask: maskedAccountNumber,
            sortOrder: request.SortOrder,
            colorTag: request.ColorTag?.Trim(),
            currency: string.IsNullOrWhiteSpace(request.Currency) ? "INR" : request.Currency.Trim().ToUpperInvariant()
        );

        await _unitOfWork.Accounts.UpdateAsync(account, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(account);
    }

    public async Task ArchiveAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default)
    {
        var account = await _unitOfWork.Accounts.GetByIdAsync(accountId, cancellationToken);
        if (account == null || account.UserId != userId)
        {
            throw new KeyNotFoundException($"Account with ID {accountId} was not found.");
        }

        account.Archive();
        await _unitOfWork.Accounts.UpdateAsync(account, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task ActivateAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default)
    {
        var account = await _unitOfWork.Accounts.GetByIdAsync(accountId, cancellationToken);
        if (account == null || account.UserId != userId)
        {
            throw new KeyNotFoundException($"Account with ID {accountId} was not found.");
        }

        account.Activate();
        await _unitOfWork.Accounts.UpdateAsync(account, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default)
    {
        var account = await _unitOfWork.Accounts.GetByIdAsync(accountId, cancellationToken);
        if (account == null || account.UserId != userId)
        {
            throw new KeyNotFoundException($"Account with ID {accountId} was not found.");
        }

        var hasTransactions = await _unitOfWork.Accounts.HasTransactionsAsync(accountId, cancellationToken);
        if (hasTransactions)
        {
            throw new InvalidOperationException("Cannot delete account with existing transactions. Please archive it instead.");
        }

        account.SoftDelete();
        await _unitOfWork.Accounts.UpdateAsync(account, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<ReconcileAccountResponse> ReconcileAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default)
    {
        var account = await _unitOfWork.Accounts.GetByIdAsync(accountId, cancellationToken);
        if (account == null || account.UserId != userId)
        {
            throw new KeyNotFoundException($"Account with ID {accountId} was not found.");
        }

        var transactions = await _unitOfWork.Transactions.GetByAccountAsync(accountId, cancellationToken);
        var result = _balanceCalculationService.ReconcileAccount(account, transactions);

        if (result.HasDiscrepancy)
        {
            await _unitOfWork.Accounts.UpdateAsync(account, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return new ReconcileAccountResponse(
            AccountId: result.AccountId,
            AccountName: account.Name,
            OpeningBalance: result.OpeningBalance,
            PreviousBalance: result.PreviousBalance,
            ReconciledBalance: result.ReconciledBalance,
            Discrepancy: result.Discrepancy,
            HasDiscrepancy: result.HasDiscrepancy,
            TransactionCount: result.TransactionCount,
            ReconciledAtUtc: result.ReconciledAtUtc
        );
    }

    public async Task<AccountSummaryDto> GetAccountSummaryAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var activeAccounts = await _unitOfWork.Accounts.GetActiveAccountsByUserAsync(userId, cancellationToken);

        var totalBank = activeAccounts.Where(a => a.AccountType == AccountType.Bank).Sum(a => a.CurrentBalance);
        var totalCash = activeAccounts.Where(a => a.AccountType == AccountType.Cash).Sum(a => a.CurrentBalance);
        var totalWallet = activeAccounts.Where(a => a.AccountType == AccountType.Wallet).Sum(a => a.CurrentBalance);
        var totalSavings = activeAccounts.Where(a => a.AccountType == AccountType.Savings).Sum(a => a.CurrentBalance);
        var totalLiquid = totalBank + totalCash + totalWallet;

        return new AccountSummaryDto(
            TotalLiquidBalance: totalLiquid,
            TotalBankBalance: totalBank,
            TotalCashBalance: totalCash,
            TotalWalletBalance: totalWallet,
            TotalSavingsBalance: totalSavings,
            ActiveAccountCount: activeAccounts.Count
        );
    }

    private static AccountDto MapToDto(Account a) => new(
        Id: a.Id,
        Name: a.Name,
        AccountType: a.AccountType.ToString(),
        OpeningBalance: a.OpeningBalance,
        CurrentBalance: a.CurrentBalance,
        Currency: a.Currency,
        AccountNumberMask: a.AccountNumberMask,
        ColorTag: a.ColorTag,
        IsActive: a.IsActive,
        SortOrder: a.SortOrder,
        CreatedAtUtc: a.CreatedAtUtc
    );

    private static AccountType ParseAccountType(string accountTypeStr)
    {
        if (Enum.TryParse<AccountType>(accountTypeStr, ignoreCase: true, out var parsed))
        {
            return parsed;
        }

        return AccountType.Other;
    }

    /// <summary>
    /// Zero-Trust Banking Boundary: strips all non-digits and returns mask with only the last 4 digits visible.
    /// </summary>
    private static string? FormatAccountNumberMask(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var digits = new string(raw.Where(char.IsDigit).ToArray());
        if (digits.Length == 0)
        {
            return null;
        }

        var last4 = digits.Length > 4 ? digits[^4..] : digits;
        return $"•••• {last4}";
    }
}
