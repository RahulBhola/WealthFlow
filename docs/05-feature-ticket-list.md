# WEALTHFLOW — FEATURE TICKET LIST & IMPLEMENTATION BACKLOG
**Document Version:** 1.0.0  
**Status:** Under Review  
**Target Delivery:** Phased Milestones 1 through 16  
**Total Epics:** 26  
**Ticket Format:** ID, Title, Priority, Description, Requirements, Acceptance Criteria, Dependencies, Testing Requirements  

---

## Ticket Execution Standards & Definition of Done

Every implementation ticket across all 26 epics must strictly adhere to the following completion standards:
1. **Mandatory In-Source Code Comments:**
   - All C# public classes, interfaces, entities, handlers, and methods must include XML documentation comments (`/// <summary>`, `<param>`, `<returns>`).
   - Non-obvious domain logic, financial formulas (e.g., greedy debt minimization, advance exclusion, credit card liability mechanics), and edge cases must contain detailed inline explanatory comments.
   - Frontend React components, custom hooks, and Zod schemas must include TSDoc/JSDoc annotations.
2. **Type Safety & Precision:** Authoritative financial amounts use `decimal(18,2)`. Identifiers use GUIDs.
3. **Database Portability:** Pure LINQ queries—zero raw SQL strings or provider-specific syntax in business logic.
4. **Testing & Verification:** Comprehensive unit and integration tests passing before ticket completion.

---

## Epic 1: Project Foundation & Clean Architecture Skeleton

### `WF-EP01-001`: Initialize Backend Clean Architecture Solution Structure & Data Abstractions
- **Priority:** P0 (Blocker)
- **Description:** Set up the multi-project .NET 9 solution following strict Clean Architecture layering (`Domain`, `Application`, `Infrastructure`, `Api`, `UnitTests`, `IntegrationTests`), configured with Dependency Injection, Repository Pattern with Unit of Work, and LINQ data access layer.
- **Requirements:**
  - Create `WealthFlow.sln` with all 6 projects.
  - Configure project references enforcing inward dependency direction (Domain has zero references).
  - Define generic and specialized repository interfaces (`IRepository<T>`, `IAccountRepository`, `ITransactionRepository`, `ITripRepository`, etc.) and `IUnitOfWork` in `WealthFlow.Application`.
  - Implement concrete repositories and `UnitOfWork` in `WealthFlow.Infrastructure` utilizing LINQ queries over EF Core DbSets.
  - Configure Microsoft.Extensions.DependencyInjection with scoped repositories/UnitOfWork, transient handlers, and singleton tokens/caches.
  - Add standard Directory.Build.props for nullable reference types, warnings as errors, and C# 13 language version.
- **Acceptance Criteria:**
  - `dotnet build` succeeds with zero warnings.
  - Dependency verification test ensures `Domain` has no dependencies on other projects.
  - DI container cleanly resolves `IUnitOfWork` and all repositories.
- **Dependencies:** None
- **Testing Requirements:** Architectural unit test using NetArchTest or reflection verifying project dependency rules and DI resolution smoke test.

### `WF-EP01-002`: Initialize Frontend Vite + React 19 + TypeScript with Component-Based Architecture
- **Priority:** P0 (Blocker)
- **Description:** Scaffold the frontend PWA application using Vite, TypeScript, Tailwind CSS, Lucide icons, and React Router, strictly architected around Component-Based Architecture (CBA).
- **Requirements:**
  - Configure `vite.config.ts` with path aliases (`@/features`, `@/components`, `@/hooks`, `@/lib`, `@/types`).
  - Establish 5-tier component layering: Atoms/Molecules in `components/ui/`, Layout Templates in `components/layout/`, Domain Organisms in `features/*/components/`, and Route View Pages in `features/*/pages/`.
  - Enforce Container/Presentational pattern: visual components receive immutable typed props (`Props -> JSX`), while state, network calls, and mutations are encapsulated in dedicated custom container hooks (`hooks/`).
  - Setup ESLint, Prettier, and TypeScript strict mode configurations (zero `any` types permitted).
  - Install and configure Tailwind CSS with custom color palette (Emerald, Rose, Sky, Amber, Violet).
- **Acceptance Criteria:**
  - `npm run build` and `npm run dev` execute cleanly.
  - Component library directory structure compiles with sample Atom (`Button`), Molecule (`FormField`), and Layout Shell (`AppLayout`).
  - Tailwind utilities and custom CSS variables load without styling conflicts.
- **Dependencies:** None
- **Testing Requirements:** Vitest setup verifying smoke render of atomic components and `App.tsx`.

---

## Epic 2: Authentication & Identity

### `WF-EP02-001`: Implement ASP.NET Core Identity with JWT & Refresh Tokens
- **Priority:** P0 (Blocker)
- **Description:** Establish user identity management with PBKDF2/Argon2 password hashing, short-lived JWT access tokens, and rotating refresh tokens stored in HttpOnly cookies.
- **Requirements:**
  - Configure ASP.NET Core Identity in `WealthFlow.Infrastructure`.
  - Implement endpoints: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh-token`, `POST /api/v1/auth/logout`.
  - Issue 15-minute JWT access tokens and 14-day refresh tokens.
- **Acceptance Criteria:**
  - Refresh tokens rotate on every invocation; replaying an old refresh token invalidates the session family.
  - Brute force protection locks account after 5 consecutive failed attempts.
- **Dependencies:** `WF-EP01-001`
- **Testing Requirements:** Integration tests verifying login, token issuance, cookie attributes (`HttpOnly`, `SameSite=Strict`, `Secure`), and lockout.

### `WF-EP02-002`: Multi-Device Session Management & Inactivity Expiration
- **Priority:** P1
- **Description:** Enable concurrent logins across multiple laptops, phones, and tablets with device identity tracking, sliding 7-day idle expiration, 30-day absolute expiration, and remote session revocation.
- **Requirements:**
  - Entity `UserSession` with `UserId`, `DeviceName`, `DeviceType`, `Browser`, `IpAddress`, `RefreshTokenHash`, `LastActiveAtUtc`, `ExpiresAtUtc`, `AbsoluteExpiresAtUtc`, `IsRevoked`.
  - Endpoints:
    - `GET /api/v1/auth/sessions`: List active device sessions for current user.
    - `POST /api/v1/auth/sessions/{id}/revoke`: Invalidate specific device session.
    - `POST /api/v1/auth/sessions/revoke-all-others`: Invalidate all device sessions except current.
  - Middleware enforcing sliding 7-day inactivity and 30-day absolute expiration.
  - Frontend UI at `/settings/sessions` showing device list, icons, last active time, and revocation actions.
- **Acceptance Criteria:**
  - User can log into laptop and phone simultaneously without being logged out of either.
  - Revoking a device immediately causes that device's next refresh request to fail with HTTP 401.
  - Inactive sessions expire after 7 days without user activity.
- **Dependencies:** `WF-EP02-001`
- **Testing Requirements:** Integration tests verifying multi-device login, independent token rotation per device, remote revocation, and idle expiration evaluation.

---

## Epic 3: User Management & Preferences

### `WF-EP03-001`: User Profile & Currency Settings
- **Priority:** P1
- **Description:** Manage user metadata, default currency settings (initial INR lock with ISO 4217 validation), and notification preferences.
- **Requirements:**
  - Endpoints: `GET /api/v1/user/profile`, `PUT /api/v1/user/profile`, `PUT /api/v1/user/preferences`.
  - Store user-specific budget threshold defaults (80%, 90%, 100%).
- **Acceptance Criteria:**
  - User can update their profile information and customize warning thresholds.
- **Dependencies:** `WF-EP02-001`
- **Testing Requirements:** Unit test for user domain entity validation and preference boundaries.

---

## Epic 4: Hierarchical Categories & Specialized Tracking

### `WF-EP04-001`: Category Hierarchy & Protein/Clothing System Flags
- **Priority:** P0
- **Description:** Implement two-level hierarchical category taxonomy with system seed categories and specialized flags for **Protein** and **Clothing** spending.
- **Requirements:**
  - Entity `Category` with `ParentCategoryId`, `IsSpecialProtein`, `IsSpecialClothing`.
  - Seed baseline categories: Food (Groceries, Restaurant, Protein Supplements, Snacks), Housing, Utilities, Transportation, Lifestyle (Clothing), Health, Travel, Education.
  - Endpoints: `GET /api/v1/categories`, `POST /api/v1/categories`, `PUT /api/v1/categories/{id}`, `DELETE /api/v1/categories/{id}` (soft-delete).
- **Acceptance Criteria:**
  - Categories can be queried as a nested tree or flat list.
  - Deleting a category with active transactions is prevented or soft-archived.
- **Dependencies:** `WF-EP01-001`
- **Testing Requirements:** Integration test verifying category seed execution and parent-child integrity.

---

## Epic 5: Financial Accounts & Balance Management

### `WF-EP05-001`: Multi-Account Architecture & Materialized Balance Calculation
- **Priority:** P0
- **Description:** Manage Bank Accounts, Physical Cash, and Digital Wallets with reconciled balances.
- **Requirements:**
  - Entity `Account` with `AccountType` (`Bank`, `Cash`, `Wallet`, `Other`), `OpeningBalance`, `CurrentBalance`.
  - Enforce `decimal(18,2)` precision.
  - Endpoints: `GET /api/v1/accounts`, `POST /api/v1/accounts`, `PUT /api/v1/accounts/{id}`, `POST /api/v1/accounts/{id}/archive`.
- **Acceptance Criteria:**
  - Account balances reflect opening balance plus net transaction sum.
  - Accounts cannot be hard-deleted if transactions reference them.
- **Dependencies:** `WF-EP01-001`, `WF-EP02-001`
- **Testing Requirements:** Unit test verifying balance reconciliation logic across multiple transactions.

---

## Epic 6: Financial Transactions & Account Transfers

### `WF-EP06-001`: Immutable Financial Ledger & Mutation Handlers
- **Priority:** P0
- **Description:** Implement transaction handling distinguishing twelve financial events (Income, Expense, Transfer, Investment, Loan Given, Loan Received, Gift, Advance Given, Advance Received, Refund, Credit Card Payment, Trip Settlement).
- **Requirements:**
  - Entity `Transaction` and `Transfer`.
  - Ensure account transfers debit source account and credit destination account without creating an expense event.
  - Client-generated GUIDs and `IdempotencyKey` support.
  - Endpoints: `GET /api/v1/transactions`, `POST /api/v1/transactions`, `PUT /api/v1/transactions/{id}`, `DELETE /api/v1/transactions/{id}`.
- **Acceptance Criteria:**
  - Account transfer of ₹10,000 reduces Account A by ₹10,000, increases Account B by ₹10,000, and does not alter lifestyle expense totals.
  - Duplicate requests with identical `IdempotencyKey` return original result without duplicate balance adjustments.
- **Dependencies:** `WF-EP04-001`, `WF-EP05-001`
- **Testing Requirements:** Automated unit and integration tests verifying balance invariant: $\sum \text{Balances} = \text{Initial} + \text{Inflows} - \text{Outflows}$.

---

## Epic 7: Budgeting & Threshold Monitoring

### `WF-EP07-001`: Monthly & Category Budgets with Food/Protein Sub-Budgets
- **Priority:** P1
- **Description:** Set and monitor monthly and annual budgets with configurable thresholds (80% Warning, 90% Critical, 100% Exceeded).
- **Requirements:**
  - Entity `Budget` with `Month`, `Year`, `CategoryId`, `AllocatedAmount`.
  - Dedicated query handlers computing spent vs. allocated amounts for Food Overall and Protein Specifically.
  - Endpoints: `GET /api/v1/budgets/current`, `POST /api/v1/budgets`, `PUT /api/v1/budgets/{id}`.
- **Acceptance Criteria:**
  - UI receives accurate utilization percentages and threshold breach alerts.
- **Dependencies:** `WF-EP04-001`, `WF-EP06-001`
- **Testing Requirements:** Unit tests for budget calculation service under boundary conditions (0%, 79.9%, 80.0%, 99.9%, 100%+).

---

## Epic 8: Credit Card Liability Management

### `WF-EP08-001`: Credit Card Tracking & Double-Counting Prevention
- **Priority:** P0
- **Description:** Track credit cards as liabilities. Purchase = Expense + Liability increase. Payment = Bank decrease + Liability decrease (NOT an expense).
- **Requirements:**
  - Entity `CreditCard` with `CreditLimit`, `BillingCycleDay`, `DueDay`, `CurrentOutstanding`.
  - Purchase mutation handler: Records expense in Category, increases CreditCard liability.
  - Payment mutation handler: Records transfer/payment from Bank, decreases CreditCard liability.
  - Endpoints: `GET /api/v1/credit-cards`, `POST /api/v1/credit-cards`, `POST /api/v1/credit-cards/{id}/payments`.
- **Acceptance Criteria:**
  - Swiping ₹2,000 on card increases category expenses by ₹2,000.
  - Paying ₹2,000 credit card bill from bank account reduces bank balance and card liability, with ZERO change to monthly expense totals.
- **Dependencies:** `WF-EP05-001`, `WF-EP06-001`
- **Testing Requirements:** Comprehensive test validating that credit card bill payments never increment monthly expense totals.

---

## Epic 9: Investment Portfolio Tracking

### `WF-EP09-001`: Portfolio Valuation & Asset Class Management
- **Priority:** P1
- **Description:** Track Mutual Funds, Stocks, Fixed Deposits, PPF, NPS, and Gold with invested capital vs. current market value and P&L.
- **Requirements:**
  - Entity `Investment` with `AssetClass`, `InvestedAmount`, `CurrentValue`, `Units`.
  - Investment transaction debits bank account and increments investment assets (not lifestyle expenses).
  - Endpoints: `GET /api/v1/investments`, `POST /api/v1/investments`, `PUT /api/v1/investments/{id}/valuation`.
- **Acceptance Criteria:**
  - Net Worth calculation treats investment current value as an asset.
- **Dependencies:** `WF-EP05-001`, `WF-EP06-001`
- **Testing Requirements:** Unit test verifying P&L calculations and return percentage formulas.

---

## Epic 10: Systematic Investment Plans (SIP)

### `WF-EP10-001`: SIP Schedule & Recurring Execution Manager
- **Priority:** P1
- **Description:** Automate tracking and recurring schedule execution for SIPs.
- **Requirements:**
  - Entity `SIP` with `InvestmentId`, `SourceAccountId`, `Amount`, `ExecutionDay`, `Status` (`Active`, `Paused`, `Stopped`).
  - Daily background worker checks for pending SIP executions and creates investment entries.
  - Endpoints: `GET /api/v1/sips`, `POST /api/v1/sips`, `PUT /api/v1/sips/{id}/status`.
- **Acceptance Criteria:**
  - SIP execution records an automated transaction and updates next scheduled execution date.
- **Dependencies:** `WF-EP09-001`
- **Testing Requirements:** Mock clock unit tests validating execution triggers on designated monthly dates (including 28th-31st month-end cases).

### `WF-EP10-002`: Joint / Co-Funded SIPs & Bilateral Contribution Tracking
- **Priority:** P1
- **Description:** Support SIPs co-funded with another individual (e.g. Brother, Partner). Prevent portfolio and net worth distortion when the full SIP executes from the user's bank account by automatically splitting into user investment equity and a co-investor receivable. Provide bilateral ledger tracking for asynchronous repayments and offsets against mutual debts.
- **Requirements:**
  - Enhance entity `SIP` with properties: `IsJoint`, `UserShare`, `CoInvestorShare`, `CoInvestorName`.
  - Add entity `JointSipReconciliation` with properties: `SIPId`, `UserId`, `Month`, `Year`, `ExecutionDateUtc`, `TotalAmount`, `UserShare`, `CoInvestorShare`, `AmountSettled`, `SettlementStatus` (`Pending`, `PartiallySettled`, `Settled`), `SettlementDateUtc`, `Notes`.
  - Background SIP execution handler detects `IsJoint == true`:
    - Debits full amount (e.g. ₹15,000) from source bank account.
    - Credits UserShare (e.g. ₹7,500) to Investment portfolio equity.
    - Automatically records `JointSipReconciliation` cycle and creates/updates a Loan Receivable asset of ₹7,500 owed by co-investor.
    - Preserves Net Worth invariant ($\Delta \text{Net Worth} = 0$ on execution).
  - Repayment API handles full or partial settlements:
    - Debits receivable and credits chosen bank/cash account.
    - Supports offsetting mutual bilateral debts (e.g., deducting ₹2,000 brother paid for groceries).
  - Endpoints:
    - `GET /api/v1/sips/{id}/reconciliations`
    - `POST /api/v1/sips/{id}/reconciliations/{recId}/settle`
    - `GET /api/v1/sips/joint/summary`
- **Acceptance Criteria:**
  - Monthly ₹15,000 execution for a 50/50 joint SIP creates an investment transaction for ₹7,500 and a receivable of ₹7,500.
  - Asynchronous repayment logs update reconciliation status from `Pending` $\rightarrow$ `PartiallySettled` or `Settled`.
  - Net Worth calculation incorporates only the user's share of investments and accurately reflects outstanding co-investor receivables.
- **Dependencies:** `WF-EP10-001`, `WF-EP11-001`
- **Testing Requirements:** Unit tests validating the 3-way split ledger invariant ($\text{Bank Outflow} = \text{Investment Asset} + \text{Receivable Asset}$), zero net worth change, and partial repayment math.

---

## Epic 11: Loans & Bilateral Receivables/Payables

### `WF-EP11-001`: Loans Given & Received with Partial Repayments
- **Priority:** P1
- **Description:** Manage bilateral debt. Money given creates an asset/receivable. Money received creates a liability/payable. Support partial and full repayments.
- **Requirements:**
  - Entity `Loan` and `LoanRepayment`.
  - Endpoints: `GET /api/v1/loans`, `POST /api/v1/loans`, `POST /api/v1/loans/{id}/repayments`.
- **Acceptance Criteria:**
  - Lending ₹5,000 reduces bank balance and increases loan receivable asset.
  - Repayment of ₹2,000 increases bank balance and reduces outstanding loan balance to ₹3,000.
  - Loans are never misclassified as gifts or expenses.
- **Dependencies:** `WF-EP05-001`, `WF-EP06-001`
- **Testing Requirements:** Unit tests for loan creation, partial repayment, overpayment rejection, and closure.

---

## Epic 12: Gift Tracking

### `WF-EP12-001`: Gifts Given and Received
- **Priority:** P2
- **Description:** Segregate gifts from loans. Gifts create an immediate outflow/inflow with no receivable or payable.
- **Requirements:**
  - Event type `Gift` linked to transactions.
  - Custom attributes for Recipient/Donor and Occasion.
- **Acceptance Criteria:**
  - Giving a ₹5,000 gift records an outflow without creating a loan receivable.
- **Dependencies:** `WF-EP06-001`
- **Testing Requirements:** Unit test ensuring gift transactions do not populate the loan ledger.

---

## Epic 13: Collaborative Trips Architecture

### `WF-EP13-001`: Trip Management & Budget Tracking
- **Priority:** P0
- **Description:** Manage collaborative trips (Goa, Ladakh, etc.) with dates, destination, budget, and member rosters.
- **Requirements:**
  - Entity `Trip` with `StartDate`, `EndDate`, `Budget`, `Status`.
  - Endpoints: `GET /api/v1/trips`, `POST /api/v1/trips`, `GET /api/v1/trips/{id}`, `PUT /api/v1/trips/{id}`.
- **Acceptance Criteria:**
  - Trip aggregate correctly reflects total expenses incurred vs. trip budget.
- **Dependencies:** `WF-EP01-001`
- **Testing Requirements:** Integration tests for trip CRUD and status state transitions.

---

## Epic 14: Trip Members & Guest Link Cryptography

### `WF-EP14-001`: Registered Members, Guest Members & Cryptographic Link Generation
- **Priority:** P0
- **Description:** Support registered app users and non-registered guests with cryptographically secure shared links (`/trip/{tripId}/guest/{token}`).
- **Requirements:**
  - Entity `TripMember` with `RegisteredUserId`, `GuestName`, `GuestSecureTokenHash`, `CanAddExpenses`.
  - Generate 256-bit entropy token, store SHA-256 hash in database.
  - Host revocation and permission update endpoints.
  - Scoped guest endpoint: `GET /api/v1/trips/{tripId}/guest/{token}`.
- **Acceptance Criteria:**
  - Guest can access trip data without logging into an account.
  - Guest token grants ZERO visibility into host personal bank accounts, investments, or other trips.
  - Host can revoke guest token at any time, immediately invalidating the link.
- **Dependencies:** `WF-EP13-001`
- **Testing Requirements:** Security tests verifying guest token entropy, hash validation, and strict rejection of attempts to access `/api/v1/accounts` using guest claims.

---

## Epic 15: Trip Expenses & Flexible Splitting Engine

### `WF-EP15-001`: Decentralized Multi-Payer Logging & Split Models (Equal, Unequal, Percentage, Shares)
- **Priority:** P0
- **Description:** Allow any trip member (or guest via link) to record expenses that they personally paid for, with flexible participant split allocations and strict mathematical validation.
- **Requirements:**
  - Entities `TripExpense` and `TripExpenseSplit`.
  - Payer attribution: Can be logged by any participant for themselves or on behalf of another member.
  - Support split modes: Equal, Unequal, Percentage, Shares, Itemized.
  - Validation: Sum of split amounts must equal total expense amount; percentages must equal 100.00%.
  - Endpoints: `GET /api/v1/trips/{id}/expenses`, `POST /api/v1/trips/{id}/expenses`.
- **Acceptance Criteria:**
  - When Amit pays ₹1,200 for a cab, it is logged under Amit as Payer and split among the selected participants.
  - Multiple members can concurrently log their individual expenses without race conditions.
  - Incomplete or mismatched split amounts return HTTP 400 with descriptive RFC 7807 validation error.
- **Dependencies:** `WF-EP13-001`, `WF-EP14-001`
- **Testing Requirements:** Comprehensive automated test suite covering decentralized multi-payer entries, all 5 split modes, decimal rounding remainders, and multiple concurrent submissions.

---

## Epic 16: Travel Advances Management (CRITICAL RULE)

### `WF-EP16-001`: Travel Advances Ledger & Non-Expense Invariant
- **Priority:** P0 (Critical Business Rule)
- **Description:** Track informal prepayments and capital advances between trip participants. **An advance is NEVER a trip expense and does NOT increment total trip expenses.**
- **Requirements:**
  - Entity `TripAdvance` with `TripId`, `GiverMemberId`, `ReceiverMemberId`, `Amount`, `AdvanceDate`.
  - Advance handler updates member settlement credit/debit balances without touching `Trip.TotalExpenses`.
  - Endpoints: `GET /api/v1/trips/{id}/advances`, `POST /api/v1/trips/{id}/advances`.
- **Acceptance Criteria:**
  - When Amit gives Rahul ₹500 advance, `Trip.TotalExpenses` remains unchanged.
  - The ₹500 advance is reflected in the final settlement equation crediting Amit and debiting Rahul.
- **Dependencies:** `WF-EP13-001`, `WF-EP14-001`
- **Testing Requirements:** Explicit unit test verifying that `trip.GetTotalExpenses()` returns identical values before and after recording an advance.

---

## Epic 17: Settlement Engine & Debt Minimization

### `WF-EP17-001`: Net Balance Equation & Greedy Debt Minimization Algorithm
- **Priority:** P0
- **Description:** Calculate net balances for all trip members using the universal equation:
  $\text{Net} = \text{Paid} + \text{AdvRecv} - \text{AdvGiven} - \text{Share} + \text{SettledRecv} - \text{SettledPaid}$.
  Optimize settlement transactions using greedy debt simplification.
- **Requirements:**
  - Domain service `SettlementEngine`.
  - Generate minimal transaction instructions (Debtor $i$ pays Creditor $j$ ₹$T$).
  - Record settlement execution: Entity `TripSettlement`.
  - Endpoints: `GET /api/v1/trips/{id}/settlement`, `POST /api/v1/trips/{id}/settlement/execute`.
- **Acceptance Criteria:**
  - Computes exact mathematical settlements for equal, unequal, percentage, and shares splits with advances.
  - Generates minimal transaction count (e.g., reduces 3-way circular debt to direct payments).
- **Dependencies:** `WF-EP15-001`, `WF-EP16-001`
- **Testing Requirements:** Comprehensive unit tests covering:
  - Equal split (4 members, 1 payer).
  - Multiple payers for single expense.
  - Advances given before and after expenses.
  - Previous partial settlements.
  - Decimal rounding and zero-balance verifications.

### `WF-EP17-002`: Google Pay Style Group Spending Summary & "Settle Up" Flow
- **Priority:** P1
- **Description:** Deliver a transparent Google Pay style group summary tab that aggregates total group spend, displays a per-member "Paid vs Fair Share" matrix, and offers one-tap "Settle Up" cards.
- **Requirements:**
  - Query handler returning `TripSummaryDto` with `TotalGroupSpending`, `MemberSummaries` (Paid, FairShare, Net), and `SimplifiedRepayments`.
  - Hero banner indicating current user's personalized net position ("You get back ₹X" or "You owe ₹Y").
  - One-tap `[Settle Up]` button on repayment cards recording a confirmed settlement with UPI/Cash notes.
  - Real-time SignalR updates on settlement execution.
- **Acceptance Criteria:**
  - Displays instant group transparency of who has spent what so far.
  - Clicking "Settle Up" marks the debt resolved and updates everyone's balances in real-time.
- **Dependencies:** `WF-EP17-001`
- **Testing Requirements:** Integration tests for summary calculations across multi-payer scenarios and settlement reconciliation.

---

## Epic 18: Executive Dashboard & KPI Metrics

### `WF-EP18-001`: Dashboard Aggregations & Recent Activity Feed
- **Priority:** P1
- **Description:** Deliver real-time executive dashboard data: Liquid Balance, Net Worth, Monthly In/Out, Budget Status, Credit Card Liability, and Recent Transactions.
- **Requirements:**
  - High-performance query handler returning aggregated `DashboardSummaryDto` in single roundtrip.
  - Endpoint: `GET /api/v1/dashboard/summary`.
- **Acceptance Criteria:**
  - Loads under 150ms with database indexes.
- **Dependencies:** `WF-EP05-001`, `WF-EP06-001`, `WF-EP07-001`, `WF-EP08-001`
- **Testing Requirements:** Integration test verifying aggregation accuracy against known seeded transactions.

---

## Epic 19: Analytics & Net Worth History

### `WF-EP19-001`: Net Worth Engine & Category Spending Visualizations
- **Priority:** P1
- **Description:** Compute historical net worth trend line ($\sum \text{Assets} - \sum \text{Liabilities}$) and category spending breakdowns.
- **Requirements:**
  - Endpoints: `GET /api/v1/analytics/net-worth-history`, `GET /api/v1/analytics/category-breakdown`, `GET /api/v1/analytics/cashflow-waterfall`.
- **Acceptance Criteria:**
  - Assets include bank, cash, wallets, investments, and loan receivables.
  - Liabilities include credit card debt and loan payables.
- **Dependencies:** `WF-EP06-001`, `WF-EP08-001`, `WF-EP09-001`, `WF-EP11-001`
- **Testing Requirements:** Unit test verifying net worth arithmetic under multiple asset/liability combinations.

---

## Epic 20: Offline-First Architecture (IndexedDB & PWA)

### `WF-EP20-001`: Dexie.js IndexedDB Schema & Service Worker Shell
- **Priority:** P0
- **Description:** Enable full offline functionality in the frontend. Users can launch the app without internet, view cached data, and record mutations locally.
- **Requirements:**
  - Setup Dexie.js tables for accounts, categories, transactions, budgets, trips, and offline mutation queue.
  - Vite PWA service worker configured with CacheFirst for static assets and NetworkFirst for API reads.
- **Acceptance Criteria:**
  - App opens and renders cached data when network is disconnected.
  - User can create expenses while offline; UI optimistically displays new records immediately.
- **Dependencies:** `WF-EP01-002`
- **Testing Requirements:** Playwright offline simulation tests verifying transaction creation without network connection.

---

## Epic 21: Synchronization Engine & Conflict Resolution

### `WF-EP21-001`: Outbound Sync Queue, Idempotency & Concurrency Verification
- **Priority:** P0
- **Description:** Background sync processor that pushes pending mutations to the server upon network reconnection with idempotency guarantees.
- **Requirements:**
  - Frontend queue with statuses: `Pending`, `Synced`, `Failed`, `Conflict`.
  - Batch synchronization endpoint: `POST /api/v1/sync/batch`.
  - Backend concurrency check using `xmin` / `RowVersion`.
- **Acceptance Criteria:**
  - Offline transactions sync seamlessly upon network restoration.
  - Network timeouts and retries NEVER create duplicate transactions.
- **Dependencies:** `WF-EP06-001`, `WF-EP20-001`
- **Testing Requirements:** Network flakiness integration test simulating dropped packets and duplicate payloads.

---

## Epic 22: Data Import / Export (Excel & CSV)

### `WF-EP22-001`: Interactive Excel/CSV Import Wizard & Deduplication
- **Priority:** P1
- **Description:** Replace legacy Excel spreadsheets by uploading `.xlsx` or `.csv` files with interactive column mapping, preview, and deduplication.
- **Requirements:**
  - Multi-step wizard: Upload -> Column Mapping -> Data Validation & Preview -> Atomic Commit.
  - Export transactions and trip sheets to standard Excel workbook.
  - Endpoints: `POST /api/v1/import/preview`, `POST /api/v1/import/commit`, `GET /api/v1/export/excel`.
- **Acceptance Criteria:**
  - Successfully imports transactions from legacy format (Date, Description, Category, Amount).
  - Invalid records are flagged for manual correction before import.
- **Dependencies:** `WF-EP06-001`
- **Testing Requirements:** Unit tests parsing sample malformed and valid Excel files.

---

## Epic 23: Security Hardening & Penetration Testing Readiness

### `WF-EP23-001`: Security Headers, CORS, Rate Limiting & BOLA Audit
- **Priority:** P0
- **Description:** Apply defense-in-depth security policies across the API and frontend.
- **Requirements:**
  - Strict Content Security Policy (CSP), HSTS, X-Content-Type-Options.
  - Rate limiting on Auth and Guest endpoints.
  - Automated BOLA test suite asserting cross-user isolation.
- **Acceptance Criteria:**
  - Passing OWASP ZAP automated baseline security scan with zero high/medium alerts.
- **Dependencies:** `WF-EP02-001`, `WF-EP14-001`
- **Testing Requirements:** Automated security integration tests asserting 403 Forbidden when User A attempts to read/update User B's entities.

---

## Epic 24: Production Readiness & Observability

### `WF-EP24-001`: Serilog Structured Logging, Health Checks & Docker Packaging
- **Priority:** P1
- **Description:** Prepare application for production deployment with containerization and structured observability.
- **Requirements:**
  - Multi-stage Dockerfile for .NET 9 API (non-root Alpine).
  - Dockerfile and NGINX configuration for React PWA.
  - ASP.NET Core Health Checks (`/health/live`, `/health/ready`) verifying database connectivity.
  - Serilog logging with JSON formatting and correlation IDs.
- **Acceptance Criteria:**
  - Docker containers start and pass health checks within 10 seconds.
- **Dependencies:** `WF-EP01-001`, `WF-EP01-002`
- **Testing Requirements:** Container smoke tests and health check endpoint validation.

### `WF-EP24-002`: Deployment-Specific Storage (Google Drive for PostgreSQL / Azure Blob for Azure)
- **Priority:** P1
- **Description:** Implement decoupled `IFileStorageService` that routes receipt/attachment uploads to Google Drive when running on PostgreSQL, and exclusively to Azure Blob Storage when running in Azure.
- **Requirements:**
  - `GoogleDriveStorageService` utilizing Google Drive API v3 and Google Service Account authentication to store files in a private app folder.
  - `AzureBlobStorageService` utilizing `Azure.Storage.Blobs` SDK with Azure Managed Identity.
  - Dependency Injection registration toggled by `DatabaseProvider` or `FileStorageProvider` configuration setting.
  - Complete elimination/disabling of Google Drive dependencies when deployed in Azure mode.
  - Secure streaming download endpoint proxying bytes without exposing direct public URLs.
- **Acceptance Criteria:**
  - In PostgreSQL mode, uploading a receipt saves file to designated Google Drive folder and records Google FileId in `Attachment` table.
  - In Azure mode, uploading a receipt saves file to Azure Blob Container; Google Drive service is not instantiated.
  - Switching deployment targets does not require modifying controller or application handlers.
- **Dependencies:** `WF-EP01-001`
- **Testing Requirements:** Integration tests verifying upload, retrieval, and deletion flows with mocked Google Drive and Azure Blob providers.

---

## Epic 25: Database Portability & Azure SQL Migration Verification

### `WF-EP25-001`: Dual Provider Architecture & Cross-Engine Migration Test Suite
- **Priority:** P1
- **Description:** Ensure the EF Core model is 100% portable between PostgreSQL and Azure SQL Database without business logic changes.
- **Requirements:**
  - Decoupled `IApplicationDbContext` with provider-independent entity mapping.
  - Configuration switch `DatabaseProvider: "PostgreSQL" | "SqlServer"`.
  - Integration test suite configured to run against both PostgreSQL and Microsoft SQL Server testcontainers.
- **Acceptance Criteria:**
  - 100% of domain and application unit/integration tests pass identically against PostgreSQL and SQL Server.
  - Zero PostgreSQL-specific or SQL Server-specific SQL leaks into `Domain` or `Application`.
- **Dependencies:** `WF-EP01-001`, `WF-EP06-001`
- **Testing Requirements:** Automated CI pipeline running test suite against PostgreSQL 16 and Microsoft SQL Server 2022 containers.

---

## Epic 26: Future AI Expansion Hooks (Non-V1 Architecture)

### `WF-EP26-001`: AI Extensibility Interfaces & Confirmation Guardrails
- **Priority:** P2
- **Description:** Define extension interfaces for future Receipt OCR, Intelligent Categorization, and Spending Anomaly Detection.
- **Requirements:**
  - Interfaces: `IReceiptOcrService`, `ITransactionCategorizer`, `ISpendingAnomalyDetector`.
  - Strict Architectural Guardrail: AI services return **draft suggestions** only. Direct database mutation by AI services without user confirmation is prohibited.
- **Acceptance Criteria:**
  - System architecture documents AI boundary and provides placeholder service contracts.
- **Dependencies:** `WF-EP06-001`
- **Testing Requirements:** Static code analysis verifying no direct repository write methods are accessible to AI interfaces.

---

*End of Feature Ticket List.*

