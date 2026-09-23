using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Trips.DomainServices;
using WealthFlow.Application.Features.Trips.DTOs;
using WealthFlow.Application.Features.Trips.Interfaces;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;
using WealthFlow.Infrastructure.Persistence;

namespace WealthFlow.Infrastructure.Services;

/// <summary>
/// Authoritative service handling trip aggregates, multi-payer expense splits,
/// isolated travel advances, greedy debt minimization settlements, and cryptographic guest access.
/// </summary>
public class TripService : ITripService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITripNotificationService? _notificationService;

    public TripService(
        ApplicationDbContext dbContext,
        IUnitOfWork unitOfWork,
        ITripNotificationService? notificationService = null)
    {
        _dbContext = dbContext;
        _unitOfWork = unitOfWork;
        _notificationService = notificationService;
    }

    public async Task<IReadOnlyList<TripDto>> GetTripsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        // User has access if they are the Host OR a registered member
        var trips = await (from t in _dbContext.Trips
                           join m in _dbContext.TripMembers on t.Id equals m.TripId into members
                           where t.HostUserId == userId || members.Any(m => m.RegisteredUserId == userId)
                           orderby t.StartDate descending
                           select t)
            .Distinct()
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var result = new List<TripDto>(trips.Count);
        foreach (var trip in trips)
        {
            decimal totalExpenses = await _dbContext.TripExpenses
                .Where(e => e.TripId == trip.Id)
                .SumAsync(e => (decimal?)e.Amount, cancellationToken) ?? 0m;

            int memberCount = await _dbContext.TripMembers
                .CountAsync(m => m.TripId == trip.Id, cancellationToken);

            result.Add(MapToDto(trip, totalExpenses, memberCount));
        }

        return result;
    }

    public async Task<TripDetailDto> GetTripByIdAsync(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
    {
        var trip = await _dbContext.Trips.FirstOrDefaultAsync(t => t.Id == tripId, cancellationToken);
        if (trip == null)
        {
            throw new KeyNotFoundException($"Trip with ID '{tripId}' was not found.");
        }

        var members = await _unitOfWork.TripMembers.GetMembersByTripAsync(tripId, cancellationToken);
        bool hasAccess = trip.HostUserId == userId || members.Any(m => m.RegisteredUserId == userId);
        if (!hasAccess)
        {
            throw new UnauthorizedAccessException("You are not authorized to view this trip.");
        }

        var expenses = await _unitOfWork.TripExpenses.GetExpensesByTripAsync(tripId, cancellationToken);
        var splits = await _unitOfWork.TripExpenseSplits.GetSplitsByTripAsync(tripId, cancellationToken);
        var advances = await _unitOfWork.TripAdvances.GetAdvancesByTripAsync(tripId, cancellationToken);
        var settlements = await _unitOfWork.TripSettlements.GetSettlementsByTripAsync(tripId, cancellationToken);

        var summary = SettlementEngine.CalculateTripSummary(trip, members, expenses, splits, advances, settlements);

        return BuildTripDetailDto(trip, members, expenses, splits, advances, settlements, summary);
    }

    public async Task<TripDto> CreateTripAsync(Guid hostUserId, CreateTripRequest request, CancellationToken cancellationToken = default)
    {
        var trip = new Trip(
            hostUserId,
            request.Name.Trim(),
            request.Destination.Trim(),
            request.StartDate,
            request.EndDate,
            request.Budget
        );

        await _unitOfWork.Trips.AddAsync(trip, cancellationToken);

        // Add Host as the primary trip member
        var hostMember = new TripMember(
            trip.Id,
            "Host",
            hostUserId,
            null,
            null,
            true
        );
        await _unitOfWork.TripMembers.AddAsync(hostMember, cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(trip, 0m, 1);
    }

    public async Task<TripDto> UpdateTripAsync(Guid tripId, Guid userId, UpdateTripRequest request, CancellationToken cancellationToken = default)
    {
        var trip = await _unitOfWork.Trips.GetByIdAsync(tripId, cancellationToken);
        if (trip == null)
        {
            throw new KeyNotFoundException($"Trip with ID '{tripId}' was not found.");
        }

        if (trip.HostUserId != userId)
        {
            throw new UnauthorizedAccessException("Only the trip host can update trip settings.");
        }

        trip.UpdateDetails(
            request.Name.Trim(),
            request.Destination.Trim(),
            request.StartDate,
            request.EndDate,
            request.Budget
        );

        if (!string.IsNullOrEmpty(request.Status) && Enum.TryParse<TripStatus>(request.Status, true, out var status))
        {
            trip.UpdateStatus(status);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        decimal totalExpenses = await _dbContext.TripExpenses
            .Where(e => e.TripId == trip.Id)
            .SumAsync(e => (decimal?)e.Amount, cancellationToken) ?? 0m;
        int memberCount = await _dbContext.TripMembers.CountAsync(m => m.TripId == trip.Id, cancellationToken);

        return MapToDto(trip, totalExpenses, memberCount);
    }

    public async Task<TripMemberDto> AddMemberAsync(Guid tripId, Guid userId, AddTripMemberRequest request, CancellationToken cancellationToken = default)
    {
        var trip = await _unitOfWork.Trips.GetByIdAsync(tripId, cancellationToken);
        if (trip == null)
        {
            throw new KeyNotFoundException($"Trip with ID '{tripId}' was not found.");
        }

        var member = new TripMember(
            tripId,
            request.GuestName.Trim(),
            request.RegisteredUserId,
            null,
            null,
            request.CanAddExpenses
        );

        await _unitOfWork.TripMembers.AddAsync(member, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var memberDto = MapMemberToDto(member);
        if (_notificationService != null)
        {
            await _notificationService.NotifyMemberJoinedAsync(tripId, memberDto, cancellationToken);
        }

        return memberDto;
    }

    public async Task<CreateGuestLinkResponse> CreateGuestLinkAsync(
        Guid tripId,
        Guid memberId,
        Guid userId,
        CreateGuestLinkRequest request,
        CancellationToken cancellationToken = default)
    {
        var trip = await _unitOfWork.Trips.GetByIdAsync(tripId, cancellationToken);
        if (trip == null)
        {
            throw new KeyNotFoundException($"Trip with ID '{tripId}' was not found.");
        }

        if (trip.HostUserId != userId)
        {
            throw new UnauthorizedAccessException("Only the trip host can generate guest links.");
        }

        var member = await _dbContext.TripMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.TripId == tripId, cancellationToken);
        if (member == null)
        {
            throw new KeyNotFoundException($"Member with ID '{memberId}' was not found in this trip.");
        }

        // Generate 256-bit cryptographically secure entropy token
        byte[] entropy = RandomNumberGenerator.GetBytes(32);
        string rawToken = Convert.ToHexString(entropy).ToLowerInvariant();

        // Compute SHA-256 hash for secure storage
        string tokenHash = ComputeSha256Hash(rawToken);
        DateTime expiresAtUtc = DateTime.UtcNow.AddDays(request.ExpiryDays > 0 ? request.ExpiryDays : 30);

        member.SetToken(tokenHash, expiresAtUtc);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        string guestUrl = $"/trip/{tripId}/guest/{rawToken}";
        return new CreateGuestLinkResponse(member.Id, member.GuestName, rawToken, guestUrl, expiresAtUtc);
    }

    public async Task<bool> RevokeGuestLinkAsync(Guid tripId, Guid memberId, Guid userId, CancellationToken cancellationToken = default)
    {
        var trip = await _unitOfWork.Trips.GetByIdAsync(tripId, cancellationToken);
        if (trip == null || trip.HostUserId != userId)
        {
            throw new UnauthorizedAccessException("Only the trip host can revoke guest links.");
        }

        var member = await _dbContext.TripMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.TripId == tripId, cancellationToken);
        if (member == null) return false;

        // Revoke by expiring immediately and resetting hash
        member.SetToken(string.Empty, DateTime.UtcNow.AddMinutes(-5));
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<IReadOnlyList<TripExpenseDto>> GetExpensesAsync(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
    {
        var members = await _unitOfWork.TripMembers.GetMembersByTripAsync(tripId, cancellationToken);
        var memberLookup = members.ToDictionary(m => m.Id, m => m.GuestName);

        var expenses = await _unitOfWork.TripExpenses.GetExpensesByTripAsync(tripId, cancellationToken);
        var splits = await _unitOfWork.TripExpenseSplits.GetSplitsByTripAsync(tripId, cancellationToken);
        var splitsByExpense = splits.GroupBy(s => s.TripExpenseId).ToDictionary(g => g.Key, g => g.ToList());

        return expenses.Select(e => MapExpenseToDto(e, splitsByExpense.GetValueOrDefault(e.Id, new List<TripExpenseSplit>()), memberLookup)).ToList();
    }

    public async Task<TripExpenseDto> AddExpenseAsync(
        Guid tripId,
        Guid userId,
        CreateTripExpenseRequest request,
        CancellationToken cancellationToken = default)
    {
        var trip = await _unitOfWork.Trips.GetByIdAsync(tripId, cancellationToken);
        if (trip == null)
        {
            throw new KeyNotFoundException($"Trip with ID '{tripId}' was not found.");
        }

        var members = await _unitOfWork.TripMembers.GetMembersByTripAsync(tripId, cancellationToken);
        var memberLookup = members.ToDictionary(m => m.Id, m => m.GuestName);

        if (!memberLookup.ContainsKey(request.PayerMemberId))
        {
            throw new InvalidOperationException("Payer member does not belong to this trip.");
        }

        if (!Enum.TryParse<SplitType>(request.SplitType, true, out var splitType))
        {
            splitType = SplitType.Equal;
        }

        var allMemberIds = members.Select(m => m.Id).ToList();
        var calculatedSplits = SplitCalculator.CalculateSplits(
            request.Amount,
            splitType,
            request.Splits ?? new List<SplitInputDto>(),
            allMemberIds
        );

        var expense = new TripExpense(
            tripId,
            request.PayerMemberId,
            request.Amount,
            request.ExpenseDate,
            request.Description.Trim(),
            request.CategoryId,
            splitType
        );

        await _unitOfWork.TripExpenses.AddAsync(expense, cancellationToken);

        var splitEntities = new List<TripExpenseSplit>(calculatedSplits.Count);
        foreach (var cs in calculatedSplits)
        {
            var splitEntity = new TripExpenseSplit(
                expense.Id,
                cs.MemberId,
                cs.AllocatedAmount,
                cs.AllocatedPercentage,
                cs.AllocatedShares
            );
            await _unitOfWork.TripExpenseSplits.AddAsync(splitEntity, cancellationToken);
            splitEntities.Add(splitEntity);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var expenseDto = MapExpenseToDto(expense, splitEntities, memberLookup);

        if (_notificationService != null)
        {
            await _notificationService.NotifyExpenseAddedAsync(tripId, expenseDto, cancellationToken);
            var summary = await GetSummaryAsync(tripId, userId, cancellationToken);
            await _notificationService.NotifyTripSummaryUpdatedAsync(tripId, summary, cancellationToken);
        }

        return expenseDto;
    }

    public async Task<IReadOnlyList<TripAdvanceDto>> GetAdvancesAsync(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
    {
        var members = await _unitOfWork.TripMembers.GetMembersByTripAsync(tripId, cancellationToken);
        var memberLookup = members.ToDictionary(m => m.Id, m => m.GuestName);

        var advances = await _unitOfWork.TripAdvances.GetAdvancesByTripAsync(tripId, cancellationToken);
        return advances.Select(a => MapAdvanceToDto(a, memberLookup)).ToList();
    }

    public async Task<TripAdvanceDto> AddAdvanceAsync(
        Guid tripId,
        Guid userId,
        CreateTripAdvanceRequest request,
        CancellationToken cancellationToken = default)
    {
        var trip = await _unitOfWork.Trips.GetByIdAsync(tripId, cancellationToken);
        if (trip == null)
        {
            throw new KeyNotFoundException($"Trip with ID '{tripId}' was not found.");
        }

        var members = await _unitOfWork.TripMembers.GetMembersByTripAsync(tripId, cancellationToken);
        var memberLookup = members.ToDictionary(m => m.Id, m => m.GuestName);

        if (!memberLookup.ContainsKey(request.GiverMemberId) || !memberLookup.ContainsKey(request.ReceiverMemberId))
        {
            throw new InvalidOperationException("Both advance giver and receiver must be valid members of this trip.");
        }

        if (request.GiverMemberId == request.ReceiverMemberId)
        {
            throw new InvalidOperationException("Advance giver and receiver cannot be the same member.");
        }

        if (request.Amount <= 0)
        {
            throw new InvalidOperationException("Advance amount must be greater than zero.");
        }

        // CRITICAL DOMAIN INVARIANT: TripAdvance is recorded strictly in its own table
        // and does NOT touch TripExpense or increment Trip total spending.
        var advance = new TripAdvance(
            tripId,
            request.GiverMemberId,
            request.ReceiverMemberId,
            request.Amount,
            request.AdvanceDate,
            request.Notes?.Trim()
        );

        await _unitOfWork.TripAdvances.AddAsync(advance, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var advanceDto = MapAdvanceToDto(advance, memberLookup);

        if (_notificationService != null)
        {
            await _notificationService.NotifyAdvanceRecordedAsync(tripId, advanceDto, cancellationToken);
            var summary = await GetSummaryAsync(tripId, userId, cancellationToken);
            await _notificationService.NotifyTripSummaryUpdatedAsync(tripId, summary, cancellationToken);
        }

        return advanceDto;
    }

    public async Task<TripSummaryDto> GetSummaryAsync(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
    {
        var trip = await _unitOfWork.Trips.GetByIdAsync(tripId, cancellationToken);
        if (trip == null)
        {
            throw new KeyNotFoundException($"Trip with ID '{tripId}' was not found.");
        }

        var members = await _unitOfWork.TripMembers.GetMembersByTripAsync(tripId, cancellationToken);
        var expenses = await _unitOfWork.TripExpenses.GetExpensesByTripAsync(tripId, cancellationToken);
        var splits = await _unitOfWork.TripExpenseSplits.GetSplitsByTripAsync(tripId, cancellationToken);
        var advances = await _unitOfWork.TripAdvances.GetAdvancesByTripAsync(tripId, cancellationToken);
        var settlements = await _unitOfWork.TripSettlements.GetSettlementsByTripAsync(tripId, cancellationToken);

        return SettlementEngine.CalculateTripSummary(trip, members, expenses, splits, advances, settlements);
    }

    public async Task<TripSettlementDto> ExecuteSettlementAsync(
        Guid tripId,
        Guid userId,
        ExecuteSettlementRequest request,
        CancellationToken cancellationToken = default)
    {
        var trip = await _unitOfWork.Trips.GetByIdAsync(tripId, cancellationToken);
        if (trip == null)
        {
            throw new KeyNotFoundException($"Trip with ID '{tripId}' was not found.");
        }

        var members = await _unitOfWork.TripMembers.GetMembersByTripAsync(tripId, cancellationToken);
        var memberLookup = members.ToDictionary(m => m.Id, m => m.GuestName);

        if (!memberLookup.ContainsKey(request.PayerMemberId) || !memberLookup.ContainsKey(request.ReceiverMemberId))
        {
            throw new InvalidOperationException("Both payer and receiver must be valid members of this trip.");
        }

        if (request.PayerMemberId == request.ReceiverMemberId)
        {
            throw new InvalidOperationException("Payer and receiver cannot be the same member.");
        }

        if (request.Amount <= 0)
        {
            throw new InvalidOperationException("Settlement amount must be greater than zero.");
        }

        // In accordance with Zero Payment Gateway Invariant, settlements are purely informational
        // bookkeeping records confirming debt extinguishment without triggering external money movement.
        var settlement = new TripSettlement(
            tripId,
            request.PayerMemberId,
            request.ReceiverMemberId,
            request.Amount,
            request.SettledDate,
            request.PaymentMethod ?? "UPI",
            request.Notes?.Trim(),
            true
        );

        await _unitOfWork.TripSettlements.AddAsync(settlement, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var settlementDto = MapSettlementToDto(settlement, memberLookup);

        if (_notificationService != null)
        {
            await _notificationService.NotifySettlementExecutedAsync(tripId, settlementDto, cancellationToken);
            var summary = await GetSummaryAsync(tripId, userId, cancellationToken);
            await _notificationService.NotifyTripSummaryUpdatedAsync(tripId, summary, cancellationToken);
        }

        return settlementDto;
    }

    // Cryptographic Guest Link Handlers
    public async Task<GuestTripViewDto> GetGuestTripViewAsync(
        Guid tripId,
        string rawToken,
        CancellationToken cancellationToken = default)
    {
        string tokenHash = ComputeSha256Hash(rawToken);

        var member = await _dbContext.TripMembers.FirstOrDefaultAsync(
            m => m.TripId == tripId &&
                 m.GuestSecureTokenHash == tokenHash &&
                 (m.TokenExpiresAtUtc == null || m.TokenExpiresAtUtc > DateTime.UtcNow),
            cancellationToken);

        if (member == null)
        {
            throw new UnauthorizedAccessException("The guest link is invalid, expired, or has been revoked by the host.");
        }

        var trip = await _dbContext.Trips.FirstOrDefaultAsync(t => t.Id == tripId, cancellationToken);
        if (trip == null)
        {
            throw new KeyNotFoundException($"Trip with ID '{tripId}' was not found.");
        }

        var members = await _unitOfWork.TripMembers.GetMembersByTripAsync(tripId, cancellationToken);
        var expenses = await _unitOfWork.TripExpenses.GetExpensesByTripAsync(tripId, cancellationToken);
        var splits = await _unitOfWork.TripExpenseSplits.GetSplitsByTripAsync(tripId, cancellationToken);
        var advances = await _unitOfWork.TripAdvances.GetAdvancesByTripAsync(tripId, cancellationToken);
        var settlements = await _unitOfWork.TripSettlements.GetSettlementsByTripAsync(tripId, cancellationToken);

        var summary = SettlementEngine.CalculateTripSummary(trip, members, expenses, splits, advances, settlements);
        var detail = BuildTripDetailDto(trip, members, expenses, splits, advances, settlements, summary);

        return new GuestTripViewDto(
            detail.Trip,
            MapMemberToDto(member),
            detail.Members,
            detail.Expenses,
            detail.Advances,
            detail.Settlements,
            summary
        );
    }

    public async Task<TripExpenseDto> AddGuestExpenseAsync(
        Guid tripId,
        string rawToken,
        CreateTripExpenseRequest request,
        CancellationToken cancellationToken = default)
    {
        string tokenHash = ComputeSha256Hash(rawToken);

        var member = await _dbContext.TripMembers.FirstOrDefaultAsync(
            m => m.TripId == tripId &&
                 m.GuestSecureTokenHash == tokenHash &&
                 (m.TokenExpiresAtUtc == null || m.TokenExpiresAtUtc > DateTime.UtcNow),
            cancellationToken);

        if (member == null)
        {
            throw new UnauthorizedAccessException("The guest link is invalid or expired.");
        }

        if (!member.CanAddExpenses)
        {
            throw new UnauthorizedAccessException("Guest does not have write permissions to add expenses.");
        }

        // Attribution: Guest logs expense on their behalf
        var sanitizedRequest = request with { PayerMemberId = member.Id };
        return await AddExpenseAsync(tripId, Guid.Empty, sanitizedRequest, cancellationToken);
    }

    // Helper mappers
    private static string ComputeSha256Hash(string input)
    {
        byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static TripDto MapToDto(Trip t, decimal totalExpenses, int memberCount)
    {
        return new TripDto(
            t.Id,
            t.HostUserId,
            t.Name,
            t.Destination,
            t.StartDate,
            t.EndDate,
            t.Budget,
            t.Status.ToString(),
            totalExpenses,
            memberCount,
            t.CreatedAtUtc
        );
    }

    private static TripMemberDto MapMemberToDto(TripMember m)
    {
        bool hasActiveToken = !string.IsNullOrEmpty(m.GuestSecureTokenHash) &&
                              (m.TokenExpiresAtUtc == null || m.TokenExpiresAtUtc > DateTime.UtcNow);

        return new TripMemberDto(
            m.Id,
            m.TripId,
            m.GuestName,
            m.RegisteredUserId,
            m.CanAddExpenses,
            hasActiveToken,
            m.TokenExpiresAtUtc,
            m.CreatedAtUtc
        );
    }

    private static TripExpenseDto MapExpenseToDto(
        TripExpense e,
        IReadOnlyList<TripExpenseSplit> splits,
        Dictionary<Guid, string> memberLookup)
    {
        var splitDtos = splits.Select(s => new TripExpenseSplitDto(
            s.Id,
            s.MemberId,
            memberLookup.GetValueOrDefault(s.MemberId, "Unknown Member"),
            s.AllocatedAmount,
            s.AllocatedPercentage,
            s.AllocatedShares
        )).ToList();

        return new TripExpenseDto(
            e.Id,
            e.TripId,
            e.PayerMemberId,
            memberLookup.GetValueOrDefault(e.PayerMemberId, "Unknown Member"),
            e.Amount,
            e.ExpenseDate,
            e.Description,
            e.CategoryId,
            e.SplitType.ToString(),
            splitDtos,
            e.CreatedAtUtc
        );
    }

    private static TripAdvanceDto MapAdvanceToDto(TripAdvance a, Dictionary<Guid, string> memberLookup)
    {
        return new TripAdvanceDto(
            a.Id,
            a.TripId,
            a.GiverMemberId,
            memberLookup.GetValueOrDefault(a.GiverMemberId, "Unknown Member"),
            a.ReceiverMemberId,
            memberLookup.GetValueOrDefault(a.ReceiverMemberId, "Unknown Member"),
            a.Amount,
            a.AdvanceDate,
            a.Notes,
            a.CreatedAtUtc
        );
    }

    private static TripSettlementDto MapSettlementToDto(TripSettlement s, Dictionary<Guid, string> memberLookup)
    {
        return new TripSettlementDto(
            s.Id,
            s.TripId,
            s.PayerMemberId,
            memberLookup.GetValueOrDefault(s.PayerMemberId, "Unknown Member"),
            s.ReceiverMemberId,
            memberLookup.GetValueOrDefault(s.ReceiverMemberId, "Unknown Member"),
            s.Amount,
            s.SettledAtUtc,
            s.SettlementMethod,
            s.Notes,
            s.IsConfirmed
        );
    }

    private static TripDetailDto BuildTripDetailDto(
        Trip trip,
        IReadOnlyList<TripMember> members,
        IReadOnlyList<TripExpense> expenses,
        IReadOnlyList<TripExpenseSplit> splits,
        IReadOnlyList<TripAdvance> advances,
        IReadOnlyList<TripSettlement> settlements,
        TripSummaryDto summary)
    {
        var memberLookup = members.ToDictionary(m => m.Id, m => m.GuestName);
        var splitsByExpense = splits.GroupBy(s => s.TripExpenseId).ToDictionary(g => g.Key, g => g.ToList());

        decimal totalExpenses = expenses.Sum(e => e.Amount);
        var tripDto = MapToDto(trip, totalExpenses, members.Count);

        var memberDtos = members.Select(MapMemberToDto).ToList();
        var expenseDtos = expenses.Select(e => MapExpenseToDto(e, splitsByExpense.GetValueOrDefault(e.Id, new List<TripExpenseSplit>()), memberLookup)).ToList();
        var advanceDtos = advances.Select(a => MapAdvanceToDto(a, memberLookup)).ToList();
        var settlementDtos = settlements.Select(s => MapSettlementToDto(s, memberLookup)).ToList();

        return new TripDetailDto(
            tripDto,
            memberDtos,
            expenseDtos,
            advanceDtos,
            settlementDtos,
            summary
        );
    }
}
