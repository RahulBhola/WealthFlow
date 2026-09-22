using WealthFlow.Application.Features.Accounts.DTOs;

namespace WealthFlow.Application.Features.Accounts.Interfaces;

/// <summary>
/// Application service contract for financial accounts management and balance reconciliation.
/// </summary>
public interface IAccountService
{
    Task<IReadOnlyList<AccountDto>> GetAccountsByUserAsync(Guid userId, bool includeArchived = false, CancellationToken cancellationToken = default);
    Task<AccountDto?> GetAccountByIdAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default);
    Task<AccountDto> CreateAccountAsync(Guid userId, CreateAccountRequest request, CancellationToken cancellationToken = default);
    Task<AccountDto> UpdateAccountAsync(Guid userId, Guid accountId, UpdateAccountRequest request, CancellationToken cancellationToken = default);
    Task ArchiveAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default);
    Task ActivateAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default);
    Task DeleteAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default);
    Task<ReconcileAccountResponse> ReconcileAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default);
    Task<AccountSummaryDto> GetAccountSummaryAsync(Guid userId, CancellationToken cancellationToken = default);
}
