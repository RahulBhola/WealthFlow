import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InvestmentsPage } from './pages/InvestmentsPage'
import { investmentsApi } from './api/investmentsApi'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import type {
  Investment,
  InvestmentSummary,
  Sip,
  JointSipSummary,
  JointSipReconciliation,
} from './types'
import type { Account } from '@/features/accounts/types'

vi.mock('./api/investmentsApi', () => ({
  investmentsApi: {
    getInvestmentSummary: vi.fn(),
    getInvestment: vi.fn(),
    createInvestment: vi.fn(),
    updateValuation: vi.fn(),
    getSips: vi.fn(),
    createSip: vi.fn(),
    updateSipStatus: vi.fn(),
    executeSip: vi.fn(),
    getJointSipSummary: vi.fn(),
    getReconciliations: vi.fn(),
    repayReconciliation: vi.fn(),
  },
}))

vi.mock('@/features/accounts/api/accountsApi', () => ({
  accountsApi: {
    getAccounts: vi.fn(),
  },
}))

const mockInvestments: Investment[] = [
  {
    id: 'inv-1',
    name: 'Parag Parikh Flexi Cap Fund',
    assetClass: 'Mutual Fund',
    investedAmount: 50000,
    currentValuation: 62000,
    units: 120.5,
    absoluteGainLoss: 12000,
    returnPercentage: 24.0,
    lastValuationDate: new Date().toISOString(),
    createdAtUtc: new Date().toISOString(),
  },
  {
    id: 'inv-2',
    name: 'HDFC Bank Equity Shares',
    assetClass: 'Stock',
    investedAmount: 40000,
    currentValuation: 38000,
    units: 25,
    absoluteGainLoss: -2000,
    returnPercentage: -5.0,
    lastValuationDate: new Date().toISOString(),
    createdAtUtc: new Date().toISOString(),
  },
]

const mockInvestmentSummary: InvestmentSummary = {
  totalInvestedAmount: 90000,
  totalCurrentValuation: 100000,
  totalAbsoluteGainLoss: 10000,
  overallReturnPercentage: 11.11,
  assetAllocation: [
    {
      assetClass: 'Mutual Fund',
      totalInvested: 50000,
      totalValuation: 62000,
      allocationPercentage: 62.0,
    },
    {
      assetClass: 'Stock',
      totalInvested: 40000,
      totalValuation: 38000,
      allocationPercentage: 38.0,
    },
  ],
  investments: mockInvestments,
}

const mockSips: Sip[] = [
  {
    id: 'sip-1',
    investmentId: 'inv-1',
    investmentName: 'Parag Parikh Flexi Cap Fund',
    sourceAccountId: 'acc-1',
    sourceAccountName: 'HDFC Salary Bank',
    name: 'Shared Family SIP',
    amount: 15000,
    executionDay: 5,
    startDate: '2026-01-01',
    endDate: null,
    status: 'Active',
    isJoint: true,
    userShare: 7500,
    coInvestorShare: 7500,
    coInvestorName: 'Rahul (Brother)',
    nextExecutionDate: '2026-10-05',
    createdAtUtc: new Date().toISOString(),
  },
]

const mockReconciliations: JointSipReconciliation[] = [
  {
    id: 'rec-1',
    sipId: 'sip-1',
    sipName: 'Shared Family SIP',
    month: 9,
    year: 2026,
    executionDateUtc: new Date().toISOString(),
    totalAmount: 15000,
    userShare: 7500,
    coInvestorShare: 7500,
    amountSettled: 0,
    remainingDue: 7500,
    settlementStatus: 'Pending',
    settlementDateUtc: null,
    notes: 'Monthly SIP Cycle #1',
  },
]

const mockJointSummary: JointSipSummary = {
  totalJointSipsCount: 1,
  totalMonthlyCommitment: 15000,
  totalUserMonthlyShare: 7500,
  totalPartnerMonthlyShare: 7500,
  totalPartnerReceivableDue: 7500,
  jointSips: [
    {
      sip: mockSips[0],
      totalPartnerDueAcrossCycles: 7500,
      totalPartnerSettledAcrossCycles: 0,
      pendingCyclesCount: 1,
      reconciliations: mockReconciliations,
    },
  ],
}

const mockAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'HDFC Salary Bank',
    accountType: 'Bank',
    openingBalance: 100000,
    currentBalance: 85000,
    currency: 'INR',
    accountNumberMask: '•••• 1234',
    colorTag: '#3B82F6',
    isActive: true,
    sortOrder: 1,
    createdAtUtc: new Date().toISOString(),
  },
]

describe('InvestmentsPage and Joint SIP Reconciliation UI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(investmentsApi.getInvestmentSummary).mockResolvedValue(mockInvestmentSummary)
    vi.mocked(investmentsApi.getSips).mockResolvedValue(mockSips)
    vi.mocked(investmentsApi.getJointSipSummary).mockResolvedValue(mockJointSummary)
    vi.mocked(investmentsApi.getReconciliations).mockResolvedValue(mockReconciliations)
    vi.mocked(accountsApi.getAccounts).mockResolvedValue(mockAccounts)
  })

  it('renders page header and metric strip cards correctly', async () => {
    render(<InvestmentsPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Investments & Joint SIP Reconciliation' })).toBeInTheDocument()
    })

    expect(screen.getByText('Portfolio Valuation')).toBeInTheDocument()
    expect(screen.getAllByText('Invested Capital').length).toBeGreaterThan(0)
    expect(screen.getByText('Total Gains / Loss')).toBeInTheDocument()
    expect(screen.getByText('Partner Receivables Due')).toBeInTheDocument()
  })

  it('renders portfolio assets and displays asset allocation breakdown', async () => {
    render(<InvestmentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Parag Parikh Flexi Cap Fund')).toBeInTheDocument()
    })

    expect(screen.getByText('HDFC Bank Equity Shares')).toBeInTheDocument()
    expect(screen.getByText('Asset Allocation & Diversification')).toBeInTheDocument()
    expect(screen.getAllByText('Mutual Fund').length).toBeGreaterThan(0)
  })

  it('switches to SIP Schedules tab and verifies split meter for joint SIPs', async () => {
    render(<InvestmentsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /SIP Schedules/i })).toBeInTheDocument()
    })

    const sipTab = screen.getByRole('button', { name: /SIP Schedules/i })
    fireEvent.click(sipTab)

    expect(screen.getByText('Shared Family SIP')).toBeInTheDocument()
    expect(screen.getByText(/Joint with Rahul \(Brother\)/)).toBeInTheDocument()
    expect(screen.getByText(/You: ₹7,500.00 \(50%\)/)).toBeInTheDocument()
    expect(screen.getByText(/Rahul \(Brother\): ₹7,500.00 \(50%\)/)).toBeInTheDocument()
  })

  it('switches to Joint SIP Reconciliation tab and renders cycles table', async () => {
    render(<InvestmentsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Joint SIP Reconciliation/i })).toBeInTheDocument()
    })

    const reconTab = screen.getByRole('button', { name: /Joint SIP Reconciliation/i })
    fireEvent.click(reconTab)

    expect(screen.getByText('Total Joint SIPs')).toBeInTheDocument()
    expect(screen.getByText('Monthly Partner Commitment')).toBeInTheDocument()
    expect(screen.getByText('Total Partner Receivables Due')).toBeInTheDocument()

    // Table rows
    expect(screen.getByText('Shared Family SIP')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Record Repayment/i })).toBeInTheDocument()
  })

  it('opens and closes Add Investment modal', async () => {
    render(<InvestmentsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Investment/i })).toBeInTheDocument()
    })

    const addBtn = screen.getByRole('button', { name: /Add Investment/i })
    fireEvent.click(addBtn)

    expect(screen.getByText('Add Investment Asset')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Parag Parikh Flexi Cap Fund/i)).toBeInTheDocument()

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i })
    fireEvent.click(cancelBtn)

    await waitFor(() => {
      expect(screen.queryByText('Add Investment Asset')).not.toBeInTheDocument()
    })
  })

  it('opens Setup SIP modal with joint SIP split controls and accounting callout', async () => {
    render(<InvestmentsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Setup SIP/i })).toBeInTheDocument()
    })

    const setupSipBtn = screen.getByRole('button', { name: /Setup SIP/i })
    fireEvent.click(setupSipBtn)

    expect(screen.getByText('Configure Systematic Investment Plan (SIP)')).toBeInTheDocument()

    // Toggle Joint SIP checkbox
    const jointToggle = screen.getByLabelText(/Is Joint \/ Shared SIP/i)
    fireEvent.click(jointToggle)

    expect(screen.getByText('Double-Entry Accounting Invariant')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Rahul \(Brother\)/i)).toBeInTheDocument()
  })
})
