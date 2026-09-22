import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AccountsPage } from './pages/AccountsPage'
import { accountsApi } from './api/accountsApi'
import type { Account, AccountSummary } from './types'

// Mock accountsApi
vi.mock('./api/accountsApi', () => ({
  accountsApi: {
    getAccounts: vi.fn(),
    getAccountSummary: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    archiveAccount: vi.fn(),
    activateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    reconcileAccount: vi.fn(),
  },
}))

const mockAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'HDFC Salary Account',
    accountType: 'Bank',
    openingBalance: 25000,
    currentBalance: 85400,
    currency: 'INR',
    accountNumberMask: '•••• 4821',
    colorTag: '#3B82F6',
    isActive: true,
    sortOrder: 1,
    createdAtUtc: new Date().toISOString(),
  },
  {
    id: 'acc-2',
    name: 'Cash Vault Reserve',
    accountType: 'Cash',
    openingBalance: 5000,
    currentBalance: 12500,
    currency: 'INR',
    accountNumberMask: null,
    colorTag: '#10B981',
    isActive: true,
    sortOrder: 2,
    createdAtUtc: new Date().toISOString(),
  },
]

const mockSummary: AccountSummary = {
  totalLiquidBalance: 97900,
  totalBankBalance: 85400,
  totalCashBalance: 12500,
  totalWalletBalance: 0,
  totalSavingsBalance: 0,
  activeAccountCount: 2,
}

describe('AccountsPage and Accounts UI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(accountsApi.getAccounts).mockResolvedValue(mockAccounts)
    vi.mocked(accountsApi.getAccountSummary).mockResolvedValue(mockSummary)
  })

  it('renders 5-Tier layout with PageHeader, Metric cards, and accounts list', async () => {
    render(<AccountsPage />)

    // Header
    expect(screen.getByText('Financial Accounts')).toBeInTheDocument()

    // Loading transition to content
    await waitFor(() => {
      expect(screen.getByText('HDFC Salary Account')).toBeInTheDocument()
    })

    // Metric strip
    expect(screen.getByText('Total Liquid Balance')).toBeInTheDocument()
    expect(screen.getByText('Bank Deposits')).toBeInTheDocument()
    expect(screen.getByText('Cash & Wallets')).toBeInTheDocument()
    expect(screen.getByText('Active Accounts')).toBeInTheDocument()

    // Accounts display
    expect(screen.getByText('•••• 4821')).toBeInTheDocument()
    expect(screen.getByText('Cash Vault Reserve')).toBeInTheDocument()
  })

  it('filters accounts by search query', async () => {
    render(<AccountsPage />)

    await waitFor(() => {
      expect(screen.getByText('HDFC Salary Account')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search accounts\.\.\./i)
    fireEvent.change(searchInput, { target: { value: 'Cash' } })

    expect(screen.queryByText('HDFC Salary Account')).not.toBeInTheDocument()
    expect(screen.getByText('Cash Vault Reserve')).toBeInTheDocument()
  })

  it('triggers reconciliation when clicking Reconcile button', async () => {
    vi.mocked(accountsApi.reconcileAccount).mockResolvedValue({
      accountId: 'acc-1',
      accountName: 'HDFC Salary Account',
      openingBalance: 25000,
      previousBalance: 85400,
      reconciledBalance: 85400,
      discrepancy: 0,
      hasDiscrepancy: false,
      transactionCount: 14,
      reconciledAtUtc: new Date().toISOString(),
    })

    render(<AccountsPage />)

    await waitFor(() => {
      expect(screen.getByText('HDFC Salary Account')).toBeInTheDocument()
    })

    const reconcileButtons = screen.getAllByRole('button', { name: /reconcile/i })
    fireEvent.click(reconcileButtons[0])

    await waitFor(() => {
      expect(accountsApi.reconcileAccount).toHaveBeenCalledWith('acc-1')
      expect(screen.getByText(/is 100% reconciled across 14 transactions/i)).toBeInTheDocument()
    })
  })

  it('opens Add Account modal with Zero-Trust Banking boundary notice', async () => {
    render(<AccountsPage />)

    await waitFor(() => {
      expect(screen.getByText('Financial Accounts')).toBeInTheDocument()
    })

    const addAccountButton = screen.getByRole('button', { name: /add account/i })
    fireEvent.click(addAccountButton)

    expect(screen.getByText('Add Financial Account')).toBeInTheDocument()
    expect(screen.getByText(/zero-trust banking boundary/i)).toBeInTheDocument()
    expect(screen.getByText(/never enter banking passwords, otps, cvvs/i)).toBeInTheDocument()

    // Mask input enforces max 4 chars
    const maskInput = screen.getByPlaceholderText(/e\.g\. 4821/i) as HTMLInputElement
    fireEvent.change(maskInput, { target: { value: '12345678' } })
    expect(maskInput.value).toBe('1234')
  })
})
