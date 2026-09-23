export interface CreditCard {
  id: string
  cardName: string
  bankName: string
  maskedNumber: string
  last4Digits: string
  creditLimit: number
  currentBalance: number
  availableCredit: number
  utilizationPercentage: number
  billingCycleDay: number
  dueDay: number
  daysUntilDue: number
  isOverdue: boolean
  alertSeverity: 'Normal' | 'Warning' | 'Critical' | 'Overdue'
  colorTag: string
  isActive: boolean
  createdAtUtc: string
}

export interface CreditCardSummary {
  totalCreditLimit: number
  totalCurrentBalance: number
  totalAvailableCredit: number
  overallUtilizationPercentage: number
  activeCardCount: number
  cards: CreditCard[]
}

export interface CreateCreditCardPayload {
  cardName: string
  bankName: string
  creditLimit: number
  billingCycleDay: number
  dueDay: number
  last4Digits: string
  colorTag?: string
}

export interface PayCreditCardBillPayload {
  sourceAccountId: string
  amount: number
  paymentDate: string
  notes?: string
}

export interface CreditCardBillPaymentResponse {
  transactionId: string
  creditCardId: string
  sourceAccountId: string
  paidAmount: number
  remainingBalance: number
  updatedSourceAccountBalance: number
  paymentDateUtc: string
}
