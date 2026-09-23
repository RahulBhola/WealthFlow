using WealthFlow.Domain.Enums;

namespace WealthFlow.Application.Features.Trips.DTOs;

/// <summary>
/// Basic representation of a collaborative trip.
/// </summary>
public record TripDto(
    Guid Id,
    Guid HostUserId,
    string Name,
    string Destination,
    DateTime StartDate,
    DateTime EndDate,
    decimal? Budget,
    string Status,
    decimal TotalExpenses,
    int MemberCount,
    DateTime CreatedAtUtc
);

/// <summary>
/// Comprehensive trip details for the collaborative workspace view.
/// </summary>
public record TripDetailDto(
    TripDto Trip,
    IReadOnlyList<TripMemberDto> Members,
    IReadOnlyList<TripExpenseDto> Expenses,
    IReadOnlyList<TripAdvanceDto> Advances,
    IReadOnlyList<TripSettlementDto> Settlements,
    TripSummaryDto Summary
);

/// <summary>
/// Payload to create a new collaborative trip.
/// </summary>
public record CreateTripRequest(
    string Name,
    string Destination,
    DateTime StartDate,
    DateTime EndDate,
    decimal? Budget = null
);

/// <summary>
/// Payload to update trip settings and itinerary.
/// </summary>
public record UpdateTripRequest(
    string Name,
    string Destination,
    DateTime StartDate,
    DateTime EndDate,
    decimal? Budget = null,
    string? Status = null
);

/// <summary>
/// Participant record in a collaborative trip.
/// </summary>
public record TripMemberDto(
    Guid Id,
    Guid TripId,
    string GuestName,
    Guid? RegisteredUserId,
    bool CanAddExpenses,
    bool HasActiveGuestToken,
    DateTime? TokenExpiresAtUtc,
    DateTime CreatedAtUtc
);

/// <summary>
/// Request to invite/add a member to a trip.
/// </summary>
public record AddTripMemberRequest(
    string GuestName,
    Guid? RegisteredUserId = null,
    bool CanAddExpenses = true
);

/// <summary>
/// Request to generate a cryptographically secure guest token.
/// </summary>
public record CreateGuestLinkRequest(
    bool CanAddExpenses = true,
    int ExpiryDays = 30
);

/// <summary>
/// Response containing the raw one-time URL-safe guest token.
/// </summary>
public record CreateGuestLinkResponse(
    Guid MemberId,
    string GuestName,
    string RawToken,
    string GuestUrl,
    DateTime ExpiresAtUtc
);

/// <summary>
/// Individual participant allocation for an expense.
/// </summary>
public record TripExpenseSplitDto(
    Guid Id,
    Guid MemberId,
    string MemberName,
    decimal AllocatedAmount,
    decimal? AllocatedPercentage,
    int? AllocatedShares
);

/// <summary>
/// Split specification input when creating or modifying an expense.
/// </summary>
public record SplitInputDto(
    Guid MemberId,
    decimal? AllocatedAmount = null,
    decimal? AllocatedPercentage = null,
    int? AllocatedShares = null
);

/// <summary>
/// Trip expense record with payer attribution and allocated participant splits.
/// </summary>
public record TripExpenseDto(
    Guid Id,
    Guid TripId,
    Guid PayerMemberId,
    string PayerName,
    decimal Amount,
    DateTime ExpenseDate,
    string Description,
    Guid? CategoryId,
    string SplitType,
    IReadOnlyList<TripExpenseSplitDto> Splits,
    DateTime CreatedAtUtc
);

/// <summary>
/// Request to record a decentralized trip expense.
/// </summary>
public record CreateTripExpenseRequest(
    Guid PayerMemberId,
    decimal Amount,
    DateTime ExpenseDate,
    string Description,
    Guid? CategoryId = null,
    string SplitType = "Equal",
    IReadOnlyList<SplitInputDto>? Splits = null
);

/// <summary>
/// Bilateral travel advance record. Strictly isolated from trip expenses.
/// </summary>
public record TripAdvanceDto(
    Guid Id,
    Guid TripId,
    Guid GiverMemberId,
    string GiverName,
    Guid ReceiverMemberId,
    string ReceiverName,
    decimal Amount,
    DateTime AdvanceDate,
    string? Notes,
    DateTime CreatedAtUtc
);

/// <summary>
/// Request to record a travel advance between two members.
/// </summary>
public record CreateTripAdvanceRequest(
    Guid GiverMemberId,
    Guid ReceiverMemberId,
    decimal Amount,
    DateTime AdvanceDate,
    string? Notes = null
);

/// <summary>
/// Informational debt settlement record.
/// </summary>
public record TripSettlementDto(
    Guid Id,
    Guid TripId,
    Guid PayerMemberId,
    string PayerName,
    Guid ReceiverMemberId,
    string ReceiverName,
    decimal Amount,
    DateTime SettledAtUtc,
    string SettlementMethod,
    string? Notes,
    bool IsConfirmed
);

/// <summary>
/// Request to execute an informational "Settle Up" transaction.
/// </summary>
public record ExecuteSettlementRequest(
    Guid PayerMemberId,
    Guid ReceiverMemberId,
    decimal Amount,
    DateTime SettledDate,
    string PaymentMethod = "UPI",
    string? Notes = null
);

/// <summary>
/// Per-member financial spending and obligation breakdown.
/// </summary>
public record MemberSpendingSummaryDto(
    Guid MemberId,
    string MemberName,
    decimal TotalPaid,
    decimal FairShare,
    decimal AdvancesGiven,
    decimal AdvancesReceived,
    decimal SettlementsPaid,
    decimal SettlementsReceived,
    decimal NetBalance,
    bool IsSettled
);

/// <summary>
/// Minimal direct bilateral settlement instruction generated by the Greedy Debt Simplification engine.
/// </summary>
public record SettlementInstructionDto(
    Guid FromMemberId,
    string FromMemberName,
    Guid ToMemberId,
    string ToMemberName,
    decimal Amount
);

/// <summary>
/// Group spending summary and debt minimization matrix.
/// </summary>
public record TripSummaryDto(
    Guid TripId,
    decimal TotalGroupSpending,
    decimal? Budget,
    decimal? BudgetUtilizationPercentage,
    IReadOnlyList<MemberSpendingSummaryDto> MemberSummaries,
    IReadOnlyList<SettlementInstructionDto> SimplifiedRepayments
);

/// <summary>
/// Streamlined trip view scoped exclusively for cryptographic guest link sessions.
/// </summary>
public record GuestTripViewDto(
    TripDto Trip,
    TripMemberDto CurrentMember,
    IReadOnlyList<TripMemberDto> Members,
    IReadOnlyList<TripExpenseDto> Expenses,
    IReadOnlyList<TripAdvanceDto> Advances,
    IReadOnlyList<TripSettlementDto> Settlements,
    TripSummaryDto Summary
);
