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

## 2. Directory & Feature-Based Architecture

The source tree follows a strictly modular **feature-based structure** where each functional domain encapsulates its own components, hooks, api queries, and types:

```
frontend/src/
├── app/                        # Application Shell, Providers, Router Configuration
│   ├── App.tsx
│   ├── routes.tsx
│   └── rootReducer.ts
├── components/                 # Shared Generic UI Library (Pure, Feature-Agnostic)
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── MoneyInput.tsx      # INR auto-formatting input
│   │   ├── MoneyDisplay.tsx    # Semantic color & icon financial text
│   │   ├── DataTable.tsx       # Virtualized, sortable, filterable table
│   │   ├── Modal.tsx
│   │   ├── Drawer.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Badge.tsx
│   │   └── Toast.tsx
│   └── layout/
│       ├── AppLayout.tsx       # Desktop & Mobile shell switcher
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       ├── BottomNav.tsx       # Mobile bottom navigation
│       └── QuickAddFAB.tsx     # Floating Action Button
├── features/                   # Domain-Specific Feature Modules
│   ├── auth/                   # Login, Register, Password Reset
│   ├── dashboard/              # Net worth card, cash flow overview, widget grid
│   ├── transactions/           # Transaction ledger, filters, quick-entry modals
│   ├── accounts/               # Bank, cash, wallet management, transfer modal
│   ├── budgets/                # Budget progress bars, food/protein sub-trackers
│   ├── creditCards/            # Card visualizer, billing cycle meter, pay bill modal
│   ├── investments/            # Portfolio tracker, P&L badge, SIP scheduler
│   ├── loans/                  # Given/Received debt tracker, repayment recorder
│   ├── trips/                  # Trip dashboard, members, split editor, settlement
│   ├── analytics/              # Recharts trends, category donut, cash flow waterfall
│   └── sync/                   # Offline queue drawer, sync status pill, conflict modal
├── hooks/                      # Shared utility hooks (useOffline, useMedia, useKeybind)
├── lib/                        # Third-party wrappers (axios/fetch client, Dexie db schema)
├── services/                   # SignalR connection manager, IndexedDB sync agent
└── types/                      # Global TypeScript interfaces, Enums, DTO contracts
```

---

## 3. Application Layout & Navigation Flow

WealthFlow delivers tailored layouts for desktop and mobile form factors while sharing the underlying logic:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DESKTOP LAYOUT (>= 1024px)                         │
├──────────────┬──────────────────────────────────────────────────────────┤
│ SIDEBAR      │ HEADER: Search Bar | Sync Status | Quick Add | Profile   │
│ - Dashboard  ├──────────────────────────────────────────────────────────┤
│ - Ledger     │ MAIN VIEWPORT (Scrollable)                               │
│ - Accounts   │                                                          │
│ - Budgets    │                                                          │
│ - Cards      │                                                          │
│ - Invest/SIP │                                                          │
│ - Loans/Gift │                                                          │
│ - Trips      │                                                          │
│ - Analytics  │                                                          │
│ - Settings   │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                       MOBILE LAYOUT (< 1024px)                          │
├─────────────────────────────────────────────────────────────────────────┤
│ TOP HEADER: App Logo | Offline/Sync Pill | Search | Profile             │
├─────────────────────────────────────────────────────────────────────────┤
│ MAIN VIEWPORT (Touch-optimized scrollable content)                      │
│                                                                         │
│                                           ┌───────────┐                 │
│                                           │  (+) FAB  │                 │
│                                           └───────────┘                 │
├─────────────────────────────────────────────────────────────────────────┤
│ BOTTOM NAV: [Home]  [Ledger]  [(+) Quick Add]  [Trips]  [More...]       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Route Hierarchy
- **Public Routes:**
  - `/login`: Email and password authentication with lockout notification.
  - `/register`: User onboarding and default currency selection (INR).
  - `/forgot-password`: Password reset request flow.
  - `/trip/:tripId/guest/:token`: Standalone secure guest portal for collaborative trips.
- **Protected App Routes (Requires JWT):**
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
  - `/settings/sessions`: Multi-device active session manager, device revocation, and expiration settings.
- **Admin ERP Routes (Requires Admin Role):**
  - `/admin/users`: User management and tenant status.
  - `/admin/audit-logs`: System-wide audit log inspector with filter by IP/user.
  - `/admin/sync-monitor`: Real-time telemetry on sync queue latency and errors.

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

### 4.6 Collaborative Trips Workspace
A premier feature containing five dedicated tabs:
```
┌────────────────────────────────────────────────────────────────────────┐
│  TRIP: GOA VACATION 2026                 [Planning | Active | Settled] │
│  Dates: Oct 12 - Oct 18, 2026 | Budget: ₹50,000 | Spent: ₹38,400        │
├───────────────┬───────────────┬───────────────┬───────────────┬────────┤
│ 1. Overview   │ 2. Expenses   │ 3. Advances   │ 4. Members    │ 5. Settle│
└───────────────┴───────────────┴───────────────┴───────────────┴────────┘
```

1. **Tab 1: Overview:** Budget burn rate, per-member spending contribution bars, recent activity.
2. **Tab 2: Expenses:** Filterable list of trip expenses displaying Payer, Amount, Date, Category, and Split breakdown badge.
3. **Tab 3: Advances (CRITICAL UI):**
   - **Informational Callout:** *"Advances are informal prepayments or loans between trip members. They do NOT increase the total trip expenses and are factored directly into final settlement calculations."*
   - Add Advance Modal: Giver -> Receiver -> Amount -> Date -> Notes.
   - Advances List: Shows who transferred funds to whom with date and status.
4. **Tab 4: Members & Guest Links:**
   - Member roster with avatar, name, registered/guest status.
   - **"Create Guest Link" Action:** Generates `/trip/{tripId}/guest/{secureToken}`.
   - Host can toggle `Can Add Expenses` permission or click `Revoke Link`.
5. **Tab 5: Settlement & Debt Minimization:**
   - **Net Balance Breakdown:** Visual bar chart showing each participant's position (Creditor in green, Debtor in red, Settled in grey).
   - **Optimized Settlement Cards:** Step-by-step minimal repayment instructions computed by the greedy algorithm:
     - Card: **Amit** owes **Rahul** `₹2,000.00`.
     - Action: `[Mark as Settled]` button (prompts for settlement payment date and payment method).

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

