# WEALTHFLOW — ADMIN & ERP UI DESIGN SYSTEM
**Document Version:** 1.0.0  
**Status:** Under Review  
**Target Delivery:** Design System & UI Specifications V1.0  
**Primary Currency Display:** Indian Rupee (INR - ₹) with Lakh/Crore Grouping  
**Accessibility Target:** WCAG 2.1 AA  

---

## 1. Design Philosophy & Core Principles

WealthFlow's design system bridges personal financial clarity with enterprise ERP data density. It is engineered around five foundational tenets:

1. **Absolute Financial Trust:** Financial data must be crystal-clear, unambiguously formatted, and immune to visual misinterpretation. No ambiguous abbreviations or unformatted raw numbers.
2. **Information Density with Breathing Room:** Financial users require immediate access to dense tables and metrics without feeling overwhelmed. We utilize a strict 4px grid and clean typography to maximize screen efficiency.
3. **Non-Color Reliance (Accessibility First):** Colors reinforce semantic meaning, but **never convey information alone**. Every positive, negative, warning, or pending state is accompanied by directional icons, symbols (`+`, `-`, `↔`), and explicit ARIA labels.
4. **Ergonomic Speed & Frictionless Entry:** Frequent tasks (e.g., recording a ₹40 coffee or splitting a dinner bill) must require fewer than three taps/clicks or a single keyboard shortcut (`Ctrl+K`).
5. **Deterministic Visual Hierarchy:** High-impact metrics (Net Worth, Total Liquid Cash, Budget Breaches) dominate the primary focal plane, while granular transaction metadata recedes gracefully.

---

## 2. Design Tokens

### 2.1 Color Palette & Semantic System
WealthFlow utilizes a tailored color palette built on Tailwind CSS semantics, designed for both light and dark modes with high contrast.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SEMANTIC COLOR MAPPING                          │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ Role              │ Hex Token         │ Semantic Purpose               │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Primary Brand     │ #4F46E5 (Indigo)  │ Primary CTAs, active tabs      │
│ Inflow / Positive │ #10B981 (Emerald) │ Income, Positive Net Balance   │
│ Outflow / Expense │ #F43F5E (Rose)    │ Expenses, Liabilities, Debts   │
│ Warning / Alert   │ #F59E0B (Amber)   │ Budget 80-89%, Advances, Due   │
│ Critical / Exceed │ #EF4444 (Red)     │ Budget 100%+, Overdraft        │
│ Neutral Transfer  │ #0284C7 (Sky)     │ Account Transfers, Investments │
│ Collaboration     │ #8B5CF6 (Violet)  │ Shared Trips, Guest Links      │
│ Surface (Dark)    │ #0F172A (Slate)   │ Dark mode root canvas          │
│ Surface (Light)   │ #F8FAFC (Slate)   │ Light mode root canvas         │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

### 2.2 Typography
- **Primary Interface Font:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`. Used for labels, headings, buttons, and navigation.
- **Monospaced / Financial Numbers Font:** `JetBrains Mono`, `Fira Code`, `ui-monospace`, `monospace`.
- **Tabular Figures Rule:** All monetary amounts, balances, and dates **must** render with `font-mono font-variant-numeric: tabular-nums;` to guarantee vertical alignment in tables and cards.

| Token | Size | Line Height | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `text-display` | 32px (2.0rem) | 38px | Bold (700) | Net Worth Hero Metric |
| `text-h1` | 24px (1.5rem) | 32px | Bold (700) | Page Titles, Account Totals |
| `text-h2` | 20px (1.25rem)| 28px | SemiBold (600) | Card Headers, Section Titles |
| `text-h3` | 16px (1.0rem) | 24px | SemiBold (600) | Table Column Headers, Modal Titles |
| `text-body` | 14px (0.875rem)| 20px| Regular (400) | Table Cells, Descriptions, Inputs |
| `text-caption` | 12px (0.75rem)| 16px | Medium (500) | Timestamps, Badges, Micro-labels |

### 2.3 Spacing Scale (Strict 4px Grid)
All layout padding, margins, gaps, and heights strictly adhere to the 4px baseline scale:
- `space-1`: 4px
- `space-2`: 8px
- `space-3`: 12px
- `space-4`: 16px
- `space-5`: 20px
- `space-6`: 24px
- `space-8`: 32px
- `space-10`: 40px
- `space-12`: 48px

### 2.4 Border Radii & Elevation (Shadows)
- **Radii:** `rounded-sm` (4px), `rounded-md` (6px), `rounded-lg` (8px), `rounded-xl` (12px), `rounded-full` (9999px for pills/avatars).
- **Elevation Tokens:**
  - `shadow-sm`: Subtle border elevation for interactive table rows and inputs.
  - `shadow-md`: Standard elevation for dashboard cards and widget containers.
  - `shadow-xl`: Deep elevation with backdrop blur for modals, drawers, and Quick Add dialogs.

---

## 3. Financial Formatting & Display Rules

### 3.1 The Indian Numbering System (Lakhs & Crores)
WealthFlow enforces the standard Indian numbering format where commas group the initial three digits and every two digits thereafter:

```text
₹100.00         (Hundred)
₹1,000.00       (Thousand)
₹10,000.00      (Ten Thousand)
₹1,00,000.00    (One Lakh)
₹10,00,000.00   (Ten Lakhs)
₹1,00,00,000.00 (One Crore)
```

- **Implementation Standard:** Uses `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- **Negative Financial Display:** Displayed with an explicit minus sign before the currency symbol or enclosed in parentheses: `-₹2,500.00` or `(₹2,500.00)`.

### 3.2 Directional & Semantic Signage

```text
Income / Inflow:      [ + ₹15,000.00 ↑ ]  (Emerald text + Plus + Up Arrow)
Expense / Outflow:     [ - ₹2,400.00  ↓ ]  (Rose text + Minus + Down Arrow)
Account Transfer:      [   ₹10,000.00 ↔ ]  (Sky text + Bidirectional Arrow)
Credit Card Debt:      [ - ₹18,250.00 💳 ] (Rose text + Card Icon)
Settlement (Owed To):  [ + ₹3,000.00  ✓ ]  (Green text + Check Icon)
Settlement (Owes):     [ - ₹2,000.00  ⚠ ]  (Amber text + Warning Icon)
```

---

## 4. Core Reusable Component Library

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WEALTHFLOW CORE COMPONENT SUITE                      │
├───────────────────┬───────────────────┬─────────────────────────────────┤
│ Input & Capture   │ Display & Cards   │ Collaborative & Split           │
├───────────────────┼───────────────────┼─────────────────────────────────┤
│ - MoneyInput      │ - MoneyDisplay    │ - SplitEditor                   │
│ - DatePicker      │ - BalanceCard     │ - SettlementRow                 │
│ - CategorySelect  │ - TransactionRow  │ - TripMemberBadge               │
│ - QuickAddModal   │ - BudgetProgress  │ - SyncStatusPill                │
│ - ConfirmDialog   │ - CreditCardCard  │ - DataTable (ERP High-Density)  │
└───────────────────┴───────────────────┴─────────────────────────────────┘
```

### 4.1 `MoneyInput` (Currency Input Component)
- **Behavior:**
  - Prefix fixed to `₹`.
  - Automatically formats with Indian comma groupings as user types or on blur.
  - Restricts input strictly to numbers and a single decimal point (max 2 decimal places).
  - Rejects negative values by default (unless explicitly configured for adjustments).
  - Prominent font size (`text-xl` or `text-2xl` inside quick-entry modals).

### 4.2 `MoneyDisplay` (Semantic Text Component)
- **Variants:** `display` (32px), `headline` (20px), `body` (14px), `caption` (12px).
- **Properties:**
  - `amount`: `number` or `string` (`decimal(18,2)`).
  - `type`: `income` | `expense` | `transfer` | `neutral` | `auto`.
  - `showSign`: `boolean` (renders `+` or `-`).
  - `showIcon`: `boolean` (renders `↑`, `↓`, `↔`).

### 4.3 `BudgetProgress` (Multi-Threshold Visual Meter)
- Visual bar with animated progress filling from 0% to 100%+.
- **Dynamic Threshold Color Shifts:**
  - `0% - 79.9%`: Green (`bg-emerald-500`).
  - `80% - 89.9%`: Amber warning (`bg-amber-500`).
  - `90% - 99.9%`: Orange critical (`bg-orange-500`).
  - `>= 100%`: Red exceeded (`bg-rose-500`) with blinking pulse and text indicator: `₹1,200 Over Budget`.

### 4.4 `CreditCardCard` (Liability Visualizer)
- Renders a stylized card with physical aspect ratio ($1.586 : 1$).
- Shows Bank Name, Card Name, Masked Number (`•••• 4821`), Chip graphic, and Available Credit.
- Progress bar at the bottom displaying credit utilization percentage.
- Due date pill badge highlighting days remaining until due date.

### 4.5 `SplitEditor` (Dynamic Split Allocation Table)
- Embedded inside Trip Expense dialogs.
- Supports four mode tabs: `[Equal]`, `[Unequal]`, `[Percentage]`, `[Shares]`.
- Displays real-time allocation status banner:
  - *Balanced:* Green badge `✓ Total matches expense: ₹4,000.00`.
  - *Unbalanced:* Red warning `⚠ Remaining to allocate: ₹500.00`. Form submit is strictly disabled.

### 4.6 `DeviceSessionCard` (Session Management Component)
- Renders an individual authorized device card inside `/settings/sessions`:
  - Device Icon: Desktop/Laptop, Mobile, or Tablet icon based on `DeviceType`.
  - Header: Device Name & Browser (e.g., *"MacBook Pro — Chrome"*).
  - Status Indicators:
    - Current Device: `[This Device]` green badge.
    - Activity: Green dot with *"Active Now"* or *"Last active: 2 hours ago"*.
  - Metadata row: IP Address (e.g., `103.21.201.x`), City/Region, Login Date.
  - Action Button:
    - If current device: disabled or opens standard "Log Out" flow.
    - If other device: `[Revoke Session]` button with red outline and confirmation prompt.

---

## 5. Admin & ERP Screen Specifications

WealthFlow includes dedicated administrative and operational interfaces for deep data inspection and system health monitoring.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ADMIN ERP CONSOLE LAYOUT                           │
├──────────────┬──────────────────────────────────────────────────────────┤
│ ADMIN NAV    │ TOP BAR: System Status | DB Provider: PostgreSQL | User  │
│ - Telemetry  ├──────────────────────────────────────────────────────────┤
│ - Audit Logs │ HIGH-DENSITY AUDIT DATA GRID                             │
│ - Sync Queue │ [Filters: User | Action | Date Range | Search JSON]      │
│ - Migration  │ ┌──────┬────────┬────────┬──────────────┬──────────────┐ │
│ - Settings   │ │ Time │ Actor  │ Action │ Entity (ID)  │ Changes Diff │ │
│              │ ├──────┼────────┼────────┼──────────────┼──────────────┤ │
│              │ │11:20 │ rahul  │ UPDATE │ Account (01) │ +₹2,000 diff │ │
│              │ └──────┴────────┴────────┴──────────────┴──────────────┘ │
└──────────────┴──────────────────────────────────────────────────────────┘
```

### 5.1 ERP Data Table Requirements
- **Row Height:** Compact 36px height to display up to 25 rows per screen without scrolling.
- **Features:** Sticky column headers, sorting, multi-column search, column visibility toggle, and CSV export.
- **Audit Diff Inspector:** Clicking an audit log row opens a side drawer rendering a colorized JSON diff comparing `OldValuesJson` against `NewValuesJson`.

### 5.2 Synchronization Queue Monitor
- Visualizes real-time offline sync operations across active clients:
  - Metrics: Total Operations Synced Today, Average Processing Latency, Conflict Rate %, Failed Queue Count.
  - Manual action to trigger server-side re-evaluation or discard stale conflict records.

---

## 6. Accessibility & Responsive Touch Standards

- **Target Standard:** WCAG 2.1 Level AA.
- **Contrast Ratios:** Text against background exceeds $4.5 : 1$; large headers and UI controls exceed $3 : 1$.
- **Keyboard Navigation & Focus:**
  - Visible focus ring: `ring-2 ring-indigo-500 ring-offset-2`.
  - Tab order strictly follows DOM sequence.
  - Modals trap keyboard focus and release focus back to trigger element upon closing.
  - `Escape` key dismisses any open modal or drawer.
- **Mobile Touch Targets:** All interactive buttons, chips, and table row tap targets maintain a minimum dimension of $44 \times 44\text{ px}$.

---

*End of Admin & ERP UI Design System.*

