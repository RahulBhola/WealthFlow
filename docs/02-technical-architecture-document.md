# WEALTHFLOW — TECHNICAL ARCHITECTURE DOCUMENT (TAD)
**Document Version:** 1.0.0  
**Status:** Under Review  
**Target Delivery:** Personal Finance & ERP V1.0  
**Initial Database:** PostgreSQL 16+  
**Target Migration Database:** Microsoft Azure SQL Database  
**Architecture Pattern:** Clean Architecture (Domain-Driven Design aligned)  

---

## 1. System Overview & Architecture Topology

WealthFlow is built as a decoupled, offline-first client-server system. The frontend is a Progressive Web Application (PWA) running React 19, TypeScript, and Vite, with local persistence in IndexedDB. The backend is an enterprise-grade ASP.NET Core Web API built on .NET 9+ adhering to Clean Architecture principles, leveraging **Dependency Injection (DI)**, the **Repository Pattern with Unit of Work**, and **LINQ** as the exclusive, provider-agnostic data access abstraction.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER (PWA)                            │
│  React 19 + TypeScript + Vite + Tailwind CSS + TanStack Query v5        │
│  ┌───────────────────────────────┐     ┌─────────────────────────────┐  │
│  │   Service Worker (PWA Shell)  │     │   IndexedDB Cache & Queue   │  │
│  └───────────────────────────────┘     └─────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTPS / WSS (SignalR)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND API (HOST)                            │
│                 ASP.NET Core Web API (.NET 9+ / C# 13)                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Middlewares: Auth (JWT), Rate Limiter, RFC 7807 Exception Handler, │  │
│  │ Idempotency Evaluator, Concurrency Verifier                       │  │
│  └─────────────────────────────────┬─────────────────────────────────┘  │
│                                    │                                    │
│  ┌─────────────────────────────────▼─────────────────────────────────┐  │
│  │                        CLEAN ARCHITECTURE                         │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ WealthFlow.Api (Controllers, Hubs, Dependency Injection)    │  │  │
│  │  └──────────────────────────────┬──────────────────────────────┘  │  │
│  │                                 ▼                                 │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ WealthFlow.Application (CQRS Handlers, IRepository, IUnitOfWork)│ │
│  │  └──────────────────────────────┬──────────────────────────────┘  │  │
│  │                                 ▼                                 │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ WealthFlow.Domain (Entities, Value Objects, Domain Services)│  │  │
│  │  └──────────────────────────────▲──────────────────────────────┘  │  │
│  │                                 │                                 │  │
│  │  ┌──────────────────────────────┴──────────────────────────────┐  │  │
│  │  │ WealthFlow.Infrastructure (Repositories, EF Core, LINQ)     │  │  │
│  │  └──────────────────────────────┬──────────────────────────────┘  │  │
│  └─────────────────────────────────┼─────────────────────────────────┘  │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
                 ▼                                       ▼
    ┌─────────────────────────┐             ┌─────────────────────────┐
    │       NOW (V1.0)        │             │      FUTURE CLOUD       │
    │       PostgreSQL        │             │   Azure SQL Database    │
    │  (Npgsql.EFCore.PGSQL)  │             │  (Microsoft.EFCore.SQL) │
    └─────────────────────────┘             └─────────────────────────┘
```

### 1.1 Dependency Injection (DI) & Inversion of Control
The system uses the native `Microsoft.Extensions.DependencyInjection` container. Dependency Injection is strictly structured around three lifecycle tiers to ensure thread safety, memory efficiency, and deterministic transaction scoping:

1. **Scoped Lifecycles:**
   - Database Context (`ApplicationDbContext`)
   - Repositories (`IAccountRepository`, `ITransactionRepository`, `ITripRepository`, `ILoanRepository`, `IBudgetRepository`, etc.)
   - Unit of Work (`IUnitOfWork`)
   - User & Tenant Context (`ICurrentUserService`)
   - Each HTTP request and SignalR invocation receives an isolated scope. All repositories and the `UnitOfWork` within a request share the exact same `DbContext` instance, ensuring that changes tracked across multiple repositories participate in a single atomic database transaction.
2. **Transient Lifecycles:**
   - CQRS Command & Query Handlers (`MediatR` / Application Handlers)
   - FluentValidation Validators (`IValidator<T>`)
   - Stateless Domain Calculators (`ISettlementEngine`, `IBalanceCalculationService`)
   - Created on demand with zero shared state.
3. **Singleton Lifecycles:**
   - Cryptographic Token Generators (`IGuestTokenService`)
   - In-Memory Idempotency Cache / Lock Providers
   - System Configuration Options (`IOptions<DatabaseSettings>`, `IOptions<JwtSettings>`)

### 1.2 Repository Pattern & Unit of Work Architecture
To insulate business logic from database implementation details and facilitate seamless cross-engine migration (PostgreSQL ↔ Azure SQL), WealthFlow strictly decouples persistence behind the **Repository Pattern** and **Unit of Work**:

```csharp
// Application Layer Interfaces (WealthFlow.Application)
public interface IRepository<TEntity> where TEntity : BaseEntity
{
    Task<TEntity?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<TEntity>> ListAsync(ISpecification<TEntity> spec, CancellationToken ct = default);
    Task AddAsync(TEntity entity, CancellationToken ct = default);
    void Update(TEntity entity);
    void Remove(TEntity entity);
}

public interface IUnitOfWork : IDisposable
{
    IAccountRepository Accounts { get; }
    ITransactionRepository Transactions { get; }
    ITripRepository Trips { get; }
    ITripExpenseRepository TripExpenses { get; }
    ITripAdvanceRepository TripAdvances { get; }
    ITripSettlementRepository TripSettlements { get; }
    IBudgetRepository Budgets { get; }
    ICreditCardRepository CreditCards { get; }
    IInvestmentRepository Investments { get; }
    ILoanRepository Loans { get; }
    IUserSessionRepository Sessions { get; }

    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task<IDbTransactionScope> BeginTransactionAsync(CancellationToken ct = default);
}
```

- **Benefits of this Pattern in WealthFlow:**
  - **Single Responsibility:** Application handlers depend on `IUnitOfWork` and repository interfaces, never directly on `DbContext` or raw database drivers.
  - **Atomicity:** When an expense mutation occurs, updating the `Account` materialized balance, recording the `Transaction` entity, and updating `Budget` utilization occur across distinct repositories but commit via `IUnitOfWork.SaveChangesAsync()` in a single atomic transaction.
  - **Testability:** Unit tests mock `IRepository<T>` and `IUnitOfWork` in-memory without needing a live database engine.

### 1.3 LINQ as the Authoritative Query Layer
WealthFlow enforces **LINQ (Language Integrated Query)** as the exclusive, database-agnostic query mechanism:

1. **Provider Independence:** All query logic—including filtering, sorting, projection, eager loading (`.Include()`), and aggregation—is authored as strongly-typed C# LINQ expressions.
2. **Seamless Translation:** Because EF Core translates LINQ trees into SQL at runtime, the exact same LINQ query compiles to standard PostgreSQL dialect today (`Npgsql`) and Azure SQL dialect tomorrow (`Microsoft.EntityFrameworkCore.SqlServer`).
3. **Prohibition of Database-Specific SQL:** Raw SQL strings (`FromSqlRaw`, `ExecuteSqlRaw`), PostgreSQL-specific syntax (e.g. `ILIKE`, `jsonb`, array operators), and SQL Server-specific syntax (e.g. `OPENJSON`, `CROSS APPLY`) are **strictly prohibited** in business logic. All searches utilize portable LINQ methods (e.g., `EF.Functions.Like` or normalized string comparisons).
4. **Specification Pattern:** Reusable business query criteria are encapsulated in specification objects combining LINQ expressions:
   ```csharp
   public class TransactionsByAccountAndDateSpec : Specification<Transaction>
   {
       public TransactionsByAccountAndDateSpec(Guid accountId, DateTime fromDateUtc, DateTime toDateUtc)
           : base(t => t.AccountId == accountId && t.TransactionDate >= fromDateUtc && t.TransactionDate <= toDateUtc)
       {
           AddInclude(t => t.Category);
           ApplyOrderByDescending(t => t.TransactionDate);
       }
   }
   ```

---

## 2. Clean Architecture Structure & Project Boundaries

The solution is divided into distinct projects enforcing strict inward dependency flow:

```
backend/
├── src/
│   ├── WealthFlow.Domain/             # Enterprise Core (Entities, Value Objects, Domain Services)
│   ├── WealthFlow.Application/        # Use Cases, Interfaces (IRepository, IUnitOfWork), DTOs, Validators
│   ├── WealthFlow.Infrastructure/     # Repository Implementations, EF Core DbContext, LINQ Configurations
│   └── WealthFlow.Api/                # Host, Controllers, SignalR Hubs, Dependency Injection Registration
└── tests/
    ├── WealthFlow.UnitTests/          # Pure unit tests with mocked Repositories & Domain Services
    └── WealthFlow.IntegrationTests/   # EF Core DbContext, API Endpoints, Settlement Engine Integration
```

### 2.1 Project Responsibilities & Dependency Rules
- **`WealthFlow.Domain`:** Has **zero external dependencies** (no EF Core, no ASP.NET, no third-party libraries). Contains core aggregate roots, entities, domain events, domain calculation services (`SettlementEngine`, `BalanceCalculationService`), and custom value objects (`Money`, `Currency`).
- **`WealthFlow.Application`:** Depends **only** on `WealthFlow.Domain`. Orchestrates use cases using CQRS handlers, defines repository and unit of work interfaces (`IRepository<T>`, `IUnitOfWork`, `IAccountRepository`, `ITransactionRepository`), and provides FluentValidation rules.
- **`WealthFlow.Infrastructure`:** Implements interfaces defined in `Application`. Contains concrete repository classes (`AccountRepository`, `TransactionRepository`, `UnitOfWork`), EF Core `ApplicationDbContext`, entity configurations, provider-specific database switches (PostgreSQL vs. Azure SQL), and physical file storage.
- **`WealthFlow.Api`:** Entry point. Configures ASP.NET Core Dependency Injection container (`Program.cs` / service extensions), middleware pipeline, authentication/authorization schemes, CORS, Swagger/OpenAPI, and SignalR real-time hubs.

---

## 3. Domain Model & Entity-Relationship Architecture

All entities inherit from a portable base class providing standard audit attributes, client-generated GUIDs, and concurrency tokens:

```csharp
public abstract class BaseEntity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    public DateTime CreatedAtUtc { get; protected set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; protected set; }
    public bool IsDeleted { get; protected set; } = false; // Soft-delete
}
```

### 3.1 Entity Specifications

```
                     ┌──────────────────┐
                     │   Application    │
                     │       User       │
                     └────────┬─────────┘
                              │ 1:N
       ┌──────────────────────┼──────────────────────┬──────────────────────┐
       │ 1:N                  │ 1:N                  │ 1:N                  │ 1:N
┌──────▼──────┐        ┌──────▼──────┐        ┌──────▼──────┐        ┌──────▼──────┐
│   Account   │        │  Category   │        │ CreditCard  │        │ Investment  │
└──────┬──────┘        └──────┬──────┘        └──────┬──────┘        └──────┬──────┘
       │ 1:N                  │ 1:N                  │ 1:N                  │ 1:N
       │               ┌──────▼────────┐             │               ┌──────▼──────┐
       └──────────────►│  Transaction  │◄────────────┘               │     SIP     │
                       └──────┬────────┘                             └─────────────┘
                              │ 1:N
       ┌──────────────────────┼──────────────────────┐
       │ 1:N                  │ 1:N                  │ 1:N
┌──────▼──────┐        ┌──────▼──────┐        ┌──────▼──────┐
│  Loan/Gift  │        │ Attachment  │        │   AuditLog  │
└─────────────┘        └─────────────┘        └─────────────┘

       ┌─────────────────────────────────────────────────────────────┐
       │                         TRIP CLUSTER                        │
       │  ┌──────────────┐         ┌──────────────┐                  │
       │  │     Trip     │◄───────►│  TripMember  │                  │
       │  └──────┬───────┘ 1:N     └──────┬───────┘                  │
       │         │ 1:N                    │ 1:N                      │
       │  ┌──────▼───────┐         ┌──────▼────────┐  ┌───────────┐  │
       │  │  TripExpense │◄───────►│TripExpenseSplit  │TripAdvance│  │
       │  └──────────────┘ 1:N     └───────────────┘  └─────┬─────┘  │
       │                                                    │ 1:N    │
       │  ┌─────────────────────────────────────────────────▼─────┐  │
       │  │                    TripSettlement                     │  │
       │  └───────────────────────────────────────────────────────┘  │
       └─────────────────────────────────────────────────────────────┘
```

#### Detailed Entity Attributes:
1. **`User`:** `Id` (GUID), `Email`, `PasswordHash`, `FirstName`, `LastName`, `CurrencyCode` ("INR"), `CreatedAtUtc`.
2. **`Account`:** `Id`, `UserId`, `Name`, `AccountType` (`Bank`, `Cash`, `Wallet`, `Other`), `OpeningBalance` (`decimal(18,2)`), `CurrentBalance` (`decimal(18,2)`), `AccountNumberMask`, `IsActive`, `SortOrder`.
3. **`Category`:** `Id`, `UserId` (nullable for system categories), `ParentCategoryId` (nullable for top-level), `Name`, `Icon`, `ColorHex`, `IsSpecialProtein`, `IsSpecialClothing`, `IsActive`.
4. **`Transaction`:** `Id`, `UserId`, `AccountId`, `CategoryId`, `Amount` (`decimal(18,2)`), `TransactionDate` (UTC), `EventType` (`Income`, `Expense`, `Transfer`, `Investment`, `LoanGiven`, `LoanReceived`, `Gift`, `Refund`, `CreditCardPayment`, `TripSettlement`), `Description`, `Merchant`, `Notes`, `Tags` (stringified CSV or JSON array), `LinkedEntityId` (nullable GUID), `IdempotencyKey` (GUID), `SyncStatus` (`Synced`, `Pending`, `Failed`).
5. **`Transfer`:** `Id`, `UserId`, `SourceAccountId`, `DestinationAccountId`, `Amount` (`decimal(18,2)`), `FeeAmount` (`decimal(18,2)`), `TransferDate`, `Notes`.
6. **`CreditCard`:** `Id`, `UserId`, `CardName`, `Issuer`, `Last4Digits`, `CreditLimit` (`decimal(18,2)`), `BillingCycleDay` (int), `DueDay` (int), `CurrentOutstanding` (`decimal(18,2)`), `IsActive`.
7. **`Investment`:** `Id`, `UserId`, `Name`, `AssetClass` (`MutualFund`, `Stock`, `FixedDeposit`, `PPF`, `NPS`, `Gold`), `InvestedAmount` (`decimal(18,2)`), `CurrentValue` (`decimal(18,2)`), `Units` (`decimal(18,4)`), `LastValuationDate`.
8. **`SIP`:** `Id`, `UserId`, `InvestmentId`, `SourceAccountId`, `Name`, `Amount` (`decimal(18,2)`), `ExecutionDay` (int 1-31), `StartDate`, `EndDate` (nullable), `Status` (`Active`, `Paused`, `Stopped`).
9. **`Loan`:** `Id`, `UserId`, `Direction` (`Given`, `Received`), `CounterpartyName`, `CounterpartyContact`, `PrincipalAmount` (`decimal(18,2)`), `OutstandingBalance` (`decimal(18,2)`), `DueDate` (nullable), `IsSettled`.
10. **`LoanRepayment`:** `Id`, `LoanId`, `AccountId`, `Amount` (`decimal(18,2)`), `RepaymentDate`, `Notes`.
11. **`Trip`:** `Id`, `HostUserId`, `Name`, `Destination`, `StartDate`, `EndDate`, `Budget` (`decimal(18,2)`), `Status` (`Planning`, `Active`, `Archived`, `Settled`).
12. **`TripMember`:** `Id`, `TripId`, `RegisteredUserId` (nullable), `GuestName`, `GuestSecureToken` (nullable string, SHA-256 hashed in DB), `TokenExpiresAtUtc`, `CanAddExpenses` (bool).
13. **`TripExpense`:** `Id`, `TripId`, `PayerMemberId`, `Amount` (`decimal(18,2)`), `ExpenseDate`, `Description`, `CategoryId`, `SplitType` (`Equal`, `Unequal`, `Percentage`, `Shares`, `Itemized`).
14. **`TripExpenseSplit`:** `Id`, `TripExpenseId`, `MemberId`, `AllocatedAmount` (`decimal(18,2)`), `AllocatedPercentage` (`decimal(5,2)`), `AllocatedShares` (int).
15. **`TripAdvance`:** `Id`, `TripId`, `GiverMemberId`, `ReceiverMemberId`, `Amount` (`decimal(18,2)`), `AdvanceDate`, `Notes`. *(CRITICAL: Excluded from trip total expenses)*.
16. **`TripSettlement`:** `Id`, `TripId`, `PayerMemberId`, `ReceiverMemberId`, `Amount` (`decimal(18,2)`), `SettledAtUtc`, `SettlementMethod` (e.g. "UPI", "Cash"), `Notes`, `IsConfirmed`.
17. **`Attachment`:** `Id`, `UserId`, `LinkedEntityType` (`Transaction`, `TripExpense`), `LinkedEntityId`, `OriginalFileName`, `StoredFileName`, `MimeType`, `FileSizeBytes`, `StoragePath`.
18. **`AuditLog`:** `Id`, `UserId`, `Action`, `EntityName`, `EntityId`, `OldValuesJson`, `NewValuesJson`, `IpAddress`, `TimestampUtc`.
19. **`UserSession`:** `Id`, `UserId`, `DeviceName`, `DeviceType` (`Desktop`, `Mobile`, `Tablet`), `Browser`, `IpAddress`, `RefreshTokenHash`, `LastActiveAtUtc`, `ExpiresAtUtc`, `AbsoluteExpiresAtUtc`, `IsRevoked`.

---

## 4. Database Strategy & Cross-Engine Portability

WealthFlow targets **PostgreSQL 16+** for development and initial deployment, with an explicit architecture guarantee of zero-code-change migration to **Microsoft Azure SQL Database**.

```
                           ┌────────────────────────────────────┐
                           │      IApplicationDbContext        │
                           │       (Portable EF Models)         │
                           └─────────────────┬──────────────────┘
                                             │
                   ┌─────────────────────────┴─────────────────────────┐
                   │                                                   │
                   ▼                                                   ▼
     ┌───────────────────────────┐                       ┌───────────────────────────┐
     │   PostgreSqlDbContext     │                       │    SqlServerDbContext     │
     │ - Npgsql Provider         │                       │ - Microsoft.SqlServer     │
     │ - Provider Configuration  │                       │ - Provider Configuration  │
     │ - Schema: public          │                       │ - Schema: dbo             │
     └─────────────┬─────────────┘                       └─────────────┬─────────────┘
                   ▼                                                   ▼
     ┌───────────────────────────┐                       ┌───────────────────────────┐
     │       PostgreSQL 16       │                       │    Azure SQL Database     │
     └───────────────────────────┘                       └───────────────────────────┘
```

### 4.1 Strict Portability Engineering Rules
1. **Data Types:**
   - All financial amounts use standard `decimal(18,2)`. Under PostgreSQL, EF Core maps this to `numeric(18,2)`. Under SQL Server, it maps to `decimal(18,2)`.
   - Identifiers use standard .NET `Guid`. Under PostgreSQL, this maps to `uuid`. Under SQL Server, this maps to `uniqueidentifier`.
   - Timestamps use `DateTime` with UTC kind. Under PostgreSQL, maps to `timestamp with time zone`. Under SQL Server, maps to `datetime2`.
2. **Provider Isolation in Infrastructure:**
   - No direct references to `Npgsql` or `Microsoft.Data.SqlClient` exist in `WealthFlow.Domain` or `WealthFlow.Application`.
   - Configuration is driven by `appsettings.json`:
     ```json
     {
       "DatabaseProvider": "PostgreSQL",
       "ConnectionStrings": {
         "DefaultConnection": "Host=localhost;Port=5432;Database=wealthflow;Username=postgres;Password=..."
       }
     }
     ```
   - Conditional DI registration in Infrastructure:
     ```csharp
     var provider = configuration.GetValue<string>("DatabaseProvider");
     services.AddDbContext<ApplicationDbContext>(options =>
     {
         if (provider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
         {
             options.UseNpgsql(connectionString, b => b.MigrationsAssembly("WealthFlow.Infrastructure.PostgreSQL"));
         }
         else if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
         {
             options.UseSqlServer(connectionString, b => b.MigrationsAssembly("WealthFlow.Infrastructure.SqlServer"));
         }
         else
         {
             throw new NotSupportedException($"Database provider '{provider}' is not supported.");
         }
     });
     ```
3. **LINQ Rules & Raw SQL Prohibition:**
   - Raw SQL (`FromSqlRaw`, `ExecuteSqlRaw`) is **forbidden** unless encapsulated in a dedicated portable repository with provider-specific test suites.
   - Database-specific functions (e.g., PostgreSQL `ILIKE`, `jsonb_extract_path`, `generate_series`, or SQL Server `CROSS APPLY`, `OPENJSON`) are prohibited in business services. Standard portable EF Core functions (`EF.Functions.Like`, LINQ string operations) must be used.
4. **Optimistic Concurrency Strategy:**
   - Entity concurrency tokens are mapped abstractly using EF Core's `.IsRowVersion()` or a generic `Guid ConcurrencyToken` updated on every write.
   - In PostgreSQL, `xmin` system column is mapped. In SQL Server, `rowversion` / `timestamp` column is mapped. Both use identical application exception handling (`DbUpdateConcurrencyException`).

### 4.2 Migration Strategy & Cross-Database Cutover Checklist
When transitioning from PostgreSQL to Azure SQL Database, the migration execution pipeline follows:
1. **Schema Generation:** Run `dotnet ef migrations script` targeting the SQL Server provider to generate a pure T-SQL schema script.
2. **Data Export/Import:** Utilize Azure Data Factory or a portable BCP/CSV bulk copy utility with explicit column mappings.
3. **Data Integrity Verification Checklist:**
   - [ ] Row count parity verified across all 18 tables.
   - [ ] Foreign key reference checks (zero orphan records).
   - [ ] Financial balance parity: Verify $\sum \text{Transactions}$ matches $\sum \text{Account Balances}$.
   - [ ] Precision check: Ensure no truncated decimal fractions in monetary columns.
   - [ ] Index validation: Clustered and non-clustered indexes active on all foreign keys and query paths.

---

## 5. Financial & Ledger Architecture

WealthFlow enforces a **balanced transactional ledger** model. Balances are not merely static fields; they represent the materialized sum of immutable financial events.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRANSACTION RECONCILIATION                      │
├────────────────────────────────────────────────────────────────────────┤
│  User Submits Mutation (e.g., Expense ₹2,000 via HDFC Bank)            │
│  │                                                                     │
│  ├── 1. Acquire Account Concurrency Lock                               │
│  ├── 2. Validate Available Balance (if overdraft disabled)             │
│  ├── 3. Insert Immutable Transaction Record (EventType = Expense)      │
│  ├── 4. Update Materialized Account Balance (Balance = Balance - 2000) │
│  ├── 5. Update Budget Aggregate Cache                                  │
│  └── 6. Commit Database Transaction Atomically                         │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Account Balance Reconciler & Invariant Verifier
A background domain service verifies that:
$$\text{CurrentBalance}_{\text{Account}} = \text{OpeningBalance} + \sum \text{Inflows} - \sum \text{Outflows}$$
If any discrepancy occurs due to concurrency or hardware failure, the reconciler logs an audit event and flags the account for administrative review.

---

## 6. Offline-First & Synchronization Architecture

WealthFlow treats the browser client as an active, local-first node. It uses **IndexedDB** for local data persistence and maintains an outbound transaction queue.

```
┌───────────────────────────────┐
│       UI Action (Client)      │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│     Write to IndexedDB        │  ◄── Immediate optimistic UI update
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│     Enqueue SyncOperation     │  (Status: Pending, IdempotencyKey: GUID)
└───────────────┬───────────────┘
                │
         [Network Online?]
         ├── NO  ──► Wait for 'online' event / service worker sync
         └── YES ──► POST /api/v1/sync/batch
                         │
                         ▼
┌───────────────────────────────────────────────────────────────┐
│                     SERVER SYNC PROCESSOR                     │
│  1. Check IdempotencyKey against processed cache               │
│     ├── Already Processed ──► Return original cached outcome  │
│     └── New Operation     ──► Process inside DB Transaction   │
│  2. Evaluate Concurrency Token (RowVersion)                   │
│     ├── Matches Server    ──► Persist & return Status: Synced │
│     └── Conflict Detected ──► Return Status: Conflict         │
└───────────────────────────────────────────────────────────────┘
```

### 6.1 Idempotency & Duplicate Prevention
Every state mutation created on the client receives an immutable `ClientMutationId` (GUID) and `IdempotencyKey`. The backend stores processed idempotency keys in a fast lookup index. If a network blip causes the client to retransmit a transaction, the server recognizes the key and responds with `HTTP 200 OK` without applying the financial event twice.

---

## 7. Real-Time Collaboration Architecture (SignalR)

SignalR Core is used strictly where real-time collaboration adds concrete user value: **Shared Trips**.

```
┌────────────────┐                     ┌────────────────┐
│  Trip Member A │                     │  Trip Member B │
└───────┬────────┘                     └────────▲───────┘
        │ POST /api/v1/trips/{id}/expenses      │
        ▼                                       │
┌───────────────────────────────────────────────┴────────┐
│                   WEALTHFLOW API                      │
│  1. Validate & Save Expense                            │
│  2. Trigger Settlement Engine Recalculation            │
│  3. Broadcast to Group: "Trip_{tripId}"                │
│     Event: "ExpenseAdded", "SettlementsRecalculated"   │
└────────────────────────────────────────────────────────┘
```

### 7.1 SignalR Hubs & Groups
- **`TripHub`:** Clients join a room named `$"Trip_{tripId}"` upon navigating to the trip screen.
- **Events Broadcasted:**
  - `ExpenseAdded(TripExpenseDto)`
  - `ExpenseUpdated(TripExpenseDto)`
  - `AdvanceRecorded(TripAdvanceDto)`
  - `SettlementUpdated(IEnumerable<SettlementInstructionDto>)`
  - `MemberJoined(TripMemberDto)`
- REST endpoints remain the authoritative source of truth. If a SignalR connection drops, TanStack Query automatically falls back to standard HTTP polling or refetching on window focus.

---

## 8. Physical File & Receipt Storage

Receipts and bill attachments are handled using a decoupled metadata/binary separation:
- **Database:** Stores metadata in the `Attachment` table (`OriginalFileName`, `MimeType`, `FileSizeBytes`, `StoragePath`, `Sha256Checksum`).
- **Physical Binary Store:**
  - *Local Development:* Local file system (`App_Data/uploads/`) with hashed folder partitioning (`/uploads/{yyyy}/{MM}/{guid}.bin`).
  - *Cloud Production:* Azure Blob Storage / AWS S3 via an abstract `IBlobStorageProvider` interface.
- Files are validated against a strict MIME whitelist (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`) and inspected for magic-number header validity before saving.

---

## 9. Background Jobs & Scheduling

Implemented via .NET `IHostedService` / Quartz.NET:
1. **SIP Auto-Execution Engine:** Runs daily at 00:05 UTC. Inspects active SIP records whose `ExecutionDay` matches the current day, creates the designated `Investment` transaction, and debits the source account.
2. **Budget Period Rollover:** Computes end-of-month budget utilization snapshots on the 1st of each month.
3. **Guest Token Expiry Cleanup:** Soft-deletes or flags expired trip guest tokens weekly.

---

## 10. Logging, Observability & Error Handling

- **Structured Logging:** Configured with **Serilog** emitting JSON logs enriched with `CorrelationId`, `UserId`, `TenantId`, and `Environment`.
- **RFC 7807 Problem Details:** All API errors return standard RFC 7807 payloads:
  ```json
  {
    "type": "https://wealthflow.io/errors/insufficient-funds",
    "title": "Insufficient Account Balance",
    "status": 400,
    "detail": "Account 'HDFC Salary' has a current balance of ₹1,200.00, which cannot cover ₹2,500.00.",
    "instance": "/api/v1/transactions",
    "code": "INSUFFICIENT_FUNDS",
    "correlationId": "0HN7C2J1..."
  }
  ```

---

## 11. CI/CD & Deployment Architecture

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Git Push Main │───► │ GitHub Actions │───► │ Docker Build   │
└────────────────┘     └───────┬────────┘     └───────┬────────┘
                               │                      │
                               ▼                      ▼
                       ┌────────────────┐     ┌────────────────┐
                       │  Unit & Int    │     │ Container Reg. │
                       │     Tests      │     │  (GHCR / ACR)  │
                       └────────────────┘     └───────┬────────┘
                                                      │
                                                      ▼
                                              ┌────────────────┐
                                              │  Deployment:   │
                                              │ Azure App Serv/│
                                              │ Container Apps │
                                              └────────────────┘
```

- **Docker Multi-Stage Builds:** Produces lightweight, non-root Linux container images (`mcr.microsoft.com/dotnet/aspnet:9.0-alpine`).
- **Frontend Distribution:** Static build artifacts served via Azure Static Web Apps, NGINX, or Cloudflare Pages with aggressive caching on immutable JS/CSS bundles.

---

*End of Technical Architecture Document.*

