using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Investments.DTOs;
using WealthFlow.Application.Features.Investments.Interfaces;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Infrastructure.Services;

/// <summary>
/// Service implementing investment portfolio management, recurring SIP execution,
/// and co-funded joint SIP bilateral reconciliation with exact net worth preservation.
/// </summary>
public class InvestmentService : IInvestmentService
{
    private readonly IUnitOfWork _unitOfWork;

    public InvestmentService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<InvestmentSummaryDto> GetInvestmentSummaryAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var investments = await _unitOfWork.Investments.GetInvestmentsByUserAsync(userId, cancellationToken);
        var dtos = investments.Select(MapToDto).ToList();

        var totalInvested = investments.Sum(i => i.InvestedAmount);
        var totalValuation = investments.Sum(i => i.CurrentValue);
        var totalGainLoss = totalValuation - totalInvested;
        var overallReturn = totalInvested > 0m
            ? Math.Round((totalGainLoss / totalInvested) * 100m, 2)
            : 0m;

        // Group by Asset Class for allocation breakdown
        var allocations = investments
            .GroupBy(i => i.AssetClass)
            .Select(g =>
            {
                var val = g.Sum(i => i.CurrentValue);
                var inv = g.Sum(i => i.InvestedAmount);
                var pct = totalValuation > 0m
                    ? Math.Round((val / totalValuation) * 100m, 2)
                    : 0m;
                return new AssetAllocationDto(
                    AssetClass: g.Key.ToString(),
                    TotalInvested: inv,
                    TotalValuation: val,
                    AllocationPercentage: pct
                );
            })
            .OrderByDescending(a => a.TotalValuation)
            .ToList();

        return new InvestmentSummaryDto(
            TotalInvestedAmount: totalInvested,
            TotalCurrentValuation: totalValuation,
            TotalAbsoluteGainLoss: totalGainLoss,
            OverallReturnPercentage: overallReturn,
            AssetAllocation: allocations,
            Investments: dtos
        );
    }

    public async Task<IReadOnlyList<InvestmentDto>> GetInvestmentsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var investments = await _unitOfWork.Investments.GetInvestmentsByUserAsync(userId, cancellationToken);
        return investments.Select(MapToDto).ToList();
    }

    public async Task<InvestmentDto> GetInvestmentByIdAsync(Guid userId, Guid investmentId, CancellationToken cancellationToken = default)
    {
        var investment = await _unitOfWork.Investments.GetByIdAsync(investmentId, userId, cancellationToken);
        if (investment == null)
        {
            throw new KeyNotFoundException($"Investment asset with ID {investmentId} was not found.");
        }

        return MapToDto(investment);
    }

    public async Task<InvestmentDto> CreateInvestmentAsync(Guid userId, CreateInvestmentRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Investment name is required.", nameof(request));
        }

        if (!Enum.TryParse<AssetClass>(request.AssetClass, true, out var assetClass))
        {
            throw new ArgumentException($"Invalid asset class '{request.AssetClass}'.", nameof(request));
        }

        if (request.InvestedAmount < 0m || request.CurrentValuation < 0m)
        {
            throw new ArgumentException("Monetary amounts cannot be negative.", nameof(request));
        }

        var investment = new Investment(
            userId: userId,
            name: request.Name.Trim(),
            assetClass: assetClass,
            investedAmount: request.InvestedAmount,
            currentValue: request.CurrentValuation,
            units: request.Units,
            lastValuationDate: request.ValuationDate ?? DateTime.UtcNow
        );

        await _unitOfWork.Investments.AddAsync(investment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(investment);
    }

    public async Task<InvestmentDto> UpdateValuationAsync(Guid userId, Guid investmentId, UpdateValuationRequest request, CancellationToken cancellationToken = default)
    {
        var investment = await _unitOfWork.Investments.GetByIdAsync(investmentId, userId, cancellationToken);
        if (investment == null)
        {
            throw new KeyNotFoundException($"Investment asset with ID {investmentId} was not found.");
        }

        if (request.CurrentValuation < 0m)
        {
            throw new ArgumentException("Current valuation cannot be negative.", nameof(request));
        }

        investment.UpdateValuation(request.CurrentValuation, request.Units, request.ValuationDate);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(investment);
    }

    public async Task DeleteInvestmentAsync(Guid userId, Guid investmentId, CancellationToken cancellationToken = default)
    {
        var investment = await _unitOfWork.Investments.GetByIdAsync(investmentId, userId, cancellationToken);
        if (investment == null)
        {
            throw new KeyNotFoundException($"Investment asset with ID {investmentId} was not found.");
        }

        await _unitOfWork.Investments.DeleteAsync(investment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    // --- SIP Scheduler & Execution ---

    public async Task<IReadOnlyList<SipDto>> GetSipsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var sips = await _unitOfWork.Sips.GetSipsByUserAsync(userId, cancellationToken);
        var investments = await _unitOfWork.Investments.GetInvestmentsByUserAsync(userId, cancellationToken);
        var invMap = investments.ToDictionary(i => i.Id, i => i.Name);
        var accounts = await _unitOfWork.Accounts.GetAccountsByUserAsync(userId, true, cancellationToken);
        var accMap = accounts.ToDictionary(a => a.Id, a => a.Name);

        return sips.Select(s => MapToSipDto(s, invMap, accMap)).ToList();
    }

    public async Task<SipDto> CreateSipAsync(Guid userId, CreateSipRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("SIP name is required.", nameof(request));
        }

        if (request.Amount <= 0m)
        {
            throw new ArgumentException("SIP amount must be greater than zero.", nameof(request));
        }

        if (request.ExecutionDay < 1 || request.ExecutionDay > 31)
        {
            throw new ArgumentException("Execution day must be between 1 and 31.", nameof(request));
        }

        var investment = await _unitOfWork.Investments.GetByIdAsync(request.InvestmentId, userId, cancellationToken);
        if (investment == null)
        {
            throw new KeyNotFoundException($"Investment with ID {request.InvestmentId} was not found.");
        }

        var sourceAccount = await _unitOfWork.Accounts.GetByIdAsync(request.SourceAccountId, cancellationToken);
        if (sourceAccount == null || sourceAccount.UserId != userId)
        {
            throw new KeyNotFoundException($"Source account with ID {request.SourceAccountId} was not found.");
        }

        decimal userShare = request.Amount;
        decimal coInvestorShare = 0m;
        string? coInvestorName = null;

        if (request.IsJoint)
        {
            if (string.IsNullOrWhiteSpace(request.CoInvestorName))
            {
                throw new ArgumentException("Co-investor name is required for joint SIPs.", nameof(request));
            }

            userShare = request.UserShare ?? Math.Round(request.Amount / 2m, 2);
            coInvestorShare = request.CoInvestorShare ?? (request.Amount - userShare);
            coInvestorName = request.CoInvestorName.Trim();

            if (userShare + coInvestorShare != request.Amount)
            {
                throw new ArgumentException("User share and co-investor share must sum exactly to the total SIP amount.", nameof(request));
            }
        }

        var sip = new SIP(
            userId: userId,
            investmentId: investment.Id,
            sourceAccountId: sourceAccount.Id,
            name: request.Name.Trim(),
            amount: request.Amount,
            executionDay: request.ExecutionDay,
            startDate: request.StartDate,
            endDate: request.EndDate,
            isJoint: request.IsJoint,
            userShare: userShare,
            coInvestorShare: coInvestorShare,
            coInvestorName: coInvestorName
        );

        await _unitOfWork.Sips.AddAsync(sip, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var invMap = new Dictionary<Guid, string> { [investment.Id] = investment.Name };
        var accMap = new Dictionary<Guid, string> { [sourceAccount.Id] = sourceAccount.Name };
        return MapToSipDto(sip, invMap, accMap);
    }

    public async Task<SipDto> UpdateSipStatusAsync(Guid userId, Guid sipId, UpdateSipStatusRequest request, CancellationToken cancellationToken = default)
    {
        var sip = await _unitOfWork.Sips.GetByIdAsync(sipId, userId, cancellationToken);
        if (sip == null)
        {
            throw new KeyNotFoundException($"SIP with ID {sipId} was not found.");
        }

        if (!Enum.TryParse<SipStatus>(request.Status, true, out var status))
        {
            throw new ArgumentException($"Invalid SIP status '{request.Status}'.", nameof(request));
        }

        sip.UpdateStatus(status);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var investment = await _unitOfWork.Investments.GetByIdAsync(sip.InvestmentId, userId, cancellationToken);
        var sourceAccount = await _unitOfWork.Accounts.GetByIdAsync(sip.SourceAccountId, cancellationToken);

        var invMap = investment != null ? new Dictionary<Guid, string> { [investment.Id] = investment.Name } : new Dictionary<Guid, string>();
        var accMap = sourceAccount != null ? new Dictionary<Guid, string> { [sourceAccount.Id] = sourceAccount.Name } : new Dictionary<Guid, string>();
        return MapToSipDto(sip, invMap, accMap);
    }

    /// <summary>
    /// Executes a SIP cycle preserving exact accounting invariants.
    /// Joint SIP Execution: Bank -TotalAmount, User Equity +UserShare, Partner Loan Receivable +PartnerShare.
    /// Net worth change: ZERO.
    /// </summary>
    public async Task<ExecuteSipResponse> ExecuteSipAsync(Guid userId, Guid sipId, DateTime? executionDate = null, CancellationToken cancellationToken = default)
    {
        var sip = await _unitOfWork.Sips.GetByIdAsync(sipId, userId, cancellationToken);
        if (sip == null)
        {
            throw new KeyNotFoundException($"SIP with ID {sipId} was not found.");
        }

        var sourceAccount = await _unitOfWork.Accounts.GetByIdAsync(sip.SourceAccountId, cancellationToken);
        if (sourceAccount == null || sourceAccount.UserId != userId)
        {
            throw new KeyNotFoundException($"Source account with ID {sip.SourceAccountId} was not found.");
        }

        var investment = await _unitOfWork.Investments.GetByIdAsync(sip.InvestmentId, userId, cancellationToken);
        if (investment == null)
        {
            throw new KeyNotFoundException($"Target investment with ID {sip.InvestmentId} was not found.");
        }

        var execDateUtc = executionDate.HasValue
            ? (executionDate.Value.Kind == DateTimeKind.Utc ? executionDate.Value : DateTime.SpecifyKind(executionDate.Value, DateTimeKind.Utc))
            : DateTime.UtcNow;

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            // 1. Bank Account is always debited by the full monthly execution amount
            sourceAccount.AdjustBalance(-sip.Amount);

            Guid? linkedLoanId = null;
            Guid? reconciliationId = null;
            Transaction? mainTx = null;

            if (!sip.IsJoint)
            {
                // Standard Individual SIP: Full amount adds to user portfolio equity
                investment.AddInvestment(sip.Amount);

                mainTx = new Transaction(
                    userId: userId,
                    accountId: sourceAccount.Id,
                    amount: sip.Amount,
                    transactionDate: execDateUtc,
                    eventType: TransactionEventType.Investment,
                    description: $"SIP Execution - {sip.Name} ({investment.Name})",
                    merchant: investment.Name,
                    notes: "Automated recurring SIP execution",
                    linkedEntityId: investment.Id
                );

                await _unitOfWork.Transactions.AddAsync(mainTx, cancellationToken);
            }
            else
            {
                // CRITICAL JOINT SIP ACCOUNTING RULE:
                // User personal equity increases strictly by UserShare (e.g. ₹7,500)
                investment.AddInvestment(sip.UserShare);

                // Transaction 1: User equity capital allocation
                mainTx = new Transaction(
                    userId: userId,
                    accountId: sourceAccount.Id,
                    amount: sip.UserShare,
                    transactionDate: execDateUtc,
                    eventType: TransactionEventType.Investment,
                    description: $"Joint SIP Equity ({sip.Name} - User Share)",
                    merchant: investment.Name,
                    notes: $"Joint SIP with {sip.CoInvestorName}",
                    linkedEntityId: investment.Id
                );
                await _unitOfWork.Transactions.AddAsync(mainTx, cancellationToken);

                // Partner's share is booked as an active Loan Receivable asset from partner
                var existingLoans = await _unitOfWork.Loans.GetLoansByUserAsync(userId, cancellationToken);
                var partnerLoan = existingLoans.FirstOrDefault(l =>
                    l.Direction == LoanDirection.Given &&
                    !l.IsSettled &&
                    l.CounterpartyName.Equals(sip.CoInvestorName, StringComparison.OrdinalIgnoreCase));

                if (partnerLoan != null)
                {
                    // Increase loan receivable balance
                    partnerLoan.RecordRepayment(-sip.CoInvestorShare); // Reverses repayment to increase outstanding balance
                    linkedLoanId = partnerLoan.Id;
                }
                else
                {
                    // Create new Loan Receivable asset for the partner
                    var newLoan = new Loan(
                        userId: userId,
                        direction: LoanDirection.Given,
                        counterpartyName: sip.CoInvestorName ?? "Partner",
                        principalAmount: sip.CoInvestorShare,
                        counterpartyContact: null,
                        dueDate: execDateUtc.AddMonths(1),
                        disbursementAccountId: sourceAccount.Id,
                        notes: $"Co-funded SIP contribution for {sip.Name}"
                    );
                    await _unitOfWork.Loans.AddAsync(newLoan, cancellationToken);
                    linkedLoanId = newLoan.Id;
                }

                // Transaction 2: Loan given (receivable created) for partner share
                var loanTx = new Transaction(
                    userId: userId,
                    accountId: sourceAccount.Id,
                    amount: sip.CoInvestorShare,
                    transactionDate: execDateUtc,
                    eventType: TransactionEventType.LoanGiven,
                    description: $"Joint SIP Advance/Receivable from {sip.CoInvestorName} ({sip.Name})",
                    merchant: sip.CoInvestorName,
                    notes: $"Partner share of {sip.Name} monthly debit",
                    linkedEntityId: linkedLoanId
                );
                await _unitOfWork.Transactions.AddAsync(loanTx, cancellationToken);

                // Record monthly reconciliation cycle
                var reconciliation = new JointSipReconciliation(
                    sipId: sip.Id,
                    userId: userId,
                    month: execDateUtc.Month,
                    year: execDateUtc.Year,
                    executionDateUtc: execDateUtc,
                    totalAmount: sip.Amount,
                    userShare: sip.UserShare,
                    coInvestorShare: sip.CoInvestorShare,
                    notes: $"Monthly cycle for {execDateUtc:MMMM yyyy}"
                );

                await _unitOfWork.JointSipReconciliations.AddAsync(reconciliation, cancellationToken);
                reconciliationId = reconciliation.Id;
            }

            await _unitOfWork.CommitTransactionAsync(cancellationToken);

            return new ExecuteSipResponse(
                SipId: sip.Id,
                TransactionId: mainTx.Id,
                InvestmentId: investment.Id,
                SourceAccountId: sourceAccount.Id,
                TotalDebited: sip.Amount,
                UserEquityShare: sip.IsJoint ? sip.UserShare : sip.Amount,
                CoInvestorReceivableShare: sip.IsJoint ? sip.CoInvestorShare : 0m,
                LinkedLoanId: linkedLoanId,
                ReconciliationId: reconciliationId,
                ExecutedDateUtc: execDateUtc
            );
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync(cancellationToken);
            throw;
        }
    }

    public async Task<int> ExecuteDueSipsAsync(DateTime asOfDateUtc, CancellationToken cancellationToken = default)
    {
        var dueSips = await _unitOfWork.Sips.GetDueSipsAsync(asOfDateUtc.Day, cancellationToken);
        int count = 0;

        foreach (var sip in dueSips)
        {
            try
            {
                await ExecuteSipAsync(sip.UserId, sip.Id, asOfDateUtc, cancellationToken);
                count++;
            }
            catch
            {
                // Continue to next SIP if one fails
            }
        }

        return count;
    }

    public async Task DeleteSipAsync(Guid userId, Guid sipId, CancellationToken cancellationToken = default)
    {
        var sip = await _unitOfWork.Sips.GetByIdAsync(sipId, userId, cancellationToken);
        if (sip == null)
        {
            throw new KeyNotFoundException($"SIP with ID {sipId} was not found.");
        }

        await _unitOfWork.Sips.DeleteAsync(sip, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    // --- Joint SIP Bilateral Reconciliation ---

    public async Task<JointSipSummaryDto> GetJointSipsSummaryAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var jointSips = await _unitOfWork.Sips.GetJointSipsByUserAsync(userId, cancellationToken);
        var details = new List<JointSipDetailDto>();

        var allReconciliations = await _unitOfWork.JointSipReconciliations.GetReconciliationsByUserAsync(userId, cancellationToken);
        var investments = await _unitOfWork.Investments.GetInvestmentsByUserAsync(userId, cancellationToken);
        var invMap = investments.ToDictionary(i => i.Id, i => i.Name);
        var accounts = await _unitOfWork.Accounts.GetAccountsByUserAsync(userId, true, cancellationToken);
        var accMap = accounts.ToDictionary(a => a.Id, a => a.Name);

        decimal totalCommitment = 0m;
        decimal totalUserShare = 0m;
        decimal totalPartnerShare = 0m;
        decimal totalPartnerDue = 0m;

        foreach (var sip in jointSips)
        {
            var sipRecons = allReconciliations
                .Where(r => r.SIPId == sip.Id)
                .OrderByDescending(r => r.Year)
                .ThenByDescending(r => r.Month)
                .Select(r => MapToReconDto(r, sip.Name))
                .ToList();

            var due = sipRecons.Sum(r => r.RemainingDue);
            var settled = sipRecons.Sum(r => r.AmountSettled);
            var pendingCount = sipRecons.Count(r => r.SettlementStatus != "Settled");

            totalCommitment += sip.Amount;
            totalUserShare += sip.UserShare;
            totalPartnerShare += sip.CoInvestorShare;
            totalPartnerDue += due;

            details.Add(new JointSipDetailDto(
                Sip: MapToSipDto(sip, invMap, accMap),
                TotalPartnerDueAcrossCycles: due,
                TotalPartnerSettledAcrossCycles: settled,
                PendingCyclesCount: pendingCount,
                Reconciliations: sipRecons
            ));
        }

        return new JointSipSummaryDto(
            TotalJointSipsCount: jointSips.Count,
            TotalMonthlyCommitment: totalCommitment,
            TotalUserMonthlyShare: totalUserShare,
            TotalPartnerMonthlyShare: totalPartnerShare,
            TotalPartnerReceivableDue: totalPartnerDue,
            JointSips: details
        );
    }

    public async Task<JointSipDetailDto> GetJointSipDetailAsync(Guid userId, Guid sipId, CancellationToken cancellationToken = default)
    {
        var sip = await _unitOfWork.Sips.GetByIdAsync(sipId, userId, cancellationToken);
        if (sip == null || !sip.IsJoint)
        {
            throw new KeyNotFoundException($"Joint SIP with ID {sipId} was not found.");
        }

        var recons = await _unitOfWork.JointSipReconciliations.GetReconciliationsBySipAsync(sipId, cancellationToken);
        var reconDtos = recons.Select(r => MapToReconDto(r, sip.Name)).ToList();

        var investment = await _unitOfWork.Investments.GetByIdAsync(sip.InvestmentId, userId, cancellationToken);
        var sourceAccount = await _unitOfWork.Accounts.GetByIdAsync(sip.SourceAccountId, cancellationToken);
        var invMap = investment != null ? new Dictionary<Guid, string> { [investment.Id] = investment.Name } : new Dictionary<Guid, string>();
        var accMap = sourceAccount != null ? new Dictionary<Guid, string> { [sourceAccount.Id] = sourceAccount.Name } : new Dictionary<Guid, string>();

        var due = reconDtos.Sum(r => r.RemainingDue);
        var settled = reconDtos.Sum(r => r.AmountSettled);
        var pendingCount = reconDtos.Count(r => r.SettlementStatus != "Settled");

        return new JointSipDetailDto(
            Sip: MapToSipDto(sip, invMap, accMap),
            TotalPartnerDueAcrossCycles: due,
            TotalPartnerSettledAcrossCycles: settled,
            PendingCyclesCount: pendingCount,
            Reconciliations: reconDtos
        );
    }

    public async Task<SipRepaymentResponse> SettleReconciliationAsync(Guid userId, Guid reconciliationId, SipRepaymentRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Amount <= 0m)
        {
            throw new ArgumentException("Repayment amount must be greater than zero.", nameof(request));
        }

        var reconciliation = await _unitOfWork.JointSipReconciliations.GetByIdAsync(reconciliationId, userId, cancellationToken);
        if (reconciliation == null)
        {
            throw new KeyNotFoundException($"Reconciliation cycle with ID {reconciliationId} was not found.");
        }

        if (reconciliation.SettlementStatus == SettlementStatus.Settled)
        {
            throw new InvalidOperationException("This reconciliation cycle is already fully settled.");
        }

        Account? destAccount = null;
        if (!request.IsMutualDebtOffset)
        {
            if (!request.DestinationAccountId.HasValue)
            {
                throw new ArgumentException("Destination account is required when not offsetting against mutual debt.", nameof(request));
            }

            destAccount = await _unitOfWork.Accounts.GetByIdAsync(request.DestinationAccountId.Value, cancellationToken);
            if (destAccount == null || destAccount.UserId != userId)
            {
                throw new KeyNotFoundException($"Destination account with ID {request.DestinationAccountId.Value} was not found.");
            }
        }

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var paymentDateUtc = request.PaymentDate.Kind == DateTimeKind.Utc
                ? request.PaymentDate
                : DateTime.SpecifyKind(request.PaymentDate, DateTimeKind.Utc);

            // Record settlement on the cycle record
            var notes = request.IsMutualDebtOffset
                ? $"Settled via Mutual Debt Offset: {request.OffsetNotes ?? request.Notes}"
                : $"Settled via {request.PaymentMode}: {request.Notes}";

            reconciliation.RecordSettlement(request.Amount, paymentDateUtc, notes);

            // If cash/UPI payment received, credit the bank account and log transaction
            if (destAccount != null)
            {
                destAccount.AdjustBalance(request.Amount);

                var tx = new Transaction(
                    userId: userId,
                    accountId: destAccount.Id,
                    amount: request.Amount,
                    transactionDate: paymentDateUtc,
                    eventType: TransactionEventType.Income,
                    description: $"Joint SIP Partner Repayment ({reconciliation.Month:00}/{reconciliation.Year})",
                    merchant: "Partner Contribution",
                    notes: notes,
                    linkedEntityId: reconciliation.Id
                );

                await _unitOfWork.Transactions.AddAsync(tx, cancellationToken);
            }

            // Also reduce active loan receivable from partner if exists
            var sip = await _unitOfWork.Sips.GetByIdAsync(reconciliation.SIPId, userId, cancellationToken);
            if (sip?.CoInvestorName != null)
            {
                var loans = await _unitOfWork.Loans.GetLoansByUserAsync(userId, cancellationToken);
                var partnerLoan = loans.FirstOrDefault(l =>
                    l.Direction == LoanDirection.Given &&
                    !l.IsSettled &&
                    l.CounterpartyName.Equals(sip.CoInvestorName, StringComparison.OrdinalIgnoreCase));

                if (partnerLoan != null)
                {
                    partnerLoan.RecordRepayment(request.Amount);
                }
            }

            await _unitOfWork.CommitTransactionAsync(cancellationToken);

            var remaining = Math.Max(0m, reconciliation.CoInvestorShare - reconciliation.AmountSettled);
            return new SipRepaymentResponse(
                ReconciliationId: reconciliation.Id,
                AmountSettled: reconciliation.AmountSettled,
                RemainingDue: remaining,
                Status: reconciliation.SettlementStatus.ToString(),
                IsSettled: reconciliation.SettlementStatus == SettlementStatus.Settled,
                UpdatedAccountBalance: destAccount?.CurrentBalance
            );
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync(cancellationToken);
            throw;
        }
    }

    private static InvestmentDto MapToDto(Investment i)
    {
        var gainLoss = i.CurrentValue - i.InvestedAmount;
        var returnPct = i.InvestedAmount > 0m
            ? Math.Round((gainLoss / i.InvestedAmount) * 100m, 2)
            : 0m;

        return new InvestmentDto(
            Id: i.Id,
            Name: i.Name,
            AssetClass: i.AssetClass.ToString(),
            InvestedAmount: i.InvestedAmount,
            CurrentValuation: i.CurrentValue,
            Units: i.Units,
            AbsoluteGainLoss: gainLoss,
            ReturnPercentage: returnPct,
            LastValuationDate: i.LastValuationDate,
            CreatedAtUtc: i.CreatedAtUtc
        );
    }

    private static SipDto MapToSipDto(SIP s, IReadOnlyDictionary<Guid, string> invMap, IReadOnlyDictionary<Guid, string> accMap)
    {
        invMap.TryGetValue(s.InvestmentId, out var invName);
        accMap.TryGetValue(s.SourceAccountId, out var accName);

        var now = DateTime.UtcNow;
        var daysInMonth = DateTime.DaysInMonth(now.Year, now.Month);
        var targetDay = Math.Min(s.ExecutionDay, daysInMonth);
        var thisMonthDate = new DateTime(now.Year, now.Month, targetDay, 0, 0, 0, DateTimeKind.Utc);

        DateTime nextExecDate;
        if (now <= thisMonthDate)
        {
            nextExecDate = thisMonthDate;
        }
        else
        {
            var nextMonth = now.AddMonths(1);
            var nextMonthDays = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month);
            nextExecDate = new DateTime(nextMonth.Year, nextMonth.Month, Math.Min(s.ExecutionDay, nextMonthDays), 0, 0, 0, DateTimeKind.Utc);
        }

        return new SipDto(
            Id: s.Id,
            InvestmentId: s.InvestmentId,
            InvestmentName: invName ?? "Unknown Investment",
            SourceAccountId: s.SourceAccountId,
            SourceAccountName: accName ?? "Unknown Account",
            Name: s.Name,
            Amount: s.Amount,
            ExecutionDay: s.ExecutionDay,
            StartDate: s.StartDate,
            EndDate: s.EndDate,
            Status: s.Status.ToString(),
            IsJoint: s.IsJoint,
            UserShare: s.UserShare,
            CoInvestorShare: s.CoInvestorShare,
            CoInvestorName: s.CoInvestorName,
            NextExecutionDate: nextExecDate,
            CreatedAtUtc: s.CreatedAtUtc
        );
    }

    private static JointSipReconciliationDto MapToReconDto(JointSipReconciliation r, string sipName)
    {
        var remaining = Math.Max(0m, r.CoInvestorShare - r.AmountSettled);
        return new JointSipReconciliationDto(
            Id: r.Id,
            SIPId: r.SIPId,
            SipName: sipName,
            Month: r.Month,
            Year: r.Year,
            ExecutionDateUtc: r.ExecutionDateUtc,
            TotalAmount: r.TotalAmount,
            UserShare: r.UserShare,
            CoInvestorShare: r.CoInvestorShare,
            AmountSettled: r.AmountSettled,
            RemainingDue: remaining,
            SettlementStatus: r.SettlementStatus.ToString(),
            SettlementDateUtc: r.SettlementDateUtc,
            Notes: r.Notes
        );
    }
}
