using WealthFlow.Application.Features.Investments.DTOs;

namespace WealthFlow.Application.Features.Investments.Interfaces;

/// <summary>
/// Service contract managing investment portfolio valuation, SIP schedules, and joint SIP bilateral reconciliation.
/// </summary>
public interface IInvestmentService
{
    // --- Portfolio Management ---
    Task<InvestmentSummaryDto> GetInvestmentSummaryAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InvestmentDto>> GetInvestmentsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<InvestmentDto> GetInvestmentByIdAsync(Guid userId, Guid investmentId, CancellationToken cancellationToken = default);
    Task<InvestmentDto> CreateInvestmentAsync(Guid userId, CreateInvestmentRequest request, CancellationToken cancellationToken = default);
    Task<InvestmentDto> UpdateValuationAsync(Guid userId, Guid investmentId, UpdateValuationRequest request, CancellationToken cancellationToken = default);
    Task DeleteInvestmentAsync(Guid userId, Guid investmentId, CancellationToken cancellationToken = default);

    // --- SIP Scheduler & Execution ---
    Task<IReadOnlyList<SipDto>> GetSipsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<SipDto> CreateSipAsync(Guid userId, CreateSipRequest request, CancellationToken cancellationToken = default);
    Task<SipDto> UpdateSipStatusAsync(Guid userId, Guid sipId, UpdateSipStatusRequest request, CancellationToken cancellationToken = default);
    Task<ExecuteSipResponse> ExecuteSipAsync(Guid userId, Guid sipId, DateTime? executionDate = null, CancellationToken cancellationToken = default);
    Task<int> ExecuteDueSipsAsync(DateTime asOfDateUtc, CancellationToken cancellationToken = default);
    Task DeleteSipAsync(Guid userId, Guid sipId, CancellationToken cancellationToken = default);

    // --- Joint SIP Bilateral Reconciliation ---
    Task<JointSipSummaryDto> GetJointSipsSummaryAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<JointSipDetailDto> GetJointSipDetailAsync(Guid userId, Guid sipId, CancellationToken cancellationToken = default);
    Task<SipRepaymentResponse> SettleReconciliationAsync(Guid userId, Guid reconciliationId, SipRepaymentRequest request, CancellationToken cancellationToken = default);
}
