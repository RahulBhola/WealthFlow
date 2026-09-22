# WEALTHFLOW — FRONTEND SPECIFICATION DOCUMENT (FSD)
**Document Version:** 1.0.0  
**Status:** Under Review  
**Target Delivery:** Modern Responsive PWA V1.0  
**Core Stack:** React 19, TypeScript, Vite, Tailwind CSS, TanStack Query v5, Dexie.js (IndexedDB)  

---

## 1. Frontend Architecture & Technology Stack

WealthFlow is built as a lightning-fast, offline-first Progressive Web Application (PWA). It emphasizes high data density, frictionless entry, real-time feedback, and accessible financial visualization.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       WEALTHFLOW CLIENT APPLICATION                     │
├─────────────────────────────────────────────────────────────────────────┤
│  UI Framework:     React 19 + TypeScript (Strict Mode)                  │
│  Build Tool:       Vite 6 + Rollup + @vite-pwa                          │
│  Styling:          Tailwind CSS 3.4+ / 4.0 + Lucide React Icons         │
│  State & Cache:    TanStack Query v5 (Server State) + Zustand (UI State)│
│  Forms & Validate: React Hook Form + Zod                                │
│  Data Viz:         Recharts 2.x (Responsive SVGs)                       │
│  Offline Cache:    Dexie.js (IndexedDB Wrapper) + Service Worker (PWA)  │
│  Routing:          React Router v6/v7 (Data APIs, Lazy Loading)         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component-Based Architecture (CBA) & Directory Structure

WealthFlow's frontend is strictly engineered around **Component-Based Architecture (CBA)**. Every visual and interactive element is decomposed into self-contained, highly reusable, composable, and independently testable building blocks.

### 2.1 Component Taxonomy & Atomic Layering
To prevent monolithic components and maintain clean boundaries, components are categorized into a 5-tier atomic hierarchy:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    COMPONENT-BASED TAXONOMY (CBA)                       │
├───────────────────┬───────────────────┬─────────────────────────────────┤
│ Tier              │ Directory Path    │ Responsibility & Characteristics│
├───────────────────┼───────────────────┼─────────────────────────────────┤
│ 1. Atoms          │ `components/ui/`  │ Pure primitive presentation:    │
│    (Primitives)   │                   │ `Button`, `Input`, `Badge`,     │
│                   │                   │ `MoneyDisplay`, `Icon`.         │
│                   │                   │ Zero business logic, stateless. │
├───────────────────┼───────────────────┼─────────────────────────────────┤
│ 2. Molecules      │ `components/ui/`  │ Composed multi-atom controls:   │
│    (Composites)   │ `components/common`│ `FormField` (Label+Input+Error),│
│                   │                   │ `SearchInput`, `DateRangePicker`│
│                   │                   │ `MoneyInput` (INR auto-comma).  │
├───────────────────┼───────────────────┼─────────────────────────────────┤
│ 3. Organisms      │ `features/*/`     │ Self-contained domain widgets:  │
│    (Domain Blocks)│ `components/`     │ `TransactionRow`, `JointSipCard`│
│                   │                   │ `SettleUpCard`, `BudgetMeter`.  │
│                   │                   │ Compose atoms & molecules.      │
├───────────────────┼───────────────────┼─────────────────────────────────┤
│ 4. Templates      │ `components/`     │ Structural layout frames:       │
│    (Layout Shells)│ `layout/`         │ `AppLayout`, `Sidebar`, `Header`│
│                   │                   │ `ModalShell`, `ResponsiveGrid`. │
├───────────────────┼───────────────────┼─────────────────────────────────┤
│ 5. Pages          │ `features/*/`     │ Route endpoints & orchestrators:│
│    (Route Views)  │ `pages/`          │ `DashboardPage`, `TripsPage`.   │
│                   │                   │ Binds hooks & passes pure props.│
└───────────────────┴───────────────────┴─────────────────────────────────┘
```

### 2.2 Core Architectural Principles & Component Patterns

1. **Container / Presentational Pattern (Separation of Concerns):**
   - **Presentational Components (Dumb):** 100% pure functional components that take data and callbacks exclusively via props (`Props -> JSX`). They never invoke TanStack Query, fetch APIs, or touch global store directly.
   - **Container Hooks (Smart):** Custom React hooks (e.g., `useJointSips()`, `useTripSettlement(tripId)`) encapsulate all query fetching, mutations, optimistic cache updates, and error handling. Pages and containers consume these hooks and pass pristine data down to presentational components.
2. **Compound Component Pattern:**
   - Used for complex, multi-part UI elements to guarantee declarative flexibility without prop bloat:
     ```tsx
     <Modal isOpen={isOpen} onClose={closeModal}>
       <Modal.Header title="Record Partner Contribution" />
       <Modal.Body><JointSipRepaymentForm sipId={sipId} /></Modal.Body>
       <Modal.Footer><Button variant="secondary">Cancel</Button></Modal.Footer>
     </Modal>
     ```
3. **Slot & Composition Pattern:**
   - Components favor composition over inheritance and configuration props. Flexible slots (`headerSlot`, `actionsSlot`, `children`) enable parent components to inject contextual buttons and badges without polluting child component APIs.
4. **Single Responsibility Principle (SRP):**
   - Every component has exactly one reason to exist and change. A tabular row component renders a formatted row; it does not calculate tax depreciation or orchestrate network requests.
5. **Strict TypeScript Prop Contracts:**
   - Every component exposes an explicitly named, strongly typed interface (`interface JointSipCardProps`).
   - `any` types are strictly prohibited.
   - Props are treated as immutable (`Readonly<Props>`).
6. **Performance & Memoization Optimization:**
   - High-density list items (`TransactionRow`, `SipReconciliationRow`, `TripMemberRow`) are wrapped with `React.memo` to eliminate unnecessary parent re-renders.
   - Event handlers passed to child components utilize `useCallback`.
   - Heavy financial calculations (running totals, balance sheets, debt minimization trees) use `useMemo`.

### 2.3 Modular Directory Structure

```
frontend/src/
├── app/                        # Application Shell, Providers, Router Configuration
│   ├── App.tsx                 # Root component with providers tree
│   ├── routes.tsx              # Lazy-loaded route definitions
│   └── rootReducer.ts
├── components/                 # Shared Generic UI Library (Pure, Feature-Agnostic)
│   ├── ui/                     # Tier 1 & 2: Atoms and Molecules
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── MoneyInput.tsx      # INR auto-formatting currency input
│   │   ├── MoneyDisplay.tsx    # Semantic color & icon financial text
│   │   ├── FormField.tsx       # Composite Label + Control + Error message
│   │   ├── DataTable.tsx       # Virtualized, sortable, filterable ERP table
│   │   ├── Modal.tsx           # Compound dialog component
│   │   ├── Drawer.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Badge.tsx
│   │   └── Toast.tsx
│   ├── layout/                 # Tier 4: Layout Templates & Shells
│   │   ├── AppLayout.tsx       # Responsive desktop/mobile shell switcher
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── BottomNav.tsx       # Mobile bottom navigation bar
│   │   └── QuickAddFAB.tsx     # Floating Action Button
│   └── feedback/               # ErrorBoundaries, LoadingSkeletons, EmptyStates
├── features/                   # Domain-Specific Feature Modules (Encapsulated)
│   ├── auth/                   # Authentication & Session Management
│   │   ├── components/         # LoginForm, DeviceSessionCard, RevokeModal
│   │   ├── hooks/              # useAuth, useActiveSessions
│   │   ├── pages/              # LoginPage, SessionsPage
│   │   └── types/              # Auth DTOs & session interfaces
│   ├── dashboard/              # Executive Dashboard widgets
│   ├── transactions/           # Transaction ledger, quick add, filters
│   ├── accounts/               # Bank, cash, wallet management, transfer modal
│   ├── budgets/                # Budget progress bars, food/protein sub-trackers
│   ├── creditCards/            # Card visualizer, billing cycle meter, pay bill modal
│   ├── investments/            # Portfolio tracker, P&L badge, SIP scheduler
│   │   ├── components/         # PortfolioCard, JointSipCard, SipReconciliationRow
│   │   ├── hooks/              # useInvestments, useJointSips, useSipReconciliation
│   │   ├── pages/              # InvestmentsPage, SipSchedulePage
│   │   └── types/              # Investment DTOs, JointSip interfaces
│   ├── loans/                  # Given/Received debt tracker, repayment recorder
│   ├── trips/                  # Collaborative trips workspace
│   │   ├── components/         # TripSummaryMatrix, SettleUpCard, SplitEditor
│   │   ├── hooks/              # useTrip, useTripExpenses, useTripSettlement
│   │   ├── pages/              # TripsListPage, TripWorkspacePage, GuestTripPage
│   │   └── types/              # Trip DTOs, settlement graph contracts
│   ├── analytics/              # Recharts trends, category donut, cash flow waterfall
│   └── sync/                   # Offline queue drawer, sync status pill, conflict modal
├── hooks/                      # Shared utility hooks (useOffline, useMedia, useKeybind)
├── lib/                        # Third-party wrappers (axios/fetch client, Dexie db schema)
├── services/                   # SignalR connection manager, IndexedDB sync agent
└── types/                      # Global TypeScript interfaces, Enums, DTO contracts
```

---

## 3. Unified Application Styling Layout & Navigation Flow

WealthFlow strictly enforces **one universal styling layout across the entire application**. No feature, screen, or module is permitted to implement custom layouts, divergent spacing scales, ad-hoc card borders, or standalone CSS systems. Every view—from daily expense logging to group trip workspaces, settings, and Admin ERP consoles—strictly mounts within the exact same visual shell.

### 3.1 The "Single Styling Layout Across All Application" Standard

Every route without exception renders inside the master **`AppLayout.tsx`** component and adheres to a standardized 5-tier page anatomy:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       UNIVERSAL PAGE ANATOMY                            │
├─────────────────────────────────────────────────────────────────────────┤
│ Tier 1: PageHeader                                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Breadcrumb > Section                                                │ │
│ │ Page Title (24px bold)                     [Action Button Group]    │ │
│ │ Descriptive Subtitle (14px slate-500)                               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Metric / KPI Strip (3-4 Uniform Metric Cards)                   │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│ │ Icon Metric 1 │ │ Icon Metric 2 │ │ Icon Metric 3 │ │ Icon Metric 4 │ │
│ │ ₹1,45,200.00  │ │ ₹24,800.00    │ │ +12.4% ↑      │ │ 3 Pending ⚠   │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ Tier 3: 12-Column Responsive Layout Grid (gap-6)                        │
│ ┌──────────────────────────────────────────────┬──────────────────────┐ │
│ │ Primary Content Region (Col-Span-8)          │ Secondary Region     │ │
│ │ - High-Density ERP DataTable                 │ (Col-Span-4)         │ │
│ │ - Interactive Recharts Financial Visualizer  │ - Summary Card       │ │
│ │ - Transaction Feed / Ledger                  │ - Quick Action Form  │ │
│ │                                              │ - Filters / Context  │ │
│ └──────────────────────────────────────────────┴──────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ Tier 4: Standardized Card Architecture (Card, CardHeader, CardBody)     │
│ - Shared Canvas: `bg-white dark:bg-slate-900 border border-slate-200`  │
│ - Shared Radius: `rounded-xl` (12px) | Shared Elevation: `shadow-sm`    │
│ - Shared Padding: `p-4 sm:p-6` across every card in the product        │
├─────────────────────────────────────────────────────────────────────────┤
│ Tier 5: Standardized Dialogs (Modal & Drawer)                           │
│ - Backdrop: `backdrop-blur-sm bg-slate-900/50` | Corners: `rounded-2xl`│
│ - Standard Action Footer: `[Cancel]` Secondary + `[Confirm]` Primary    │
└─────────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DESKTOP SHELL (>= 1024px)                          │
├──────────────┬──────────────────────────────────────────────────────────┤
│ SIDEBAR      │ HEADER: Global Search | Sync Pill | Quick Add | Profile  │
│ - Dashboard  ├──────────────────────────────────────────────────────────┤
│ - Ledger     │ MAIN VIEWPORT (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`) │
│ - Accounts   │ Scrollable container hosting the Universal Page Anatomy  │
│ - Budgets    │                                                          │
│ - Cards      │                                                          │
│ - Invest/SIP │                                                          │
│ - Loans/Gift │                                                          │
│ - Trips      │                                                          │
│ - Analytics  │                                                          │
│ - Settings   │                                                          │
│ - Admin ERP  │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                       MOBILE SHELL (< 1024px)                           │
├─────────────────────────────────────────────────────────────────────────┤
│ TOP HEADER: App Logo | Offline/Sync Pill | Search | Profile             │
├─────────────────────────────────────────────────────────────────────────┤
│ MAIN VIEWPORT (Touch-optimized scrollable container, px-4 py-4)         │
│ - 12-column grid collapses to single column (`grid-cols-1 gap-4`)       │
│                                           ┌───────────┐                 │
│                                           │  (+) FAB  │                 │
│                                           └───────────┘                 │
├─────────────────────────────────────────────────────────────────────────┤
│ BOTTOM NAV: [Home]  [Ledger]  [(+) Quick Add]  [Trips]  [More...]       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Route Hierarchy
- **Public Routes (Rendered within minimal auth layout with centered card):**
  - `/login`: Email and password authentication with lockout notification.
  - `/register`: User onboarding and default currency selection (INR).
  - `/forgot-password`: Password reset request flow.
  - `/trip/:tripId/guest/:token`: Standalone guest portal (shares identical card, typography, and button styling).
- **Protected App Routes (Rendered strictly inside `AppLayout`):**
  - `/`: Executive Financial Dashboard.
  - `/transactions`: Full transaction ledger with search, category filtering, and bulk tools.
  - `/accounts`: Bank accounts, digital wallets, cash-in-hand cards, and transfer modal.
  - `/budgets`: Category and period budget progress, food/protein sub-budget tracker.
  - `/credit-cards`: Credit card liability cards, billing cycle meters, bill payoff flow.
  - `/investments`: Portfolio valuation, P&L breakdown, active SIP execution manager.
  - `/loans`: Money given (receivables) vs money received (payables) and repayments.
  - `/trips`: Trip list (Planning, Active, Settled).
  - `/trips/:tripId`: Complete trip workspace (Expenses, Advances, Members, Settlement).
  - `/analytics`: Deep analytics, burn rate, category sunburst, cash-flow waterfalls.
  - `/settings`: Category customization, data export/import, profile, security.
- **Admin ERP Routes (Guarded by `<RoleGuard requiredRole="Admin">`):**
  - `/admin/users`: User management and tenant status.
  - `/admin/audit-logs`: System-wide audit log inspector with filter by IP/user.
  - `/admin/sync-monitor`: Real-time telemetry on sync queue latency and errors.
  - *UI Navigation Rule:* The "Admin ERP" section and badge in `Sidebar.tsx` is conditionally rendered only if `currentUser.role === 'Admin'`. If a standard `User` attempts direct URL access, `RoleGuard` intercepts the request and redirects to `/` with an alert: *"Access Denied: Admin privileges required."*

---

## 4. Screen-by-Screen UI Specifications

### 4.1 Executive Dashboard
- **Top Row KPI Cards:**
  - **Net Worth Card:** ₹ Value with 30-day delta % (Assets ₹X, Liabilities ₹Y).
  - **Liquid Balance Card:** Total sum across checking, savings, wallets, and physical cash.
  - **Monthly Cash Flow:** Income vs. Outflow bar with calculated savings rate %.
  - **Credit Card Liability:** Total outstanding balance across all cards with nearest due date alert.
- **Mid Row Visuals:**
  - **Budget Health Glance:** Top 3 tightest budgets with color-coded utilization meters (Green <80%, Amber 80-89%, Orange 90-99%, Red >=100%).
  - **Recent Activity Stream:** Chronological feed of last 8 transactions with category icons, account chips, and formatted INR amounts.
- **Quick Action Bar:** One-click triggers for `Record Expense`, `Record Income`, `Account Transfer`, and `Trip Expense`.

### 4.2 Quick Add Modal (Universal Mutation Center)
A unified, keyboard-accessible dialog triggered by global shortcut `Ctrl+K` / `Cmd+K` or mobile FAB:
- **Segmented Type Switcher:** `[Expense]` | `[Income]` | `[Transfer]` | `[Investment]` | `[Loan]` | `[Gift]` | `[Trip Expense]`.
- **Dynamic Input Fields:**
  - `Amount`: Large, prominent `MoneyInput` with auto INR commas and ₹ prefix.
  - `Source Account`: Select dropdown showing current available balance for each account.
  - `Category & Subcategory`: Cascading selector with instant search.
  - `Date & Time`: Defaulting to now with single-click "Yesterday" / "Today" buttons.
  - `Description & Merchant`: Autocomplete based on past transaction history.
  - `Attachment`: Drag-and-drop or camera capture for physical receipts.
  - `Tags`: Multi-select pill input.

### 4.3 Transactions Ledger
- **Controls Toolbar:**
  - Search input (queries description, merchant, notes).
  - Date Range Picker (presets: This Month, Last Month, Last 90 Days, Custom).
  - Multi-select filters: Accounts, Categories, Event Types, Tags.
  - Sorting: Date, Amount, Merchant.
- **Table / Card List:**
  - High-density tabular layout on desktop with sticky headers.
  - Mobile card format grouping transactions by day.
  - Semantic amount display: Income in Emerald green with `+`, Expense in slate/rose with `-`, Transfers in neutral sky with `↔`.

### 4.4 Accounts & Transfer UI
- **Accounts Grid:** Cards styled by institution brand color showing Account Name, Masked Number, Account Type, and Materialized Balance.
- **Transfer Modal:** Explicit transfer builder:
  - Select Source Account -> Select Target Account -> Amount -> Optional Transfer Fee -> Date -> Note.
  - Visual diagram showing: `[Source Account -₹Amount]` ──► `[Destination Account +₹Amount]`.
  - Prominent banner: *"Transfers move funds between your accounts and are not recorded as lifestyle expenses."*

### 4.5 Credit Cards Management
- **Visual Card Component:** Rendered with credit card aspect ratio (1.586), showing Bank, Card Name, Last 4 digits, chip graphic, and Available Credit.
- **Utilization Gauge:** Colored progress bar showing percentage of credit limit consumed.
- **Due Date Pill:** Shows countdown (e.g., *"Due in 5 days"* or *"Due Today"* in bold red).
- **"Pay Bill" Action Dialog:**
  - Fields: Source Bank Account, Payment Amount (presets: Minimum Due, Total Outstanding, Custom), Date.
  - **Explicit Accounting Alert:** *"This payment reduces your credit card liability and debits your bank account. It does NOT count as an expense."*

### 4.6 Collaborative Trips Workspace (Google Pay / Splitwise Group Model)
A premier feature containing five dedicated tabs built around a decentralized group expense workflow:
```
┌────────────────────────────────────────────────────────────────────────┐
│  TRIP: GOA VACATION 2026                 [Planning | Active | Settled] │
│  Dates: Oct 12 - Oct 18, 2026 | Budget: ₹50,000 | Total Group: ₹38,400 │
├────────────────────────────────────────────────────────────────────────┤
│  HERO BANNER: "Overall in this trip: You get back ₹1,875.00 ↑"         │
├───────────────┬───────────────┬───────────────┬───────────────┬────────┤
│ 1. Summary    │ 2. Expenses   │ 3. Advances   │ 4. Members    │ 5. Settle│
└───────────────┴───────────────┴───────────────┴───────────────┴────────┘
```

1. **Tab 1: Group Summary (Google Pay Style Dashboard):**
   - **Personal Standing Hero Card:** Instantly answers the user's primary question:
     - Positive balance: *"You get back ₹1,875.00"* (Emerald banner with upward arrow).
     - Negative balance: *"You owe ₹625.00"* (Amber/Rose banner with downward arrow).
     - Zero balance: *"You are all settled up in this trip!"* (Neutral checkmark).
   - **Total Group Cost Gauge:** ₹ Spent vs. Planned Budget progress bar.
   - **Group Spending Matrix (High-Density Table):**
     - Columns: `Member` | `Paid by Them` | `Fair Share Owed` | `Net Balance`
     - Allows every friend in the group to see complete transparency of who has spent what so far.
2. **Tab 2: Decentralized Expenses Feed:**
   - Any member (or guest via link) taps `(+) Add Expense` to record what *they personally paid*:
     - Input: Amount, Category, Description (e.g. "Dinner at Fishermans Wharf"), Date.
     - Payer: Defaults to current user (can be assigned to any member).
     - Split selector: Defaults to *Split Equally between all members*, or custom subset.
   - Transaction list clearly displays: *"Paid by Amit • ₹1,200.00"* with chips showing who was included.
3. **Tab 3: Advances (CRITICAL UI):**
   - **Informational Callout:** *"Advances are informal prepayments or transfers between members (e.g., Amit sends Rahul ₹500 via UPI beforehand). They do NOT increase total trip expenses and are factored directly into final settlements."*
   - Add Advance Modal: Giver -> Receiver -> Amount -> Date -> Notes.
   - Advances List: Shows chronological capital transfers between friends.
4. **Tab 4: Members & Guest Links:**
   - Member roster with avatar, name, registered/guest status.
   - **"Create Guest Link" Action:** Generates `/trip/{tripId}/guest/{secureToken}`.
   - Host can toggle `Can Add Expenses` permission or click `Revoke Link`.
5. **Tab 5: Settlement & "Who Pays Whom" Cards (Google Pay Style):**
   - **Simplified Bilateral Settlement Cards:** Translates all multi-payer balances into the absolute minimum number of payments:
     - Card: **Amit** pays **Rahul** `₹625.00`
     - Card: **Neha** pays **Rahul** `₹1,250.00`
     - Card: **Neha** pays **Rohit** `₹75.00`
   - **One-Tap "Settle Up" Action (Pure Informational Bookkeeping):**
     - Tapping `[Settle Up]` opens a quick settlement recording dialog.
     - **Zero External Payment Integration / Zero UPI Intent:** WealthFlow strictly operates as an informational ledger (like Splitwise). It does **not** trigger external payment gateways, launch banking apps, or execute `upi://pay` deep links (preventing VPA spoofing, fake payment exploits, and browser sandbox risks). Payment occurs independently via the user's preferred banking app.
     - **Dialog Fields:** Amount (pre-filled with simplified debt), Payment Mode tag (`Cash`, `UPI / Bank Transfer`, `Mutual Offset`), Payment Date (defaults to today), and optional Reference Note (e.g., "Paid via GPay UPI Ref #8291").
     - Instantly updates group balances in real-time across all connected devices via SignalR upon confirmation.

### 4.7 Guest Trip View (`/trip/:tripId/guest/:token`)
- A streamlined, distraction-free portal for invited friends:
- Top banner: *"You are viewing Goa Vacation 2026 as Guest (Amit). You do not need an account."*
- Full visibility into trip itinerary, member list, trip expenses, and advances.
- Permitted to click `(+) Add Trip Expense` if the host granted write permissions.
- Access to the Settlement tab to view exactly how much they owe or are owed.
- **Zero navigation links** to host bank accounts, host personal transactions, or any other section of the WealthFlow application.

### 4.8 Split Editor Component
An interactive split editor embedded in Trip Expense forms:
- **Tabs:** `[Equal]` | `[Unequal Amount]` | `[Percentage]` | `[Shares]`.
- **Validation Feedback:**
  - *Equal:* Automatically distributes amount among selected members with deterministic remainder allocation.
  - *Unequal:* Real-time counter showing `Remaining to Allocate: ₹0.00`. Form submit is disabled until difference is exactly zero.
  - *Percentage:* Shows running percentage sum. Submit disabled until sum equals `100.00%`.
  - *Shares:* Calculates dynamic proportion $\frac{\text{Member Shares}}{\text{Total Shares}} \times \text{Total Amount}$.

### 4.9 Active Sessions & Device Management UI (`/settings/sessions`)
- **Device List Screen:** High-density device cards for all authorized active logins:
  - **Device Type Icon:** Laptop (`Laptop`), Mobile (`Smartphone`), Tablet (`Tablet`).
  - **Device Metadata:** Device / OS Name (e.g. "MacBook Pro - Chrome 128"), IP Address, Approximate Location, Initial Login Date.
  - **Activity Indicator:** "Active Now" (green pulse) or "Last active 3 hours ago".
  - **Current Session Badge:** Bold badge `[This Device]` with revocation disabled for itself (standard logout used instead).
- **Session Actions:**
  - `[Revoke Session]` button on individual devices: Prompts confirmation, immediately terminates the remote session.
  - `[Log Out of All Other Devices]` hero action: One-click security panic button invalidating all sessions across all other phones/laptops except the current one.
- **Expiration Telemetry:**
  - Displays remaining session validity (sliding 7-day idle window and absolute 30-day expiry).
  - Graceful token expiration prompt: When access/refresh tokens expire, an unobtrusive modal notifies: *"Your session has expired. Please enter your password to continue without losing your unsaved work."*

### 4.10 Investments, SIP Scheduler & Joint SIP Reconciliation UI (`/investments`)
- **Portfolio Overview Cards:**
  - `Total Invested` vs `Current Valuation` with overall profit/loss badge (+₹X / +Y.Z%).
  - Asset class allocation chips: Mutual Funds, Stocks, FDs, PPF, NPS, Gold.
- **SIP Scheduler & Active Plans:**
  - Active SIP Cards detailing: Target Scheme Name, Monthly Execution Day (e.g. 5th of month), Source Bank Account, Next Scheduled Date.
  - Quick action controls: `Pause`, `Resume`, `Edit`, `Stop`.
- **Joint / Co-Funded SIP Creation & Configuration Modal:**
  - Checkbox toggle: `[✓] Co-Funded / Joint SIP (Shared with Brother/Partner)`.
  - Conditional inputs revealed on toggle:
    - `Co-Investor Name`: (e.g. "Brother", "Rahul").
    - `Total Monthly SIP Amount`: e.g. ₹15,000.00.
    - `User Share`: e.g. ₹7,500.00 (50%).
    - `Co-Investor Share`: e.g. ₹7,500.00 (50%).
  - **Accounting Clarification Callout:**
    > *"When this ₹15,000 SIP executes from your bank, ₹7,500 will be added to your personal investment portfolio equity and ₹7,500 will be booked as an active receivable loan from Brother. Your net worth will reflect your true asset ownership without distortion."*
- **Joint SIP Card Badging:**
  - Displays dual-ownership badge: `[Joint SIP with Brother • 50/50 Split]`.
  - Visual breakdown bar: `Your Equity: ₹7,500/mo` | `Brother Share: ₹7,500/mo`.
- **SIP Bilateral Reconciliation & Settle Up Ledger:**
  - Dedicated reconciliation card rendered underneath joint SIPs:
    - **Receivable Hero Banner:** *"Brother owes you ₹15,000.00 across 2 pending monthly cycles"* (Emerald upward indicator).
    - **Monthly Cycle Audit Table:**
      - Columns: `Month/Year` | `Executed Date` | `Total Debited` | `Brother Share` | `Repaid / Settled` | `Status` | `Actions`.
      - Status Pills:
        - `Pending` (Amber outline + clock icon).
        - `Partially Settled` (Blue outline + progress meter e.g. "₹4,000 / ₹7,500").
        - `Settled` (Emerald checkmark + date).
    - **`[Record Partner Repayment]` Action Dialog:**
      - Input: Repayment Amount (defaults to total pending balance), Destination Account (e.g. Bank Account / Cash), Repayment Date, Payment Mode (UPI / GPay / Bank / Cash).
      - **"Offset Against Mutual Expense" Toggle:**
        - Allows user to offset co-investor's SIP contribution against existing personal debt (e.g. offsetting ₹2,000 grocery bill paid earlier by Brother, settling net ₹5,500 cash).
      - Automatically decrements the loan receivable asset and synchronizes real-time status.

### 4.11 Admin Command Center & ERP Console UI (`/admin`)

The Admin ERP interfaces provide operational governance, security auditing, and offline synchronization telemetry. In accordance with the **Universal Single Styling Layout Invariant**, all admin screens mount directly inside `AppLayout` (wrapped in `<RoleGuard requiredRole="Admin">`) and strictly reuse the exact same 5-tier page blueprint, color tokens, 4px spacing scale, and card containers as personal finance modules.

#### 4.11.1 Universal Single Styling Layout Compliance
- **Layout Shell:** Uses universal `AppLayout.tsx`. The desktop `Sidebar.tsx` and mobile `MobileNavDrawer.tsx` display the dedicated "Admin ERP" navigation group (Dashboard, Users, Audit Logs, Sync Monitor) only when `currentUser.role === 'Admin'`.
- **Page Container:** `w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6`.
- **Component Geometry:** Utilizes standard `PageHeader`, `MetricCard` KPI strips, 12-column responsive layout (`col-span-8` primary workspace + `col-span-4` operational sidebar), standard `Card` containers, and the high-density ERP `DataTable`.

#### 4.11.2 Admin Overview Dashboard (`/admin` or `/admin/dashboard`)
- **PageHeader:**
  - Title: `Admin Command Center`
  - Subtitle: `System health, live telemetry, and operational ERP governance`
  - Status Badge: `All Systems Operational` (Emerald pill) or `Degraded Performance` (Amber pill).
  - Action Slot: Button group: `[Trigger Sync Sweep]`, `[Export System Audit Log]`, `[System Diagnostics]`.
- **Top Metric / KPI Strip (4 Standard Cards):**
  1. **Users & Active Sessions:** Total registered users count, active JWT sessions right now, and Singleton Admin Invariant status badge (`✓ Singleton Admin Verified`).
  2. **Database Health & Latency:** Active provider (`PostgreSQL 16`), connection pool stats (`4 / 50 active`), p95 query latency (`12ms`), storage size (`42.8 MB`).
  3. **Sync Throughput & Conflict Rate:** Operations processed today (`1,420`), average batch latency (`145ms`), conflict rate (`0.04%`), pending dead-letter count (`0`).
  4. **24h Security & Audit Events:** Mutating operations logged today (`284`), failed login attempts (`0`), IP-mismatched token revocations (`0`).
- **12-Column Responsive Operational Workspace:**
  - **Col 8 (Primary Diagnostic Workspace):**
    - **Live Mutation & Sync Feed:** Real-time high-density stream of incoming sync operations across clients:
      - Columns: `Time` (`tabular-nums`), `Actor` (User Email / GUID), `Entity` (`Transaction`, `Account`, `TripMember`), `Op Type` (`INSERT`, `UPDATE`, `DELETE`), `Batch Latency` (ms), `Status` (`Synced` in Emerald, `Staged` in Amber, `Conflict` in Rose), `Client Device` (`Chrome macOS`, `PWA Android`).
    - **Subsystems Infrastructure Telemetry Panel:**
      - PostgreSQL Engine: Active pool connections, connection timeout, migration version.
      - Cloud File Storage: Active provider (`Google Drive API v3` with Service Account / `Azure Blob Storage`), quota used, last receipt upload.
      - Background Daemons: Token Cleanup Daemon (`Running`, next run in 35m), SIP Auto-Reconciliation Worker (`Idle`, scheduled for 1st of month).
  - **Col 4 (Secondary Operational Sidebar):**
    - **Singleton Admin Security Monitor Card:**
      - Confirms database-level unique index invariant: $\text{AdminCount} = 1$.
      - Displays Admin Email mask (`adm***@wealthflow.local`), last login timestamp, session IP.
      - Prominently notes: *"Elevation disabled by domain invariant"*.
    - **Quick ERP Operations Panel:**
      - `[Export Full Audit Log (JSON/CSV)]`: Downloads system-wide encrypted event log.
      - `[Re-evaluate Stale Sync Conflicts]`: Re-runs server-wins resolution logic across pending conflict batches.
      - `[Prune Revoked Refresh Tokens]`: Manually triggers garbage collection on expired session tokens.

#### 4.11.3 User & Tenant Administration (`/admin/users`)
- **Top Metric Strip:** Total Registered Users, Active JWT Sessions, Locked Accounts, Total Attachment Storage Footprint.
- **Search & Filter Toolbar:** Filter by account status (`All`, `Active`, `Locked`), search input by email or GUID, date picker for registration period.
- **High-Density ERP User Table (36px Row Height):**
  - Columns: `Avatar`, `Email`, `User GUID` (truncated with copy button), `Role` (`User` / `Admin`), `Created Date`, `Accounts Count`, `Trips Count`, `Active Devices`, `Status` (`Active` in Emerald / `Locked` in Rose), `Actions`.
  - Row Actions: `[Lock / Unlock Account]`, `[Revoke All Sessions]`, `[Inspect Audit Trail]`.
  - *Hard Security Invariant:* The UI provides **zero option to elevate any user to `Admin`**, strictly upholding the manual singleton admin constraint.
- **`UserSessionInspectorModal`:** Clicking "Active Devices" opens a side modal showing all authorized client sessions for that user with IP, device name, login timestamp, and individual `[Revoke Session]` action.

#### 4.11.4 System Audit Log Inspector (`/admin/audit-logs`)
- **Filter Toolbar:** Multi-select Entity Type (`Account`, `Transaction`, `Trip`, `Budget`, `Session`), Action Type (`CREATE`, `UPDATE`, `DELETE`, `AUTH`), Actor (Admin / User GUID), Date Range, and Full-Text JSON search.
- **High-Density Audit Event Grid:**
  - Columns: `Timestamp` (`tabular-nums`), `Actor Email`, `Action` (colored badges: Green `CREATE`, Blue `UPDATE`, Red `DELETE`, Amber `AUTH`), `Entity Name`, `Entity ID`, `Client IP`, `Changes Diff Trigger`.
- **Slide-Over `AuditDiffDrawer`:**
  - Clicking any audit log row triggers a 480px slide-over sheet.
  - Renders a colorized JSON diff comparing `OldValuesJson` against `NewValuesJson` (Emerald highlighting for added fields, Rose for deleted/modified fields, Slate for unchanged context).

#### 4.11.5 Offline Sync & Conflict Queue Monitor (`/admin/sync-monitor`)
- **Top Metric Strip:** Queue Depth, Average Processing Latency (ms), Conflict Rate %, Dead-Letter Queue Count.
- **Client Sync Telemetry Grid:** Real-time breakdown of connected PWA clients, pending mutations in flight, and SignalR connection status.
- **Conflict Resolution & Dead-Letter Table:**
  - Displays any sync conflicts where client mutation collided with concurrent server state.
  - Columns: `Client Device`, `User`, `Entity`, `Client Timestamp`, `Server Timestamp`, `Conflict Type` (`ConcurrentEdit`, `MissingParent`), `Resolution Applied` (`ServerWins`), `Actions`.
  - Actions: `[Inspect Inbound Payload]`, `[Force Client Version Override]`, `[Discard Conflict]`.

---

## 5. Offline UI & Synchronization Telemetry

- **Header Sync Pill:**
  - `Online & Synced`: Green checkmark icon with text "Synced".
  - `Syncing...`: Blue spinning icon with text "Syncing 3 items...".
  - `Offline Mode`: Grey cloud-off icon with text "Offline (Working locally)".
  - `Conflict / Error`: Red alert triangle with text "Sync Alert (1 item)".
- **Sync Drawer:** Clicking the sync pill opens a drawer detailing the local mutation queue:
  - List of pending mutations with timestamp and entity type.
  - Retry button for failed attempts.
  - Conflict resolution dialog allowing the user to choose "Keep Server Version" or "Force Local Version".

---

## 6. Accessibility & Responsive Standards

- **WCAG 2.1 AA Compliance:** Minimum color contrast ratio of 4.5:1 for normal text and 3:1 for large text and graphics.
- **Non-Color Reliance:** Statuses and financial values are **never** communicated by color alone:
  - Positive balance: Green text + upward arrow icon `↑` + explicit `+` prefix.
  - Negative balance: Rose text + downward arrow icon `↓` + explicit `-` prefix.
  - Transfers: Sky blue text + bidirectional arrow `↔`.
- **Keyboard Navigation:** Full focus trap in modals, `Escape` to dismiss dialogs, standard Tab order, and visible focus rings (`ring-2 ring-indigo-500`).
- **Touch Ergonomics:** All clickable elements on mobile adhere to a minimum hit target of $44 \times 44\text{ px}$.

---

*End of Frontend Specification Document.*

