import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LedgerPage } from './pages/LedgerPage'
import { transactionsApi } from './api/transactionsApi'
import { budgetsApi } from '@/features/budgets/api/budgetsApi'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import type { Transaction, TransactionSummary, PagedResult } from './types'
import type { BudgetSummary } from '@/features/budgets/types'
import type { Account } from '@/features/accounts/types'

// Mock APIs
vi.mock('./api/transactionsApi', () => ({
  transactionsApi: {
    getTransactions: vi.fn(),
    getSummary: vi.fn(),
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
  },
}))

vi.mock('@/features/budgets/api/budgetsApi', () => ({
  budgetsApi: {
    getBudgetSummary: vi.fn(),
    getBudgets: vi.fn(),
    createBudget: vi.fn(),
    updateBudget: vi.fn(),
  },
}))

vi.mock('@/features/accounts/api/accountsApi', () => ({
  accountsApi: {
    getAccounts: vi.fn(),
  },
}))

vi.mock('@/features/categories/api/categoriesApi', () => ({
  categoriesApi: {
    getCategories: vi.fn().mockResolvedValue([]),
  },
}))

const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    accountId: 'acc-1',
    accountName: 'HDFC Bank',
    categoryId: 'cat-1',
    categoryName: 'Groceries',
    amount: 1450.5,
    eventType: 'Expense',
    transactionDate: new Date('2026-09-15T10:00:00Z').toISOString(),
    description: 'Blinkit Instant Delivery',
    merchant: 'Blinkit',
    targetAccountId: null,
    targetAccountName: null,
    isReconciled: false,
    notes: 'Order #98124',
    createdAtUtc: new Date().toISOString(),
  },
  {
    id: 'tx-2',
    accountId: 'acc-1',
    accountName: 'HDFC Bank',
    categoryId: 'cat-2',
    categoryName: 'Salary',
    amount: 125000,
    eventType: 'Income',
    transactionDate: new Date('2026-09-01T09:00:00Z').toISOString(),
    description: 'Monthly Engineering Salary',
    merchant: 'Employer Corp',
    targetAccountId: null,
    targetAccountName: null,
    isReconciled: true,
    notes: null,
    createdAtUtc: new Date().toISOString(),
  },
  {
    id: 'tx-3',
    accountId: 'acc-1',
    accountName: 'HDFC Bank',
    categoryId: null,
    categoryName: null,
    amount: 5000,
    eventType: 'Transfer',
    transactionDate: new Date('2026-09-10T14:30:00Z').toISOString(),
    description: 'ATM Cash Withdrawal',
    merchant: null,
    targetAccountId: 'acc-2',
    targetAccountName: 'Cash Wallet',
    isReconciled: false,
    notes: 'Wallet refuel',
    createdAtUtc: new Date().toISOString(),
  },
]

const mockPagedTransactions: PagedResult<Transaction> = {
  items: mockTransactions,
  totalCount: 3,
  page: 1,
  pageSize: 15,
  totalPages: 1,
}

const mockSummary: TransactionSummary = {
  totalInflows: 125000,
  totalOutflows: 1450.5,
  netCashFlow: 123549.5,
  totalCount: 3,
}

const mockBudgetSummary: BudgetSummary = {
  month: 9,
  year: 2026,
  totalBudgeted: 25000,
  totalSpent: 1450.5,
  overallUtilizationPercentage: 5.8,
  categories: [
    {
      budgetId: 'b-1',
      categoryId: 'cat-1',
      categoryName: 'Groceries',
      categoryColor: '#10B981',
      monthlyLimit: 15000,
      spentAmount: 1450.5,
      utilizationPercentage: 9.67,
      status: 'Normal',
      overageAmount: 0,
    },
    {
      budgetId: 'b-2',
      categoryId: 'cat-3',
      categoryName: 'Dining & Cafes',
      categoryColor: '#F59E0B',
      monthlyLimit: 5000,
      spentAmount: 4300,
      utilizationPercentage: 86.0,
      status: 'Warning',
      overageAmount: 0,
    },
    {
      budgetId: 'b-3',
      categoryId: 'cat-4',
      categoryName: 'Electronics & Gadgets',
      categoryColor: '#EF4444',
      monthlyLimit: 10000,
      spentAmount: 12500,
      utilizationPercentage: 125.0,
      status: 'Exceeded',
      overageAmount: 2500,
    },
  ],
}

const mockAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'HDFC Bank',
    accountType: 'Bank',
    openingBalance: 50000,
    currentBalance: 168549.5,
    currency: 'INR',
    accountNumberMask: '•••• 4821',
    colorTag: '#3B82F6',
    isActive: true,
    sortOrder: 1,
    createdAtUtc: new Date().toISOString(),
  },
  {
    id: 'acc-2',
    name: 'Cash Wallet',
    accountType: 'Cash',
    openingBalance: 1000,
    currentBalance: 6000,
    currency: 'INR',
    accountNumberMask: null,
    colorTag: '#10B981',
    isActive: true,
    sortOrder: 2,
    createdAtUtc: new Date().toISOString(),
  },
]

describe('LedgerPage and Transactions UI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(transactionsApi.getTransactions).mockResolvedValue(mockPagedTransactions)
    vi.mocked(transactionsApi.getSummary).mockResolvedValue(mockSummary)
    vi.mocked(budgetsApi.getBudgetSummary).mockResolvedValue(mockBudgetSummary)
    vi.mocked(accountsApi.getAccounts).mockResolvedValue(mockAccounts)
  })

  it('renders 5-Tier layout with metric strip, ledger entries, and budget health widget', async () => {
    render(<LedgerPage />)

    // Header
    expect(screen.getByText('Transaction Ledger')).toBeInTheDocument()

    // Metric strip
    expect(screen.getByText('Total Monthly Inflows')).toBeInTheDocument()
    expect(screen.getByText('Total Monthly Outflows')).toBeInTheDocument()
    expect(screen.getByText('Net Cash Flow')).toBeInTheDocument()

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Blinkit Instant Delivery')).toBeInTheDocument()
    })

    // Ledger Rows
    expect(screen.getByText('Monthly Engineering Salary')).toBeInTheDocument()
    expect(screen.getByText('ATM Cash Withdrawal')).toBeInTheDocument()

    // Category Badges & Transfers display
    expect(screen.getAllByText('Groceries').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Salary')).toBeInTheDocument()
    expect(screen.getAllByText('Cash Wallet').length).toBeGreaterThanOrEqual(1)

    // Budget Health Widget categories & thresholds
    expect(screen.getByText('Budget Health')).toBeInTheDocument()
    expect(screen.getByText(/Normal \(9\.67%\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Warning \(86%\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Exceeded \(\+₹2,500\.00\)/i)).toBeInTheDocument()
  })

  it('filters transactions when switching type tabs', async () => {
    render(<LedgerPage />)

    await waitFor(() => {
      expect(screen.getByText('Blinkit Instant Delivery')).toBeInTheDocument()
    })

    const expenseTab = screen.getByRole('button', { name: /^expense$/i })
    fireEvent.click(expenseTab)

    await waitFor(() => {
      expect(transactionsApi.getTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'Expense',
        })
      )
    })
  })

  it('triggers Quick Add modal when clicking Quick Add button and supports Ctrl+K keydown', async () => {
    render(<LedgerPage />)

    await waitFor(() => {
      expect(screen.getByText('Transaction Ledger')).toBeInTheDocument()
    })

    // Click button
    const quickAddBtn = screen.getByRole('button', { name: /quick add/i })
    fireEvent.click(quickAddBtn)

    await waitFor(() => {
      expect(screen.getByText('Quick Record')).toBeInTheDocument()
      expect(screen.getByText('Atomic Ledger Commit')).toBeInTheDocument()
    })

    // Close modal
    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtn)

    await waitFor(() => {
      expect(screen.queryByText('Quick Record')).not.toBeInTheDocument()
    })

    // Press Ctrl+K
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })

    await waitFor(() => {
      expect(screen.getByText('Quick Record')).toBeInTheDocument()
    })
  })

  it('deletes transaction and reloads data upon user confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(transactionsApi.deleteTransaction).mockResolvedValue()

    render(<LedgerPage />)

    await waitFor(() => {
      expect(screen.getByText('Blinkit Instant Delivery')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByTitle(/delete transaction/i)
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(transactionsApi.deleteTransaction).toHaveBeenCalledWith('tx-1')
    })
  })
})
