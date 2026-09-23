using WealthFlow.Domain.Enums;

namespace WealthFlow.Application.Features.Investments.DTOs;

/// <summary>
/// Data transfer record for an individual investment portfolio asset.
/// </summary>
public record InvestmentDto(
    Guid Id,
    string Name,
    string AssetClass,
    decimal InvestedAmount,
    decimal CurrentValuation,
    decimal Units,
    decimal AbsoluteGainLoss,
    decimal ReturnPercentage,
    DateTime? LastValuationDate,
    DateTime CreatedAtUtc
);

/// <summary>
/// Aggregated investment portfolio metrics and asset class allocation.
/// </summary>
public record InvestmentSummaryDto(
    decimal TotalInvestedAmount,
    decimal TotalCurrentValuation,
    decimal TotalAbsoluteGainLoss,
    decimal OverallReturnPercentage,
    IReadOnlyList<AssetAllocationDto> AssetAllocation,
    IReadOnlyList<InvestmentDto> Investments
);

/// <summary>
/// Asset class breakdown for portfolio diversification display.
/// </summary>
public record AssetAllocationDto(
    string AssetClass,
    decimal TotalInvested,
    decimal TotalValuation,
    decimal AllocationPercentage
);

/// <summary>
/// Request payload to create a new investment asset.
/// </summary>
public record CreateInvestmentRequest(
    string Name,
    string AssetClass,
    decimal InvestedAmount,
    decimal CurrentValuation,
    decimal Units = 0m,
    DateTime? ValuationDate = null
);

/// <summary>
/// Request payload to update market valuation of an existing asset.
/// </summary>
public record UpdateValuationRequest(
    decimal CurrentValuation,
    decimal Units,
    DateTime ValuationDate
);

/// <summary>
/// Systematic Investment Plan (SIP) schedule DTO with joint/co-investor details.
/// </summary>
public record SipDto(
    Guid Id,
    Guid InvestmentId,
    string InvestmentName,
    Guid SourceAccountId,
    string SourceAccountName,
    string Name,
    decimal Amount,
    int ExecutionDay,
    DateTime StartDate,
    DateTime? EndDate,
    string Status,
    bool IsJoint,
    decimal UserShare,
    decimal CoInvestorShare,
    string? CoInvestorName,
    DateTime NextExecutionDate,
    DateTime CreatedAtUtc
);

/// <summary>
/// Request payload to configure a new recurring SIP schedule.
/// </summary>
public record CreateSipRequest(
    Guid InvestmentId,
    Guid SourceAccountId,
    string Name,
    decimal Amount,
    int ExecutionDay,
    DateTime StartDate,
    DateTime? EndDate = null,
    bool IsJoint = false,
    decimal? UserShare = null,
    decimal? CoInvestorShare = null,
    string? CoInvestorName = null
);

/// <summary>
/// Request payload to modify operational state of a SIP (Active, Paused, Stopped).
/// </summary>
public record UpdateSipStatusRequest(
    string Status
);

/// <summary>
/// Result of an automated or manual SIP execution cycle.
/// </summary>
public record ExecuteSipResponse(
    Guid SipId,
    Guid TransactionId,
    Guid InvestmentId,
    Guid SourceAccountId,
    decimal TotalDebited,
    decimal UserEquityShare,
    decimal CoInvestorReceivableShare,
    Guid? LinkedLoanId,
    Guid? ReconciliationId,
    DateTime ExecutedDateUtc
);

/// <summary>
/// Overview of all joint SIP co-funded obligations.
/// </summary>
public record JointSipSummaryDto(
    int TotalJointSipsCount,
    decimal TotalMonthlyCommitment,
    decimal TotalUserMonthlyShare,
    decimal TotalPartnerMonthlyShare,
    decimal TotalPartnerReceivableDue,
    IReadOnlyList<JointSipDetailDto> JointSips
);

/// <summary>
/// Detailed joint SIP record including all past monthly reconciliation cycles.
/// </summary>
public record JointSipDetailDto(
    SipDto Sip,
    decimal TotalPartnerDueAcrossCycles,
    decimal TotalPartnerSettledAcrossCycles,
    int PendingCyclesCount,
    IReadOnlyList<JointSipReconciliationDto> Reconciliations
);

/// <summary>
/// Individual monthly billing cycle reconciliation record for joint SIPs.
/// </summary>
public record JointSipReconciliationDto(
    Guid Id,
    Guid SIPId,
    string SipName,
    int Month,
    int Year,
    DateTime ExecutionDateUtc,
    decimal TotalAmount,
    decimal UserShare,
    decimal CoInvestorShare,
    decimal AmountSettled,
    decimal RemainingDue,
    string SettlementStatus,
    DateTime? SettlementDateUtc,
    string? Notes
);

/// <summary>
/// Request to record partner settlement against a joint SIP obligation.
/// Supports direct bank/cash credit or mutual bilateral debt offset.
/// </summary>
public record SipRepaymentRequest(
    Guid? DestinationAccountId,
    decimal Amount,
    DateTime PaymentDate,
    string PaymentMode = "UPI",
    bool IsMutualDebtOffset = false,
    string? OffsetNotes = null,
    string? Notes = null
);

/// <summary>
/// Result of partner repayment execution.
/// </summary>
public record SipRepaymentResponse(
    Guid ReconciliationId,
    decimal AmountSettled,
    decimal RemainingDue,
    string Status,
    bool IsSettled,
    decimal? UpdatedAccountBalance
);
