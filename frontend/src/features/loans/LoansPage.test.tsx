import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoansPage } from './pages/LoansPage'
import { loansApi } from './api/loansApi'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import type { Loan, LoanSummary, Gift, GiftSummary } from './types'
import type { Account } from '@/features/accounts/types'

vi.mock('./api/loansApi', () => ({
  loansApi: {
    getLoanSummary: vi.fn(),
    getLoan: vi.fn(),
    createLoan: vi.fn(),
    recordRepayment: vi.fn(),
    deleteLoan: vi.fn(),
    getGiftSummary: vi.fn(),
    createGift: vi.fn(),
    deleteGift: vi.fn(),
  },
}))

vi.mock('@/features/accounts/api/accountsApi', () => ({
  accountsApi: {
    getAccounts: vi.fn(),
  },
}))

const mockLoans: Loan[] = [
  {
    id: 'loan-1',
    direction: 'Given',
    counterpartyName: 'Rahul Sharma',
    counterpartyContact: '+91 98765 43210',
    principalAmount: 50000,
    outstandingBalance: 20000,
    totalRepaidAmount: 30000,
    repaymentPercentage: 60.0,
    dueDate: '2026-10-15T00:00:00Z',
    disbursementAccountId: 'acc-1',
    disbursementAccountName: 'Salary Checking Account',
    notes: 'Emergency medical loan',
    status: 'PartiallyRepaid',
    isSettled: false,
    createdAtUtc: new Date().toISOString(),
    repayments: [
      {
        id: 'rep-1',
        loanId: 'loan-1',
        accountId: 'acc-1',
        accountName: 'Salary Checking Account',
        amount: 30000,
        repaymentDate: '2026-09-20T00:00:00Z',
        notes: 'First installment via NEFT',
        createdAtUtc: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'loan-2',
    direction: 'Received',
    counterpartyName: 'Uncle Suresh',
    counterpartyContact: 'suresh@family.net',
    principalAmount: 100000,
    outstandingBalance: 100000,
    totalRepaidAmount: 0,
    repaymentPercentage: 0,
    dueDate: undefined,
    disbursementAccountId: 'acc-1',
    disbursementAccountName: 'Salary Checking Account',
    notes: 'House advance loan',
    status: 'Open',
    isSettled: false,
    createdAtUtc: new Date().toISOString(),
    repayments: [],
  },
]

const mockLoanSummary: LoanSummary = {
  totalReceivable: 20000,
  totalPayable: 100000,
  netBilateralPosition: -80000,
  activeLentCount: 1,
  activeBorrowedCount: 1,
  loans: mockLoans,
}

const mockGifts: Gift[] = [
  {
    id: 'gift-1',
    direction: 'Given',
    recipientOrGiver: 'Ananya',
    occasion: 'Birthday',
    amount: 5000,
    accountId: 'acc-1',
    accountName: 'Salary Checking Account',
    date: '2026-09-18T00:00:00Z',
    notes: 'Birthday gift cash',
    transactionId: 'tx-gift-1',
    createdAtUtc: new Date().toISOString(),
  },
  {
    id: 'gift-2',
    direction: 'Received',
    recipientOrGiver: 'Grandmother',
    occasion: 'Diwali Shagun',
    amount: 11000,
    accountId: 'acc-1',
    accountName: 'Salary Checking Account',
    date: '2026-09-10T00:00:00Z',
    notes: 'Blessing envelope',
    transactionId: 'tx-gift-2',
    createdAtUtc: new Date().toISOString(),
  },
]

const mockGiftSummary: GiftSummary = {
  totalGiftsGiven: 5000,
  totalGiftsReceived: 11000,
  netGiftFlow: 6000,
  totalGiftsCount: 2,
  gifts: mockGifts,
}

const mockAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'Salary Checking Account',
    accountType: 'Bank',
    openingBalance: 100000,
    currentBalance: 250000,
    currency: 'INR',
    accountNumberMask: '•••• 4821',
    colorTag: '#3B82F6',
    isActive: true,
    sortOrder: 1,
    createdAtUtc: new Date().toISOString(),
  },
]

describe('LoansPage and Bilateral Obligations UI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loansApi.getLoanSummary).mockResolvedValue(mockLoanSummary)
    vi.mocked(loansApi.getGiftSummary).mockResolvedValue(mockGiftSummary)
    vi.mocked(accountsApi.getAccounts).mockResolvedValue(mockAccounts)
  })

  it('renders 5-Tier layout with metric strip, loan cards, and progress bar', async () => {
    render(<LoansPage />)

    // Header
    expect(screen.getByText('Loans & Bilateral Obligations')).toBeInTheDocument()

    // 4-Card Metric Strip
    expect(screen.getByText('Total Lent (Receivables)')).toBeInTheDocument()
    expect(screen.getByText('Total Borrowed (Payables)')).toBeInTheDocument()
    expect(screen.getByText('Net Bilateral Position')).toBeInTheDocument()
    expect(screen.getByText('Gift Flow Balance')).toBeInTheDocument()

    // Wait for loan data
    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument()
    })

    // Loan details & status
    expect(screen.getByText(/Partially Repaid \(60%\)/i)).toBeInTheDocument()
    expect(screen.getByText('Emergency medical loan')).toBeInTheDocument()
    expect(screen.getByText(/60% repaid/i)).toBeInTheDocument()
    expect(screen.getByText('Repayment History (1)')).toBeInTheDocument()
  })

  it('expands repayment history accordion on click', async () => {
    render(<LoansPage />)

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument()
    })

    const historyBtn = screen.getByText('Repayment History (1)')
    fireEvent.click(historyBtn)

    await waitFor(() => {
      expect(screen.getByText('First installment via NEFT')).toBeInTheDocument()
      expect(screen.getByText(/via Salary Checking Account/i)).toBeInTheDocument()
    })
  })

  it('opens RecordRepaymentModal and records a repayment', async () => {
    vi.mocked(loansApi.recordRepayment).mockResolvedValue({
      repaymentId: 'rep-2',
      loanId: 'loan-1',
      repaidAmount: 20000,
      remainingBalance: 0,
      status: 'FullySettled',
      isSettled: true,
      updatedAccountBalance: 270000,
    })

    render(<LoansPage />)

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument()
    })

    const recordRepaymentBtn = screen.getByRole('button', { name: /record repayment/i })
    fireEvent.click(recordRepaymentBtn)

    await waitFor(() => {
      expect(screen.getByText('Receive Repayment')).toBeInTheDocument()
      expect(screen.getByText(/Asset Settlement:/i)).toBeInTheDocument()
    })

    const submitBtn = screen.getByRole('button', { name: /confirm repayment/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(loansApi.recordRepayment).toHaveBeenCalledWith(
        'loan-1',
        expect.objectContaining({
          accountId: 'acc-1',
          amount: 20000,
        })
      )
    })
  })

  it('switches to Money Borrowed tab and displays payable loans', async () => {
    render(<LoansPage />)

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument()
    })

    const borrowedTab = screen.getByRole('button', { name: /money borrowed/i })
    fireEvent.click(borrowedTab)

    await waitFor(() => {
      expect(screen.getByText('Uncle Suresh')).toBeInTheDocument()
      expect(screen.getByText('House advance loan')).toBeInTheDocument()
      expect(screen.getByText('Open')).toBeInTheDocument()
    })
  })

  it('switches to Gifts Log tab and displays gifts table and metrics', async () => {
    render(<LoansPage />)

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument()
    })

    const giftsTab = screen.getByRole('button', { name: /gifts log/i })
    fireEvent.click(giftsTab)

    await waitFor(() => {
      expect(screen.getByText('Ananya')).toBeInTheDocument()
      expect(screen.getByText('Grandmother')).toBeInTheDocument()
      expect(screen.getByText('Diwali Shagun')).toBeInTheDocument()
      expect(screen.getByText('Total Gifts Given')).toBeInTheDocument()
      expect(screen.getByText('Total Gifts Received')).toBeInTheDocument()
    })
  })

  it('opens RecordGiftModal and submits a new gift', async () => {
    vi.mocked(loansApi.createGift).mockResolvedValue({
      id: 'gift-3',
      direction: 'Given',
      recipientOrGiver: 'Rohan',
      occasion: 'Wedding Blessing',
      amount: 2100,
      accountId: 'acc-1',
      date: new Date().toISOString(),
      createdAtUtc: new Date().toISOString(),
    })

    render(<LoansPage />)

    const recordGiftBtn = screen.getByRole('button', { name: /record gift/i })
    fireEvent.click(recordGiftBtn)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Record Gift' })).toBeInTheDocument()
      expect(screen.getByText(/Pure one-way gifts/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Sister, Best Friend Rohan/i), {
      target: { value: 'Rohan' },
    })
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '2100' },
    })

    const submitBtn = screen.getByRole('button', { name: /save gift record/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(loansApi.createGift).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'Given',
          recipientOrGiver: 'Rohan',
          amount: 2100,
        })
      )
    })
  })

  it('opens AddLoanModal and submits a new loan', async () => {
    vi.mocked(loansApi.createLoan).mockResolvedValue({
      ...mockLoans[0],
      id: 'loan-3',
      counterpartyName: 'Pooja',
    })

    render(<LoansPage />)

    const recordLoanBtn = screen.getByRole('button', { name: /record loan/i })
    fireEvent.click(recordLoanBtn)

    await waitFor(() => {
      expect(screen.getByText('Record Loan Obligation')).toBeInTheDocument()
      expect(screen.getByText(/Asset Invariant:/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Amit Sharma, Cousin Rohit/i), {
      target: { value: 'Pooja' },
    })
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '15000' },
    })

    const submitBtn = screen.getByRole('button', { name: /save loan obligation/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(loansApi.createLoan).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'Given',
          counterpartyName: 'Pooja',
          principalAmount: 15000,
        })
      )
    })
  })
})
