using System.Globalization;
using System.Text;
using Microsoft.Extensions.Logging;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Data.DTOs;
using WealthFlow.Domain.Entities;
using WealthFlow.Domain.Enums;

namespace WealthFlow.Infrastructure.Services;

/// <summary>
/// Service implementing user data export and import for JSON and CSV formats.
/// Executes transactional imports guaranteeing atomic all-or-nothing consistency.
/// </summary>
public class DataTransferService : IDataTransferService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IFileStorageService _fileStorageService;
    private readonly ILogger<DataTransferService> _logger;

    public DataTransferService(
        IUnitOfWork unitOfWork,
        IFileStorageService fileStorageService,
        ILogger<DataTransferService> logger)
    {
        _unitOfWork = unitOfWork;
        _fileStorageService = fileStorageService;
        _logger = logger;
    }

    public async Task<DataExportDto> ExportUserDataJsonAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Exporting full JSON data dump for user {UserId}", userId);

        var accounts = await _unitOfWork.Accounts.ListAsync(a => a.UserId == userId, cancellationToken);
        var categories = await _unitOfWork.Categories.ListAsync(c => c.UserId == userId || c.UserId == null, cancellationToken);
        var transactions = await _unitOfWork.Transactions.ListAsync(t => t.UserId == userId, cancellationToken);
        var budgets = await _unitOfWork.Budgets.ListAsync(b => b.UserId == userId, cancellationToken);
        var cards = await _unitOfWork.CreditCards.ListAsync(c => c.UserId == userId, cancellationToken);
        var loans = await _unitOfWork.Loans.ListAsync(l => l.UserId == userId, cancellationToken);
        var investments = await _unitOfWork.Investments.ListAsync(i => i.UserId == userId, cancellationToken);
        var sips = await _unitOfWork.Sips.ListAsync(s => s.UserId == userId, cancellationToken);
        var trips = await _unitOfWork.Trips.ListAsync(t => t.HostUserId == userId, cancellationToken);

        return new DataExportDto
        {
            Version = "1.0.0",
            ExportedAtUtc = DateTime.UtcNow,
            UserId = userId,
            Accounts = accounts.Select(a => new AccountExportDto
            {
                Id = a.Id,
                Name = a.Name,
                AccountType = a.AccountType.ToString(),
                OpeningBalance = a.OpeningBalance,
                CurrentBalance = a.CurrentBalance,
                Currency = a.Currency,
                AccountNumberMask = a.AccountNumberMask,
                ColorTag = a.ColorTag,
                IsActive = a.IsActive,
                SortOrder = a.SortOrder
            }).ToList(),
            Categories = categories.Select(c => new CategoryExportDto
            {
                Id = c.Id,
                Name = c.Name,
                Icon = c.Icon,
                ColorHex = c.ColorHex,
                IsSpecialProtein = c.IsSpecialProtein,
                IsSpecialClothing = c.IsSpecialClothing,
                IsActive = c.IsActive,
                UserId = c.UserId
            }).ToList(),
            Transactions = transactions.Select(t => new TransactionExportDto
            {
                Id = t.Id,
                AccountId = t.AccountId,
                CategoryId = t.CategoryId,
                Amount = t.Amount,
                TransactionDate = t.TransactionDate,
                EventType = t.EventType.ToString(),
                Description = t.Description,
                Merchant = t.Merchant,
                Notes = t.Notes,
                Tags = t.Tags,
                LinkedEntityId = t.LinkedEntityId,
                IdempotencyKey = t.IdempotencyKey
            }).ToList(),
            Budgets = budgets.Select(b => new BudgetExportDto
            {
                Id = b.Id,
                CategoryId = b.CategoryId,
                MonthlyLimit = b.MonthlyLimit,
                Period = b.Period.ToString(),
                StartDate = b.StartDate,
                IsActive = b.IsActive
            }).ToList(),
            CreditCards = cards.Select(c => new CreditCardExportDto
            {
                Id = c.Id,
                CardName = c.CardName,
                Issuer = c.Issuer,
                Last4Digits = c.Last4Digits,
                CreditLimit = c.CreditLimit,
                CurrentOutstanding = c.CurrentOutstanding,
                BillingCycleDay = c.BillingCycleDay,
                DueDay = c.DueDay,
                ColorTag = c.ColorTag,
                IsActive = c.IsActive
            }).ToList(),
            Loans = loans.Select(l => new LoanExportDto
            {
                Id = l.Id,
                Direction = l.Direction.ToString(),
                CounterpartyName = l.CounterpartyName,
                CounterpartyContact = l.CounterpartyContact,
                PrincipalAmount = l.PrincipalAmount,
                OutstandingBalance = l.OutstandingBalance,
                DueDate = l.DueDate,
                DisbursementAccountId = l.DisbursementAccountId,
                Notes = l.Notes,
                Status = l.Status.ToString()
            }).ToList(),
            Investments = investments.Select(i => new InvestmentExportDto
            {
                Id = i.Id,
                Name = i.Name,
                AssetClass = i.AssetClass.ToString(),
                InvestedAmount = i.InvestedAmount,
                CurrentValue = i.CurrentValue,
                Units = i.Units,
                LastValuationDate = i.LastValuationDate
            }).ToList(),
            Sips = sips.Select(s => new SipExportDto
            {
                Id = s.Id,
                InvestmentId = s.InvestmentId,
                SourceAccountId = s.SourceAccountId,
                Name = s.Name,
                Amount = s.Amount,
                ExecutionDay = s.ExecutionDay,
                StartDate = s.StartDate,
                EndDate = s.EndDate,
                IsJoint = s.IsJoint,
                UserShare = s.UserShare,
                CoInvestorShare = s.CoInvestorShare,
                CoInvestorName = s.CoInvestorName,
                Status = s.Status.ToString()
            }).ToList(),
            Trips = trips.Select(t => new TripExportDto
            {
                Id = t.Id,
                Name = t.Name,
                Destination = t.Destination,
                StartDate = t.StartDate,
                EndDate = t.EndDate,
                Budget = t.Budget,
                Status = t.Status.ToString()
            }).ToList()
        };
    }

    public async Task<byte[]> ExportTransactionsCsvAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Exporting transactions CSV for user {UserId}", userId);

        var transactions = await _unitOfWork.Transactions.ListAsync(t => t.UserId == userId, cancellationToken);
        var accounts = (await _unitOfWork.Accounts.ListAsync(a => a.UserId == userId, cancellationToken)).ToDictionary(a => a.Id, a => a.Name);
        var categories = (await _unitOfWork.Categories.ListAsync(c => c.UserId == userId || c.UserId == null, cancellationToken)).ToDictionary(c => c.Id, c => c.Name);

        var sb = new StringBuilder();
        sb.AppendLine("TransactionId,DateUtc,AccountName,CategoryName,Amount,EventType,Description,Merchant,Notes,Tags");

        foreach (var t in transactions.OrderByDescending(x => x.TransactionDate))
        {
            var accountName = accounts.TryGetValue(t.AccountId, out var acc) ? acc : t.AccountId.ToString();
            var categoryName = t.CategoryId.HasValue && categories.TryGetValue(t.CategoryId.Value, out var cat) ? cat : string.Empty;

            sb.Append($"{t.Id},");
            sb.Append($"{t.TransactionDate:yyyy-MM-ddTHH:mm:ssZ},");
            sb.Append($"\"{EscapeCsv(accountName)}\",");
            sb.Append($"\"{EscapeCsv(categoryName)}\",");
            sb.Append($"{t.Amount.ToString(CultureInfo.InvariantCulture)},");
            sb.Append($"{t.EventType},");
            sb.Append($"\"{EscapeCsv(t.Description)}\",");
            sb.Append($"\"{EscapeCsv(t.Merchant ?? string.Empty)}\",");
            sb.Append($"\"{EscapeCsv(t.Notes ?? string.Empty)}\",");
            sb.AppendLine($"\"{EscapeCsv(t.Tags ?? string.Empty)}\"");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<byte[]> ExportMonthlyTransactionsCsvAsync(Guid userId, int year, int month, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Exporting monthly transactions CSV for user {UserId} for {Year}-{Month:D2}", userId, year, month);

        var startDate = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var endDate = startDate.AddMonths(1).AddTicks(-1);

        var transactions = await _unitOfWork.Transactions.ListAsync(
            t => t.UserId == userId && t.TransactionDate >= startDate && t.TransactionDate <= endDate,
            cancellationToken);

        var accounts = (await _unitOfWork.Accounts.ListAsync(a => a.UserId == userId, cancellationToken)).ToDictionary(a => a.Id, a => a);
        var categories = (await _unitOfWork.Categories.ListAsync(c => c.UserId == userId || c.UserId == null, cancellationToken)).ToDictionary(c => c.Id, c => c.Name);

        var totalInflows = transactions.Where(t => t.EventType == Domain.Enums.TransactionEventType.Income).Sum(t => t.Amount);
        var totalOutflows = transactions.Where(t => t.EventType == Domain.Enums.TransactionEventType.Expense).Sum(t => t.Amount);
        var netCashFlow = totalInflows - totalOutflows;

        var sb = new StringBuilder();
        var monthName = CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(month);
        sb.AppendLine($"# WealthFlow Monthly Financial Statement");
        sb.AppendLine($"# Statement Period: {monthName} {year}");
        sb.AppendLine($"# Generated At: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");
        sb.AppendLine($"# Total Monthly Inflows: INR {totalInflows.ToString("N2", CultureInfo.InvariantCulture)}");
        sb.AppendLine($"# Total Monthly Outflows: INR {totalOutflows.ToString("N2", CultureInfo.InvariantCulture)}");
        sb.AppendLine($"# Net Monthly Cash Flow: INR {netCashFlow.ToString("N2", CultureInfo.InvariantCulture)}");
        sb.AppendLine($"# Active Accounts Summary: {string.Join(" | ", accounts.Values.Select(a => $"{a.Name}: INR {a.CurrentBalance:N2}"))}");
        sb.AppendLine();
        sb.AppendLine("TransactionId,DateUtc,AccountName,CategoryName,Amount,EventType,Description,Merchant,Notes,Tags");

        foreach (var t in transactions.OrderBy(x => x.TransactionDate))
        {
            var accountName = accounts.TryGetValue(t.AccountId, out var acc) ? acc.Name : t.AccountId.ToString();
            var categoryName = t.CategoryId.HasValue && categories.TryGetValue(t.CategoryId.Value, out var cat) ? cat : string.Empty;

            sb.Append($"{t.Id},");
            sb.Append($"{t.TransactionDate:yyyy-MM-ddTHH:mm:ssZ},");
            sb.Append($"\"{EscapeCsv(accountName)}\",");
            sb.Append($"\"{EscapeCsv(categoryName)}\",");
            sb.Append($"{t.Amount.ToString(CultureInfo.InvariantCulture)},");
            sb.Append($"{t.EventType},");
            sb.Append($"\"{EscapeCsv(t.Description)}\",");
            sb.Append($"\"{EscapeCsv(t.Merchant ?? string.Empty)}\",");
            sb.Append($"\"{EscapeCsv(t.Notes ?? string.Empty)}\",");
            sb.AppendLine($"\"{EscapeCsv(t.Tags ?? string.Empty)}\"");
        }

        // Return with UTF-8 byte order mark for seamless opening in Excel
        var preamble = Encoding.UTF8.GetPreamble();
        var body = Encoding.UTF8.GetBytes(sb.ToString());
        var fullBytes = new byte[preamble.Length + body.Length];
        Buffer.BlockCopy(preamble, 0, fullBytes, 0, preamble.Length);
        Buffer.BlockCopy(body, 0, fullBytes, preamble.Length, body.Length);

        return fullBytes;
    }

    public async Task<FileUploadResult> ArchiveMonthlyTransactionsToGoogleDriveAsync(Guid userId, int year, int month, CancellationToken cancellationToken = default)
    {
        var csvBytes = await ExportMonthlyTransactionsCsvAsync(userId, year, month, cancellationToken);
        var fileName = $"WealthFlow_Ledger_{year}_{month:D2}.csv";

        using var memoryStream = new MemoryStream(csvBytes);
        var result = await _fileStorageService.UploadFileAsync(
            memoryStream,
            fileName,
            "text/csv",
            cancellationToken);

        _logger.LogInformation("Successfully archived monthly statement for {Year}-{Month:D2} to storage provider (Google Drive). FileId: {FileId}",
            year, month, result.StoragePath);

        return result;
    }

    public async Task<DataImportResultDto> ImportUserDataJsonAsync(Guid userId, DataExportDto importData, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Importing user data for user {UserId} with {Count} accounts and {TxCount} transactions",
            userId, importData.Accounts.Count, importData.Transactions.Count);

        var result = new DataImportResultDto();

        try
        {
            await _unitOfWork.BeginTransactionAsync(cancellationToken);

            // 1. Categories
            var existingCategories = (await _unitOfWork.Categories.ListAsync(c => c.UserId == userId || c.UserId == null, cancellationToken))
                .ToDictionary(c => c.Name, StringComparer.OrdinalIgnoreCase);

            var categoryIdMap = new Dictionary<Guid, Guid>();

            foreach (var catDto in importData.Categories)
            {
                if (existingCategories.TryGetValue(catDto.Name, out var existing))
                {
                    categoryIdMap[catDto.Id] = existing.Id;
                }
                else
                {
                    var newCat = new Category(
                        name: catDto.Name,
                        userId: userId,
                        parentCategoryId: null,
                        icon: catDto.Icon,
                        colorHex: catDto.ColorHex,
                        isSpecialProtein: catDto.IsSpecialProtein,
                        isSpecialClothing: catDto.IsSpecialClothing
                    );
                    await _unitOfWork.Categories.AddAsync(newCat, cancellationToken);
                    existingCategories[newCat.Name] = newCat;
                    categoryIdMap[catDto.Id] = newCat.Id;
                    result.ImportedCategories++;
                }
            }

            // 2. Accounts
            var existingAccounts = (await _unitOfWork.Accounts.ListAsync(a => a.UserId == userId, cancellationToken))
                .ToDictionary(a => a.Name, StringComparer.OrdinalIgnoreCase);

            var accountIdMap = new Dictionary<Guid, Guid>();

            foreach (var accDto in importData.Accounts)
            {
                if (existingAccounts.TryGetValue(accDto.Name, out var existingAcc))
                {
                    accountIdMap[accDto.Id] = existingAcc.Id;
                }
                else
                {
                    Enum.TryParse<AccountType>(accDto.AccountType, true, out var accType);
                    var newAcc = new Account(
                        userId: userId,
                        name: accDto.Name,
                        accountType: accType,
                        openingBalance: accDto.OpeningBalance,
                        accountNumberMask: accDto.AccountNumberMask,
                        sortOrder: accDto.SortOrder,
                        colorTag: accDto.ColorTag,
                        currency: accDto.Currency
                    );
                    await _unitOfWork.Accounts.AddAsync(newAcc, cancellationToken);
                    existingAccounts[newAcc.Name] = newAcc;
                    accountIdMap[accDto.Id] = newAcc.Id;
                    result.ImportedAccounts++;
                }
            }

            // 3. Transactions
            var existingTransactions = (await _unitOfWork.Transactions.ListAsync(t => t.UserId == userId, cancellationToken))
                .Select(t => t.IdempotencyKey)
                .ToHashSet();

            foreach (var txDto in importData.Transactions)
            {
                if (existingTransactions.Contains(txDto.IdempotencyKey))
                {
                    continue; // Skip duplicate transaction
                }

                // Map account
                if (!accountIdMap.TryGetValue(txDto.AccountId, out var mappedAccountId))
                {
                    var firstAcc = existingAccounts.Values.FirstOrDefault();
                    if (firstAcc != null)
                    {
                        mappedAccountId = firstAcc.Id;
                    }
                    else
                    {
                        result.Warnings.Add($"Skipped transaction '{txDto.Description}' due to missing account mapping.");
                        continue;
                    }
                }

                Guid? mappedCategoryId = null;
                if (txDto.CategoryId.HasValue && categoryIdMap.TryGetValue(txDto.CategoryId.Value, out var catId))
                {
                    mappedCategoryId = catId;
                }

                Enum.TryParse<TransactionEventType>(txDto.EventType, true, out var eventType);

                var newTx = new Transaction(
                    userId: userId,
                    accountId: mappedAccountId,
                    amount: txDto.Amount,
                    transactionDate: txDto.TransactionDate,
                    eventType: eventType,
                    description: txDto.Description,
                    categoryId: mappedCategoryId,
                    merchant: txDto.Merchant,
                    notes: txDto.Notes,
                    tags: txDto.Tags,
                    linkedEntityId: txDto.LinkedEntityId,
                    idempotencyKey: txDto.IdempotencyKey
                );

                await _unitOfWork.Transactions.AddAsync(newTx, cancellationToken);
                existingTransactions.Add(newTx.IdempotencyKey);
                result.ImportedTransactions++;
            }

            // 4. Budgets
            foreach (var bDto in importData.Budgets)
            {
                if (bDto.CategoryId != Guid.Empty && categoryIdMap.TryGetValue(bDto.CategoryId, out var mappedCatId))
                {
                    var exists = await _unitOfWork.Budgets.ExistsAsync(b => b.UserId == userId && b.CategoryId == mappedCatId, cancellationToken);
                    if (!exists && bDto.MonthlyLimit > 0)
                    {
                        Enum.TryParse<BudgetPeriod>(bDto.Period, true, out var period);
                        var newBudget = new Budget(userId, mappedCatId, bDto.MonthlyLimit, period, bDto.StartDate);
                        await _unitOfWork.Budgets.AddAsync(newBudget, cancellationToken);
                        result.ImportedBudgets++;
                    }
                }
            }

            // 5. Credit Cards
            foreach (var cardDto in importData.CreditCards)
            {
                var exists = await _unitOfWork.CreditCards.ExistsAsync(c => c.UserId == userId && c.CardName == cardDto.CardName, cancellationToken);
                if (!exists)
                {
                    var newCard = new CreditCard(
                        userId: userId,
                        cardName: cardDto.CardName,
                        issuer: string.IsNullOrWhiteSpace(cardDto.Issuer) ? "Unknown" : cardDto.Issuer,
                        last4Digits: cardDto.Last4Digits,
                        creditLimit: cardDto.CreditLimit,
                        billingCycleDay: cardDto.BillingCycleDay,
                        dueDay: cardDto.DueDay,
                        colorTag: cardDto.ColorTag
                    );
                    await _unitOfWork.CreditCards.AddAsync(newCard, cancellationToken);
                    result.ImportedCreditCards++;
                }
            }

            // 6. Loans
            foreach (var loanDto in importData.Loans)
            {
                var exists = await _unitOfWork.Loans.ExistsAsync(l => l.UserId == userId && l.CounterpartyName == loanDto.CounterpartyName, cancellationToken);
                if (!exists && loanDto.PrincipalAmount > 0)
                {
                    Enum.TryParse<LoanDirection>(loanDto.Direction, true, out var dir);
                    var disbId = loanDto.DisbursementAccountId.HasValue && accountIdMap.TryGetValue(loanDto.DisbursementAccountId.Value, out var dAcc)
                        ? (Guid?)dAcc
                        : null;

                    var newLoan = new Loan(
                        userId: userId,
                        direction: dir,
                        counterpartyName: loanDto.CounterpartyName,
                        principalAmount: loanDto.PrincipalAmount,
                        counterpartyContact: loanDto.CounterpartyContact,
                        dueDate: loanDto.DueDate,
                        disbursementAccountId: disbId,
                        notes: loanDto.Notes
                    );
                    await _unitOfWork.Loans.AddAsync(newLoan, cancellationToken);
                    result.ImportedLoans++;
                }
            }

            // 7. Investments & SIPs
            var investmentIdMap = new Dictionary<Guid, Guid>();
            foreach (var invDto in importData.Investments)
            {
                var existingInv = (await _unitOfWork.Investments.ListAsync(i => i.UserId == userId && i.Name == invDto.Name, cancellationToken)).FirstOrDefault();
                if (existingInv != null)
                {
                    investmentIdMap[invDto.Id] = existingInv.Id;
                }
                else
                {
                    Enum.TryParse<AssetClass>(invDto.AssetClass, true, out var assetClass);
                    var newInv = new Investment(
                        userId: userId,
                        name: invDto.Name,
                        assetClass: assetClass,
                        investedAmount: invDto.InvestedAmount,
                        currentValue: invDto.CurrentValue,
                        units: invDto.Units,
                        lastValuationDate: invDto.LastValuationDate
                    );
                    await _unitOfWork.Investments.AddAsync(newInv, cancellationToken);
                    investmentIdMap[invDto.Id] = newInv.Id;
                    result.ImportedInvestments++;
                }
            }

            foreach (var sipDto in importData.Sips)
            {
                var exists = await _unitOfWork.Sips.ExistsAsync(s => s.UserId == userId && s.Name == sipDto.Name, cancellationToken);
                if (!exists && sipDto.Amount > 0)
                {
                    var targetInvestmentId = investmentIdMap.TryGetValue(sipDto.InvestmentId, out var mappedInvId)
                        ? mappedInvId
                        : investmentIdMap.Values.FirstOrDefault();

                    var targetSourceAccountId = accountIdMap.TryGetValue(sipDto.SourceAccountId, out var mappedSrcAccId)
                        ? mappedSrcAccId
                        : existingAccounts.Values.FirstOrDefault()?.Id ?? Guid.Empty;

                    if (targetInvestmentId != Guid.Empty && targetSourceAccountId != Guid.Empty)
                    {
                        var newSip = new SIP(
                            userId: userId,
                            investmentId: targetInvestmentId,
                            sourceAccountId: targetSourceAccountId,
                            name: sipDto.Name,
                            amount: sipDto.Amount,
                            executionDay: sipDto.ExecutionDay,
                            startDate: sipDto.StartDate,
                            endDate: sipDto.EndDate,
                            isJoint: sipDto.IsJoint,
                            userShare: sipDto.UserShare,
                            coInvestorShare: sipDto.CoInvestorShare,
                            coInvestorName: sipDto.CoInvestorName
                        );
                        await _unitOfWork.Sips.AddAsync(newSip, cancellationToken);
                        result.ImportedSips++;
                    }
                }
            }

            // 8. Trips
            foreach (var tripDto in importData.Trips)
            {
                var exists = await _unitOfWork.Trips.ExistsAsync(t => t.HostUserId == userId && t.Name == tripDto.Name, cancellationToken);
                if (!exists)
                {
                    Enum.TryParse<TripStatus>(tripDto.Status, true, out var status);
                    var newTrip = new Trip(
                        hostUserId: userId,
                        name: tripDto.Name,
                        destination: tripDto.Destination,
                        startDate: tripDto.StartDate,
                        endDate: tripDto.EndDate,
                        budget: tripDto.Budget,
                        status: status
                    );
                    await _unitOfWork.Trips.AddAsync(newTrip, cancellationToken);
                    result.ImportedTrips++;
                }
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitTransactionAsync(cancellationToken);

            result.Success = true;
            result.Message = $"Successfully imported {result.ImportedAccounts} accounts, {result.ImportedCategories} categories, and {result.ImportedTransactions} transactions.";
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to import user data for user {UserId}", userId);
            await _unitOfWork.RollbackTransactionAsync(cancellationToken);
            result.Success = false;
            result.Message = $"Import failed: {ex.Message}";
            return result;
        }
    }

    public async Task<DataImportResultDto> ImportTransactionsCsvAsync(Guid userId, Stream csvStream, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Importing transactions CSV for user {UserId}", userId);
        var result = new DataImportResultDto();

        using var reader = new StreamReader(csvStream, Encoding.UTF8);
        var headerLine = await reader.ReadLineAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(headerLine))
        {
            result.Success = false;
            result.Message = "CSV file is empty.";
            return result;
        }

        try
        {
            await _unitOfWork.BeginTransactionAsync(cancellationToken);

            // Retrieve or create default account
            var userAccounts = await _unitOfWork.Accounts.ListAsync(a => a.UserId == userId, cancellationToken);
            var defaultAccount = userAccounts.FirstOrDefault();
            if (defaultAccount == null)
            {
                defaultAccount = new Account(userId, "Primary Checking", AccountType.Bank, 0);
                await _unitOfWork.Accounts.AddAsync(defaultAccount, cancellationToken);
                result.ImportedAccounts++;
            }

            var accountLookup = userAccounts.ToDictionary(a => a.Name, StringComparer.OrdinalIgnoreCase);
            accountLookup[defaultAccount.Name] = defaultAccount;

            // Categories lookup
            var userCategories = (await _unitOfWork.Categories.ListAsync(c => c.UserId == userId || c.UserId == null, cancellationToken))
                .ToDictionary(c => c.Name, StringComparer.OrdinalIgnoreCase);

            string? line;
            int lineNumber = 1;
            while ((line = await reader.ReadLineAsync(cancellationToken)) != null)
            {
                lineNumber++;
                if (string.IsNullOrWhiteSpace(line)) continue;

                var cols = ParseCsvLine(line);
                if (cols.Count < 5)
                {
                    result.Warnings.Add($"Line {lineNumber}: insufficient columns, skipped.");
                    continue;
                }

                var dateStr = cols.Count > 1 ? cols[1] : string.Empty;
                var accountName = cols.Count > 2 ? cols[2] : defaultAccount.Name;
                var categoryName = cols.Count > 3 ? cols[3] : string.Empty;
                var amountStr = cols.Count > 4 ? cols[4] : "0";
                var eventTypeStr = cols.Count > 5 ? cols[5] : "Expense";
                var description = cols.Count > 6 ? cols[6] : "Imported Transaction";
                var merchant = cols.Count > 7 ? cols[7] : null;
                var notes = cols.Count > 8 ? cols[8] : null;
                var tags = cols.Count > 9 ? cols[9] : null;

                if (!DateTime.TryParse(dateStr, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal, out var txDate))
                {
                    txDate = DateTime.UtcNow;
                }

                if (!decimal.TryParse(amountStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var amount))
                {
                    amount = 0m;
                }

                if (!accountLookup.TryGetValue(accountName, out var targetAccount))
                {
                    targetAccount = defaultAccount;
                }

                Guid? categoryId = null;
                if (!string.IsNullOrWhiteSpace(categoryName) && userCategories.TryGetValue(categoryName, out var matchedCat))
                {
                    categoryId = matchedCat.Id;
                }

                Enum.TryParse<TransactionEventType>(eventTypeStr, true, out var eventType);

                var tx = new Transaction(
                    userId: userId,
                    accountId: targetAccount.Id,
                    amount: Math.Abs(amount),
                    transactionDate: txDate,
                    eventType: eventType,
                    description: string.IsNullOrWhiteSpace(description) ? "Imported Transaction" : description,
                    categoryId: categoryId,
                    merchant: merchant,
                    notes: notes,
                    tags: tags
                );

                await _unitOfWork.Transactions.AddAsync(tx, cancellationToken);
                result.ImportedTransactions++;
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitTransactionAsync(cancellationToken);

            result.Success = true;
            result.Message = $"Successfully imported {result.ImportedTransactions} transactions from CSV.";
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to import transactions from CSV for user {UserId}", userId);
            await _unitOfWork.RollbackTransactionAsync(cancellationToken);
            result.Success = false;
            result.Message = $"CSV Import failed: {ex.Message}";
            return result;
        }
    }

    private static string EscapeCsv(string value)
    {
        return value.Replace("\"", "\"\"");
    }

    private static List<string> ParseCsvLine(string line)
    {
        var result = new List<string>();
        var current = new StringBuilder();
        bool inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];

            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"');
                    i++; // Skip escaped quote
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == ',' && !inQuotes)
            {
                result.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(c);
            }
        }

        result.Add(current.ToString());
        return result;
    }
}
