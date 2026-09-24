import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CreditCardsPage } from './pages/CreditCardsPage'
import { creditCardsApi } from './api/creditCardsApi'
import { accountsApi } from '@/features/accounts/api/accountsApi'
import type { CreditCard, CreditCardSummary } from './types'
import type { Account } from '@/features/accounts/types'

vi.mock('./api/creditCardsApi', () => ({
  creditCardsApi: {
    getCreditCardSummary: vi.fn(),
    getCreditCard: vi.fn(),
    createCreditCard: vi.fn(),
    payBill: vi.fn(),
    deleteCreditCard: vi.fn(),
  },
}))

vi.mock('@/features/accounts/api/accountsApi', () => ({
  accountsApi: {
    getAccounts: vi.fn(),
  },
}))

const mockCards: CreditCard[] = [
  {
    id: 'cc-1',
    bankName: 'HDFC Bank',
    cardName: 'Infinia Metal',
    creditLimit: 500000,
    currentBalance: 85000,
    availableCredit: 415000,
    utilizationPercentage: 17.0,
    statementDate: 15,
    dueDate: 5,
    last4Digits: '8910',
    colorTag: '#1E293B',
    alertSeverity: 'None',
    daysUntilDue: 18,
    isOverLimit: false,
    createdAtUtc: new Date().toISOString(),
  },
  {
    id: 'cc-2',
    bankName: 'ICICI Bank',
    cardName: 'Amazon Pay',
    creditLimit: 200000,
    currentBalance: 160000,
    availableCredit: 40000,
    utilizationPercentage: 80.0,
    statementDate: 20,
    dueDate: 10,
    last4Digits: '1234',
    colorTag: '#B91C1C',
    alertSeverity: 'DueSoon',
    daysUntilDue: 3,
    isOverLimit: false,
    createdAtUtc: new Date().toISOString(),
  },
]

const mockSummary: CreditCardSummary = {
  totalCreditLimit: 700000,
  totalCurrentBalance: 245000,
  totalAvailableCredit: 455000,
  overallUtilizationPercentage: 35.0,
  activeCardCount: 2,
  cards: mockCards,
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

describe('CreditCardsPage and Card Accounting UI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(creditCardsApi.getCreditCardSummary).mockResolvedValue(mockSummary)
    vi.mocked(accountsApi.getAccounts).mockResolvedValue(mockAccounts)
  })

  it('renders 5-Tier layout with metric strip and stylized credit cards', async () => {
    render(<CreditCardsPage />)

    // Header
    expect(screen.getByText('Credit Cards & Liabilities')).toBeInTheDocument()

    // Wait for card and summary data
    await waitFor(() => {
      expect(screen.getByText('Infinia Metal')).toBeInTheDocument()
      expect(screen.getByText('Amazon Pay')).toBeInTheDocument()
    })

    // 4-Card Metric Strip
    expect(screen.getByText('Total Credit Line')).toBeInTheDocument()
    expect(screen.getByText('Total Outstanding')).toBeInTheDocument()
    expect(screen.getAllByText('Available Credit').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Credit Utilization')).toBeInTheDocument()
    expect(screen.getByText('35%')).toBeInTheDocument()

    // Masked Card Numbers
    expect(screen.getByText('•••• •••• •••• 8910')).toBeInTheDocument()
    expect(screen.getByText('•••• •••• •••• 1234')).toBeInTheDocument()

    // Utilization & Alert pills
    expect(screen.getByText('17%')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText(/Due in 3 days/i)).toBeInTheDocument()
    expect(screen.getByText(/Due in 18 days/i)).toBeInTheDocument()
  })

  it('opens PayBillModal and records debt settlement payment without double-counting', async () => {
    vi.mocked(creditCardsApi.payBill).mockResolvedValue({
      paymentTransactionId: 'tx-payment-1',
      creditCardId: 'cc-1',
      paidAmount: 25000,
      updatedCardBalance: 60000,
      updatedAccountBalance: 225000,
    })

    render(<CreditCardsPage />)

    await waitFor(() => {
      expect(screen.getByText('Infinia Metal')).toBeInTheDocument()
    })

    // Click "Pay Bill" for first card
    const payBillButtons = screen.getAllByRole('button', { name: /pay bill/i })
    fireEvent.click(payBillButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Pay Credit Card Bill')).toBeInTheDocument()
      expect(screen.getAllByText(/Infinia Metal/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/Debt Reduction Invariant:/i)).toBeInTheDocument()
    })

    // Change amount to 25000
    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '25000' } })

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /confirm settlement/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(creditCardsApi.payBill).toHaveBeenCalledWith(
        'cc-1',
        expect.objectContaining({
          sourceAccountId: 'acc-1',
          amount: 25000,
        })
      )
    })
  })

  it('opens AddCreditCardModal and adds a new card', async () => {
    vi.mocked(creditCardsApi.createCreditCard).mockResolvedValue({
      ...mockCards[0],
      id: 'cc-3',
      cardName: 'Millennia Card',
    })

    render(<CreditCardsPage />)

    const addCardBtn = screen.getByRole('button', { name: /add card/i })
    fireEvent.click(addCardBtn)

    await waitFor(() => {
      expect(screen.getByText('Add Credit Card')).toBeInTheDocument()
      expect(screen.getByText(/Zero-Trust Boundary:/i)).toBeInTheDocument()
    })

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. HDFC Bank, ICICI/i), {
      target: { value: 'HDFC Bank' },
    })
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Regalia Gold, Magnus/i), {
      target: { value: 'Millennia Card' },
    })
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '150000' },
    })
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 4821/i), {
      target: { value: '5566' },
    })

    const saveBtn = screen.getByRole('button', { name: /save credit card/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(creditCardsApi.createCreditCard).toHaveBeenCalledWith(
        expect.objectContaining({
          bankName: 'HDFC Bank',
          cardName: 'Millennia Card',
          creditLimit: 150000,
          last4Digits: '5566',
        })
      )
    })
  })

  it('deletes a card upon confirmation and reloads data', async () => {
    vi.mocked(creditCardsApi.deleteCreditCard).mockResolvedValue()

    render(<CreditCardsPage />)

    await waitFor(() => {
      expect(screen.getByText('Infinia Metal')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByTitle(/remove credit card/i)
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText(/Any historical transactions recorded under this card/i)).toBeInTheDocument()
    })

    const confirmBtn = screen.getByRole('button', { name: 'Remove Card' })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(creditCardsApi.deleteCreditCard).toHaveBeenCalledWith('cc-1')
    })
  })
})
