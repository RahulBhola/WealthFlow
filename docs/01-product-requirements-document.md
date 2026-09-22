# WEALTHFLOW — PRODUCT REQUIREMENTS DOCUMENT (PRD)
**Document Version:** 1.0.0  
**Status:** Under Review  
**Target Delivery:** Personal Finance, Travel Splitter & Financial ERP V1.0  
**Primary Currency:** Indian Rupee (INR - ₹)  
**Database Architecture:** PostgreSQL (Initial) → Microsoft Azure SQL (Future Portability)  

---

## 1. Product Overview & Executive Summary

**WealthFlow** is an enterprise-grade, offline-first personal finance management platform, travel expense splitter, investment tracker, and lightweight financial ERP. It is engineered to replace fragmented, error-prone, manually maintained Excel spreadsheets with an architecturally sound, double-entry-aligned, multi-device synchronized system.

While WealthFlow is designed initially for personal wealth management and collaborative travel tracking, its underlying architecture is built from day one to support future multi-user organization expansion, multi-currency conversion, automated bank feeds, and AI-assisted financial telemetry.

The initial release targets **Indian Rupee (INR - ₹)** with standard Indian number grouping (e.g., ₹1,25,000.00), strictly enforced double-entry-aligned transactional integrity, and zero tolerance for balance discrepancies.

---

## 2. Problem Statement & Legacy Spreadsheet Deficiencies

### 2.1 The Legacy Spreadsheet Workflow
The user currently tracks personal finances using a legacy Microsoft Excel workbook containing columns:
- `Date`
- `Description`
- `Category`
- `Planned Amount`
- `Actual Amount`
- `Difference`
- `Running Total`
- `Yearly Summary`

### 2.2 Structural Deficiencies of the Spreadsheet Model
1. **Flat Transaction Flaw (No Account Isolation):** Every row is treated as an isolated debit or credit. Transfers between one's own bank accounts (e.g., HDFC to ICICI) or cash withdrawals are frequently misclassified as expenses, distorting monthly cash flow and savings calculations.
2. **Credit Card Distortion:** Swiping a credit card is an immediate lifestyle expense, whereas paying the credit card bill at the end of the month is a liability settlement. In spreadsheets, users either double-count both as expenses or fail to track their true current liabilities.
3. **Complex Travel Splitting Failures:** Group trips (e.g., Goa with 4 friends) require intricate splitting logic (equal, unequal, percentage, shares), multiple payers, and informal advances. In a spreadsheet, tracking who paid what and computing optimal repayments is mathematically tedious and prone to human error.
4. **Advance vs. Expense Conflation:** When a friend transfers ₹500 as an advance towards future trip costs, spreadsheets often record this as trip income or deduct it from trip expenses, creating chaotic balance sheets.
5. **No Offline Multi-Device Accessibility:** Spreadsheets cannot be safely edited offline on mobile while preserving simultaneous updates made on desktop, leading to merge conflicts, lost rows, or version duplication.
6. **Zero Audit Trail & Integrity Verification:** Accidental formula overwrites silently corrupt historical running totals without triggering validation alerts or concurrency locks.

---

## 3. Product Goals & Non-Goals

### 3.1 Product Goals
- **Unified Financial Ledger:** Unify bank accounts, cash, digital wallets, credit cards, investments, loans, and shared trips into a single consistent data store.
- **Accurate Financial Event Classification:** Formally segregate real lifestyle expenses from transfers, credit card payments, advances, investments, and loan disbursements across twelve defined financial event types.
- **Advanced Travel & Splitting Engine:** Enable group trip tracking with flexible split models, travel advances tracking, and a debt-minimization settlement engine.
- **Zero-Friction Guest Participation:** Allow non-registered friends to view trip balances and record their expenses via cryptographically secure, time-bounded guest links without creating an account or seeing the host's private finances.
- **Offline-First Resilience:** Provide instant read/write capabilities via IndexedDB and Service Worker (PWA) with deterministic, idempotent background synchronization.
- **Strict Database Portability:** Build against a decoupled EF Core abstraction that runs seamlessly on **PostgreSQL** initially and can migrate to **Azure SQL Database** with zero changes to domain, entities, or business logic.
- **Single Unified Styling Layout:** Guarantee an intuitive, non-fragmented user experience by strictly enforcing one universal styling layout across all application screens (personal finance, group trips, settings, and administration) without custom or conflicting UI layouts.

### 3.2 Non-Goals (V1 Scope Exclusions)
- **Direct Banking APIs / Account Aggregator:** V1 will not connect directly to banking APIs or Open Banking/AA aggregators. All data is entered manually or via Excel/CSV import.
- **Automated Money Transfers:** WealthFlow calculates and displays settlement instructions (e.g., "Amit pays Rahul ₹2,000"). It does **not** execute bank transfers or UPI payments.
- **Cryptocurrency & Forex Trading:** V1 focuses on INR personal finances; automated crypto trading and high-frequency forex tracking are out of scope.
- **Uncontrolled AI Mutations:** AI features (scheduled for future releases) will provide advisory insights, categorization suggestions, and OCR drafting, but will **never** alter financial records without explicit user confirmation.

---

## 4. User Types & Personas

| User Type | Authentication Mechanism | Permissions & Access Boundaries |
| :--- | :--- | :--- |
| **Primary Account Owner** | Full JWT Auth (ASP.NET Identity, PBKDF2/Argon2, Refresh Tokens) | Full read/write access to all personal bank accounts, credit cards, budgets, investments, loans, trips, analytics, and system settings. Owns the database tenant. |
| **Guest Trip Participant** | Cryptographic Token Link (`/trip/{id}/guest/{token}`) | Ephemeral, restricted access. Can only view the specific trip, its members, permitted expenses, advances, and settlement calculations. Zero access to host accounts, net worth, other trips, or system settings. Can add trip expenses if permitted by host. |
| **System Administrator (Future ERP)** | Elevated RBAC (Admin Role) | Dedicated admin portal access. Can inspect sync health, audit logs, tenant resource utilization, system configuration, and data migration telemetry. Cannot view unencrypted financial descriptions without explicit audit logging. |

---

## 5. Core Financial Model & Event Taxonomies

To eliminate the "flat spreadsheet" flaw, WealthFlow categorizes every monetary movement into one of **twelve distinct financial event types**. Each event adheres to strict balance sheet and cash flow equations.

```
       ┌─────────────────────────────────────────────────────────────┐
       │                   WEALTHFLOW EVENT TAXONOMY                 │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
   [CASH FLOW]                  [LIABILITIES]               [COLLABORATION]
   - Income                     - Credit Card Purchase      - Trip Expense
   - Expense                    - Credit Card Payment       - Trip Advance
   - Transfer                   - Loan Given (Asset)        - Trip Settlement
   - Investment                 - Loan Received (Liability) - Refund
   - Gift (Outflow/Inflow)
```

### 5.1 The Twelve Financial Events

| Event Type | Financial Effect | Balance Sheet Impact | P&L (Cash Flow) Impact |
| :--- | :--- | :--- | :--- |
| **1. Income** | Account balance increases (+). | Asset increases. | Positive cash flow. |
| **2. Expense** | Account balance decreases (-). | Asset decreases. | Lifestyle outflow (Expense). |
| **3. Transfer** | Source Account decreases (-); Destination Account increases (+). | Net Asset change = ₹0. | **Neutral (NOT an expense).** |
| **4. Investment** | Bank balance decreases (-); Investment Asset increases (+). | Asset shifts from Liquid to Invested. | **Capital allocation (NOT a lifestyle expense).** |
| **5. Loan Given** | Bank balance decreases (-); Loan Receivable Asset increases (+). | Asset shifts from Cash to Receivable. | Capital asset created (NOT a gift/expense). |
| **6. Loan Received**| Bank balance increases (+); Loan Payable Liability increases (+). | Asset increases, Liability increases. | Borrowed capital (NOT income). |
| **7. Gift** | Account balance decreases (-) or increases (+). | Outflow asset decreases; Inflow asset increases. | Expense (if given) or Income (if received) with no receivable/payable. |
| **8. Advance Given**| Source Account decreases (-); Trip Advance Credit increases (+). | Settlement asset created. | **Prepayment (NOT a trip expense).** |
| **9. Advance Recv** | Source Account increases (+); Trip Advance Debit increases (+). | Settlement liability created. | **Prepayment (NOT trip income).** |
| **10. Refund** | Account balance increases (+); Target Expense amount offsets (-).| Asset increases, Expense decreases. | Negative expense / reversal. |
| **11. CC Payment** | Bank balance decreases (-); Credit Card Liability decreases (-).| Asset decreases, Liability decreases. | **Debt settlement (NOT an expense).** |
| **12. Trip Settle** | Payer Account decreases (-); Receiver Account increases (+). | Trip Debt / Receivable cleared. | **Inter-personal settlement (NOT trip expense).** |

---

## 6. Functional Requirements

### 6.0 User Roles & Role-Based Access Control (RBAC)
WealthFlow implements a structured Role-Based Access Control (RBAC) model to distinguish between standard financial tracking and system-wide administration:
- **Defined User Roles:**
  1. **`User` (Standard Role):**
     - Full management of personal finances (Accounts, Transactions, Budgets, Credit Cards, Investments, Joint SIPs, Loans, and Gifts).
     - Full access to participate in and host collaborative Trips.
     - Device session management for their own logins (`/settings/sessions`).
     - **Strict Boundary:** No access to system audit logs, server sync telemetry, or other users' profiles.
  2. **`Admin` (Superuser / System Administrator):**
     - Inherits all `User` capabilities for personal finances.
     - Full access to the **Admin ERP Console**:
       - System-wide Audit Logs (`/admin/audit-logs`) with before/after JSON diffs.
       - Sync Queue Monitor (`/admin/sync-monitor`) tracking offline mutations, latency, and conflict resolutions.
       - User & Session Management (`/admin/users`) for monitoring account status, locks, and active sessions.
- **Initial Setup & Admin Seeding Rule:**
  - The very first user account registered during system installation is **automatically granted the `Admin` role**.
  - Subsequent registered accounts default to the `User` role, but an existing Admin can promote/demote users via the Admin ERP console.

### 6.1 Accounts Module
- **Core Concept & Boundary:** In WealthFlow, an "Account" is strictly an internal **bookkeeping profile / tracking container** (similar to a column or tab in an Excel workbook) to track where money flows. WealthFlow **never** prompts for, connects to, or stores sensitive net banking credentials, bank login passwords, OTPs, debit card PINs, CVVs, or full bank account numbers. All records are user-managed or imported via spreadsheet.
- **Supported Account Types:** Savings Bank Account, Current Account, Cash-in-Hand, Digital Wallets (Paytm, Amazon Pay, PhonePe), Fixed Deposit/Savings Schemes.
- **Account Metadata:**
  - Name / Nickname (e.g., "HDFC Salary Account", "ICICI Emergency Fund", "Physical Cash")
  - Account Type (`Bank`, `Cash`, `Wallet`, `Other`)
  - Currency (`INR` default, ISO 4217 ready)
  - Opening Balance & Opening Date
  - Current Balance (dynamically reconciled and materialized)
  - Account Number Mask / Last 4 Digits (e.g., `•••• 4821` purely for user visual identification)
  - Status (`Active`, `Archived`, `Closed`)
  - Sort Order & Color Tag
- **Rules:**
  - An account cannot be deleted if historical transactions are linked to it (must be `Archived`).
  - Transfers between accounts require distinct source and target accounts.

### 6.2 Categories & Tagging
- **Hierarchical Structure:** Unlimited two-level hierarchy (Parent Category -> Child Subcategories).
- **Default Seed Hierarchy:**
  - **Food & Dining:** Groceries, Restaurant, Protein Supplements, Snacks, Coffee/Tea, Delivery.
  - **Housing & Utilities:** Rent, Electricity, Water, Internet, Gas, Maintenance.
  - **Transportation:** Fuel, Cab/Auto, Public Transit, Vehicle Maintenance, Tolls.
  - **Health & Fitness:** Gym Membership, Medical/Doctor, Medicines, Sports Equipment.
  - **Shopping & Lifestyle:** Clothing, Footwear, Electronics, Personal Care, Subscriptions.
  - **Entertainment:** Movies, Outings, Games, Streaming Services.
  - **Travel:** Flights, Trains, Hotels, Sightseeing, Trip Food.
  - **Education & Career:** Books, Courses, Certifications, Software.
  - **Family & Gifts:** Gifts, Donations, Remittances.
  - **Financial Obligations:** Insurance Premiums, Taxes, Bank Charges.
- **Custom Categories:** Users can create, edit, reorder, and archive categories.
- **Specialized Tracking:** Dedicated system flags for **Protein Spending** and **Clothing Spending** to allow granular fitness and lifestyle budget monitoring.

### 6.3 Expenses & Income Tracking
- **Transaction Fields:**
  - Transaction ID (Client-generated UUID)
  - User ID / Account ID
  - Amount (`decimal(18,2)`)
  - Transaction Date & Time
  - Event Type (`Expense`, `Income`, `Transfer`, etc.)
  - Category ID / Subcategory ID
  - Description / Title
  - Merchant / Payee Name
  - Notes / Internal Remarks
  - Receipt Attachment Link (Stored in **Google Drive** when running on PostgreSQL; stored in **Azure Blob Storage** when running on Azure SQL)
  - Tags (array of strings, e.g., `["tax-deductible", "office-reimbursable"]`)
  - Linked Entity Type (`None`, `Trip`, `CreditCard`, `Loan`, `SIP`)
  - Linked Entity ID
  - Sync Status (`Pending`, `Synced`, `Failed`, `Conflict`)
  - Concurrency Token (`xmin` / `RowVersion`)
- **Deployment-Specific File Storage Rule:**
  - **PostgreSQL Environment:** Uses Google Drive API v3 via a dedicated Service Account to store receipts/attachments in a private Drive folder.
  - **Azure Environment:** Completely disables Google Drive and uses native Azure Blob Storage. Business and domain logic remain unchanged.

### 6.4 Credit Cards (Liability Management)
Credit cards are explicitly modeled as **Liabilities**, not standard asset bank accounts.
- **Fields:**
  - Card Name (e.g., "HDFC Regalia Gold", "Axis Magnus")
  - Bank / Issuer
  - Last 4 Digits
  - Credit Limit (e.g., ₹5,00,000.00)
  - Billing Cycle Statement Date (e.g., 15th of every month)
  - Payment Due Date (e.g., 5th of next month)
  - Current Outstanding Balance (computed as Total Unsettled Purchases - Total Payments)
  - Available Credit (Credit Limit - Current Outstanding)
  - Status (`Active`, `Blocked`, `Expired`)
- **Crucial Double-Count Prevention Rule:**
  - **Card Purchase:** ₹2,000 spent on Groceries -> Category Expense = +₹2,000, Card Outstanding = +₹2,000. Net Worth decreases by ₹2,000 (Liability increases).
  - **Card Bill Payment:** ₹2,000 paid from HDFC Bank -> HDFC Balance = -₹2,000, Card Outstanding = -₹2,000. Net Worth change = ₹0 (Asset decreases by ₹2,000, Liability decreases by ₹2,000). **This payment is strictly a debt reduction, NOT an expense.**

### 6.5 Budgets
- **Budget Scopes:** Monthly Budgets, Annual Budgets, Category-Specific Budgets, and Custom Aggregations (e.g., "Food Overall", "Protein Specific", "Travel").
- **Metrics Displayed:**
  - Allocated Budget Amount
  - Actual Spent Amount (reconciled in real-time)
  - Remaining Amount
  - Utilization Percentage (`(Spent / Budget) * 100`)
  - Historical Trend (last 6 months comparison)
- **Configurable Threshold Notifications:**
  - **80% Utilization:** Warning State (Visual alert: Amber).
  - **90% Utilization:** Critical State (Visual alert: Orange).
  - **100%+ Utilization:** Exceeded State (Visual alert: Red with overspend amount).

### 6.6 Investments & Systematic Investment Plans (SIP)
- **Asset Classes:** Mutual Funds (Equity, Debt, Hybrid), Direct Stocks, Fixed Deposits (FD), Public Provident Fund (PPF), National Pension System (NPS), Gold/Sovereign Gold Bonds (SGB).
- **Core Investment Metrics:**
  - Invested Principal Amount
  - Current Market Value (manual entry or periodic update)
  - Absolute Profit / Loss (`Current Value - Invested Amount`)
  - Simple Return % and XIRR/CAGR indicators
- **Systematic Investment Plans (SIP):**
  - SIP Name (e.g., "Nifty 50 Index Fund SIP")
  - Target Investment Asset ID
  - Monthly Execution Day (e.g., 5th of month)
  - Total SIP Amount (e.g., ₹15,000.00)
  - Source Debit Account (e.g., HDFC Salary)
  - Start Date & Optional End Date
  - Status (`Active`, `Paused`, `Stopped`)
  - Execution History & Next Scheduled Date
- **Joint & Co-Funded SIP Tracking (CRITICAL BUSINESS RULE):**
  - Support for SIPs co-funded with another individual (e.g., Brother, Partner, Family Member).
  - **Split Definition:** User defines contribution shares (e.g. Total: ₹15,000; User Share: ₹7,500; Co-Investor Share: ₹7,500; Co-Investor Name: "Brother").
  - **Automated Double-Counting & Equity Distortion Prevention:**
    - When ₹15,000 debits from the user's bank account on execution day, the system does **NOT** count the full ₹15,000 as the user's personal portfolio equity.
    - **Ledger Impact:**
      - Bank Account: Debited by `-₹15,000.00`
      - User Investment Portfolio: Credited by `+₹7,500.00` (User's true asset share)
      - Co-Investor Receivable: Automatically logged as `+₹7,500.00` owed by Brother (Active Loan / Receivable Asset)
      - Net Balance Sheet change = ₹0 (Asset redistribution without distorting personal wealth).
  - **Asynchronous Reconciliation & Settling Up:**
    - The co-investor may pay earlier, later, in partial installments, or offset against mutual expenses.
    - Includes a dedicated **SIP Reconciliation Ledger**:
      - Shows total due from co-investor across all monthly cycles.
      - One-tap `[Record Partner Contribution]` button to log repayments (e.g., "Brother transferred ₹7,500 via UPI"), which debits the receivable and credits the user's bank account.
      - Allows offsetting against other debts (e.g. if user owed brother ₹2,000 for groceries, settle net ₹5,500).

---

### 6.7 Loans & Gifts
- **Loans (Bilateral Debt Management):**
  - Direction: `Loan Given` (Money lent to others = Asset/Receivable) or `Loan Received` (Money borrowed from others = Liability/Payable).
  - Counterparty Name (e.g., "Amit Sharma") & Contact Details.
  - Principal Amount.
  - Repayments Log (Date, Amount, Source/Target Account, Notes).
  - Outstanding Balance (`Principal - Sum(Repayments)`).
  - Due Date & Settlement Status (`Open`, `Partially Repaid`, `Fully Settled`).
- **Gifts:**
  - Formally differentiated from loans. Gifts do not generate receivables or liabilities.
  - Tracked under dedicated Gift Categories with recipient/donor attribution.

### 6.8 Multi-Device Sessions & Expiration Management
- **Concurrent Device Support:** A single user can simultaneously log in across multiple devices (e.g., MacBook Chrome, Windows Desktop, iPhone Safari/PWA, Android Tablet) without being prematurely logged out on other devices.
- **Device Identity Tracking:** Every active login creates an isolated session recording:
  - Device Name / Label (e.g., "MacBook Pro - Chrome", "iPhone 15 - Safari")
  - Device Type (`Desktop`, `Mobile`, `Tablet`, `Other`)
  - Client IP Address & Approximate Geo/Network Info
  - Last Active Timestamp
- **Session Expiration Rules:**
  - **Access Token Expiration:** 15 minutes (short-lived JWT stored in memory).
  - **Sliding Inactivity Expiration:** If a device is idle and does not communicate with the API for 7 consecutive days, its refresh token expires and requires re-authentication.
  - **Absolute Expiration:** Maximum session lifetime of 30 days regardless of activity, forcing a fresh credential check for heightened financial security.
- **Remote Revocation & Session Management:**
  - Users can view all currently active devices in Settings (`/settings/sessions`).
  - Current device is flagged with a distinct badge ("This Device").
  - Users can click **"Revoke Session"** on any specific device or **"Log out of all other devices"**, instantly invalidating the associated refresh tokens.

---

## 7. Collaborative Trips & Splitting Specification

Trips represent a premier feature of WealthFlow, combining real-time group collaboration, flexible expense division, and automated debt optimization.

```
                  ┌─────────────────────────────────────┐
                  │              TRIP ROOT              │
                  │ (Name, Dates, Budget, Currency: INR)│
                  └──────────────────┬──────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
  [TRIP MEMBERS]             [TRIP EXPENSES]             [TRIP ADVANCES]
  - Registered User          - Amount, Payer             - Advance Giver
  - Guest (Secure Token)     - Splits:                   - Advance Receiver
                             * Equal / Unequal           - Amount (NOT an expense)
                             * Percentage / Shares
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │   SETTLEMENT ENGINE    │
                        │ (Optimized Repayments) │
                        └────────────────────────┘
```

### 7.1 Trip Entity Model
- Trip ID, Name (e.g., "Goa Vacation 2026"), Destination.
- Start Date & End Date.
- Overall Trip Budget & Real-time Spent Total.
- Host User ID (Trip Owner).
- Trip Status (`Planning`, `Active`, `Archived`, `Settled`).

### 7.2 Trip Members & Guest Architecture
- **Member Types:**
  1. **Registered System Users:** Linked directly via their `UserId`.
  2. **Guest Members:** For friends/family who do not have a WealthFlow account.
- **Guest Link Concept:** `/trip/{tripId}/guest/{secureToken}`
- **Guest Security Guarantees:**
  - Cryptographically random, URL-safe 256-bit entropy token.
  - Guests have **zero visibility** into the host's bank accounts, other trips, personal expenses, or investments.
  - Owner can revoke or regenerate any guest token at any time.
  - Guests can be granted scoped permissions: `ViewOnly` or `CanAddExpense`.

### 7.3 Trip Expense Splitting Models
Every trip expense has a single primary Payer (or multiple payers) and a set of split allocations. The engine enforces strict mathematical validation before persistence.

1. **Equal Split:**
   $$\text{Share}_i = \frac{\text{Total Amount}}{N}$$
   *Validation:* Any remainder due to decimal division is allocated deterministically to the first participant (or rounded to 2 decimal places such that $\sum \text{Share}_i = \text{Total Amount}$).
2. **Unequal (Exact Amount) Split:**
   *Validation:* Exactly $\sum_{i=1}^N \text{Amount}_i = \text{Total Amount}$.
3. **Percentage Split:**
   *Validation:* Exactly $\sum_{i=1}^N \text{Percentage}_i = 100.00\%$. $\text{Share}_i = \frac{\text{Percentage}_i}{100} \times \text{Total Amount}$.
4. **Shares-Based Split:**
   *Example:* Rahul (2 shares), Amit (1 share), Neha (1 share) -> Total = 4 shares.
   $$\text{Share}_i = \frac{\text{Shares}_i}{\sum \text{Shares}} \times \text{Total Amount}$$
5. **Participant-Specific (Itemized) Split:** Individual line items assigned exclusively to specific subsets of members.

### 7.4 Decentralized Multi-Payer Logging & Google Pay Summary Model
WealthFlow supports a decentralized group expense workflow directly inspired by **Google Pay Groups** and **Splitwise**:
1. **Decentralized Multi-Payer Logging:**
   - Any trip member (registered user or guest with link) can record an expense that *they personally paid for* (e.g. Rahul pays ₹4,000 for dinner; Amit pays ₹1,200 for fuel; Neha pays ₹800 for snacks; Rohit pays ₹2,500 for hotel).
   - The payer selects the participants who enjoyed the expense (defaults to all active members equally).
   - This creates an open, transparent chronological group feed where each person logs their own payments in real-time.
2. **Aggregated Group Spending Matrix (Google Pay Summary View):**
   - The Trip workspace features a live **Group Summary Dashboard**:
     - **Total Group Cost:** $\sum \text{All Member Expenses}$.
     - **Per-Member Spending Matrix:** Table showing for each member:
       - `Total Paid`: Total cash out-of-pocket spent by this person.
       - `Fair Share`: Total debt share owed by this person across all group expenses.
       - `Net Balance`: Difference ($\text{Total Paid} - \text{Fair Share}$).
   - **Personalized Status Hero Banner:**
     - For current viewer: Prominently highlights their personal financial standing:
       - *"In this trip, you get back ₹1,875.00"* (if positive net balance).
       - *"In this trip, you owe ₹625.00"* (if negative net balance).
       - *"You are all settled up in this trip!"* (if balance is zero).
3. **Direct "Who Pays Whom" Settlement Instructions:**
   - The summary translates complex multi-payer webs into minimal direct bilateral repayments:
     - Card: **Amit** pays **Rahul** `₹625.00`
     - Card: **Neha** pays **Rahul** `₹1,250.00`
     - Card: **Neha** pays **Rohit** `₹75.00`
   - Includes one-tap `[Mark as Settled / Settle Up]` action allowing either debtor or creditor to confirm payment (with optional UPI transaction reference).

---

## 8. Travel Advances & Settlement Engine

### 8.1 The Travel Advance Business Rule (CRITICAL)
> **CARDINAL RULE:** An Advance is **NEVER** a trip expense. It does **NOT** increase the total cost of the trip.

- **Definition:** An advance is an informal loan or capital transfer between two trip participants before or during a trip (e.g., Amit transfers ₹500 via UPI to Rahul to book train tickets on his behalf).
- **Accounting Effect:**
  - Total Trip Expenses remains unchanged.
  - Rahul (Receiver) now holds ₹500 of Amit's money.
  - In the final settlement, Rahul owes Amit ₹500, or Amit's net settlement requirement is credited by ₹500.
- **Double-Counting Prevention:** The system maintains a distinct `TripAdvance` ledger completely separate from `TripExpense`.

### 8.2 Universal Participant Balance Equation
For every participant $k$ in a trip, their net financial balance is calculated as:

$$\text{NetBalance}_k = \text{Paid}_k + \text{AdvRecv}_k - \text{AdvGiven}_k - \text{Share}_k + \text{SettlementsRecv}_k - \text{SettlementsPaid}_k$$

Where:
- $\text{Paid}_k$: Total monetary sum directly paid by participant $k$ for trip expenses.
- $\text{AdvRecv}_k$: Total advances received by participant $k$ from other members (increases their liability to the group).
- $\text{AdvGiven}_k$: Total advances given by participant $k$ to other members (acts as a credit).
- $\text{Share}_k$: Total split obligations owed by participant $k$ across all trip expenses.
- $\text{SettlementsRecv}_k$: Total post-trip settlement payments already received by participant $k$.
- $\text{SettlementsPaid}_k$: Total post-trip settlement payments already paid by participant $k$.

**Interpretation of Net Balance:**
- $\text{NetBalance}_k > 0$: Participant $k$ is a **Creditor** (is owed money by the group).
- $\text{NetBalance}_k < 0$: Participant $k$ is a **Debtor** (owes money to the group).
- $\text{NetBalance}_k = 0$: Participant $k$ is **Settled**.

### 8.3 Debt Simplification & Settlement Minimization Algorithm
To avoid circular or redundant payments (e.g., A pays B ₹500 and B pays C ₹500), WealthFlow implements a **Greedy Debt Minimization Algorithm**:
1. Compute $\text{NetBalance}_k$ for all participants.
2. Separate into two lists:
   - **Debtors** with negative balances: list of $(\text{Member}_i, \text{AmountOwed}_i)$ where $\text{AmountOwed}_i = |\text{NetBalance}_i|$.
   - **Creditors** with positive balances: list of $(\text{Member}_j, \text{AmountDue}_j)$ where $\text{AmountDue}_j = \text{NetBalance}_j$.
3. Sort Debtors and Creditors in descending order of absolute amount.
4. Greedily match the largest debtor with the largest creditor:
   - Transfer amount $T = \min(\text{AmountOwed}_i, \text{AmountDue}_j)$.
   - Generate instruction: **Member $i$ pays Member $j$ ₹$T$**.
   - Decrement balances: $\text{AmountOwed}_i \leftarrow \text{AmountOwed}_i - T$, $\text{AmountDue}_j \leftarrow \text{AmountDue}_j - T$.
   - Remove any member whose balance reaches zero.
   - Repeat until all debts are cleared ($\sum \text{Balance} = 0$).

---

## 9. Offline-First & Data Synchronization

- **Client Storage:** Browser **IndexedDB** using Dexie.js as an abstraction layer.
- **Service Worker:** Progressive Web App (PWA) caching shell assets (HTML, JS, CSS, fonts) for instant offline boot.
- **Sync Queue Statuses:**
  - `Pending`: Operation recorded locally while offline; waiting for network.
  - `Synced`: Successfully acknowledged and persisted by the backend.
  - `Failed`: Rejected by backend due to fatal schema or validation error.
  - `Conflict`: Server state conflicts with client state (resolved via server-authoritative timestamps or optimistic concurrency).
- **Idempotency Guarantee:** Every mutation payload contains a client-generated GUID `IdempotencyKey`. The backend caches recently processed keys; repeated sync attempts return the original success response without re-executing transactions.

---

## 10. Analytics, Net Worth, & Reporting

### 10.1 Net Worth Engine
Calculated dynamically in real-time:
$$\text{Net Worth} = \sum \text{Assets} - \sum \text{Liabilities}$$
- **Assets:**
  - Bank Account Balances
  - Physical Cash Balances
  - Digital Wallet Balances
  - Current Market Value of Investments
  - Active Loan Receivables (Money Lent to Others)
- **Liabilities:**
  - Credit Card Outstanding Balances
  - Active Loan Payables (Money Borrowed from Others)
  - Other Recorded Obligations

### 10.2 Analytics Dashboards
- **Monthly Burn Rate & Savings Rate:** `((Income - Expenses) / Income) * 100`.
- **Category Donut / Sunburst:** Drilldown from Top Category (e.g., Food) to Subcategories (e.g., Protein, Groceries).
- **Cash Flow Waterfall:** Visualizing Opening Balance -> +Income -> -Expenses -> -Investments -> Closing Balance.
- **Trip Financial Post-Mortem:** Total trip cost, average per-day cost, category split, and settlement status.

---

## 11. Data Import / Export

- **Excel & CSV Import Pipeline:**
  1. **Upload:** User uploads `.xlsx`, `.xls`, or `.csv` file.
  2. **Column Mapping:** Interactive UI mapping spreadsheet columns to WealthFlow fields (`Date`, `Amount`, `Description`, `Category`, `Account`).
  3. **Preview & Deduplication:** System scans for potential duplicate entries and displays a preview grid.
  4. **Validation:** Identifies unparseable dates, negative values, or unknown accounts before committing.
  5. **Atomic Ingestion:** Imports records inside a transactional database batch.
- **Export Capabilities:** Full export of transaction ledgers, trip sheets, and tax reports to `.xlsx` and standard `.csv`.

---

## 12. Future AI Vision (Non-V1 Boundary)

While not part of the initial V1 deliverable, the system data structures support future AI capabilities:
- **Receipt OCR Engine:** Auto-extracting Date, Merchant, Total, Line Items, and Tax from uploaded image receipts.
- **Intelligent Categorization:** Predicting subcategories based on description patterns (e.g., "Blinkit" -> "Groceries", "The Whole Truth" -> "Protein").
- **Spending Anomaly Detection:** Proactively flagging duplicate card charges or unusual spikes in discretionary spending.
- **Strict Guardrail:** All AI features will operate in an advisory capacity. **No AI model shall silently create, alter, or delete financial records without explicit human review and approval.**

---

## 13. Acceptance Criteria & MVP Scope Definition

### 13.1 Phase 1 (MVP Scope) Checklist
- [ ] User can create, edit, and archive Bank, Cash, Wallet, and Credit Card accounts.
- [ ] User can record Income, Expenses, and Account Transfers with immediate balance reflection.
- [ ] Category hierarchy with specialized Protein and Clothing subcategories.
- [ ] Monthly budget tracking with 80%, 90%, and 100% threshold visual alerts.
- [ ] Credit card purchase records expense and liability without double-counting on payment.
- [ ] Loan management for money given and received with partial repayment tracking.
- [ ] Trips creation with registered members and token-based guest participants.
- [ ] Trip expenses with Equal, Unequal, Percentage, and Shares split models.
- [ ] Travel advances tracked strictly as settlement prepayments outside trip expense totals.
- [ ] Settlement engine calculates optimized debt repayments.
- [ ] Full offline PWA support with IndexedDB and background synchronization.
- [ ] Multi-platform responsive UI formatted in INR (₹).
- [ ] PostgreSQL backend with portable EF Core abstractions designed for future Azure SQL.

---

*End of Product Requirements Document.*

