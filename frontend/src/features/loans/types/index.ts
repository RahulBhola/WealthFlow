export interface LoanRepayment {
  id: string
  loanId: string
  accountId: string
  accountName?: string
  amount: number
  repaymentDate: string
  notes?: string
  createdAtUtc: string
}

export interface Loan {
  id: string
  direction: 'Given' | 'Received'
  counterpartyName: string
  counterpartyContact?: string
  principalAmount: number
  outstandingBalance: number
  totalRepaidAmount: number
  repaymentPercentage: number
  dueDate?: string
  disbursementAccountId?: string
  disbursementAccountName?: string
  notes?: string
  status: 'Open' | 'PartiallyRepaid' | 'FullySettled'
  isSettled: boolean
  repayments: LoanRepayment[]
  createdAtUtc: string
}

export interface LoanSummary {
  totalReceivable: number
  totalPayable: number
  netBilateralPosition: number
  activeLentCount: number
  activeBorrowedCount: number
  loans: Loan[]
}

export interface CreateLoanPayload {
  direction: 'Given' | 'Received'
  counterpartyName: string
  principalAmount: number
  counterpartyContact?: string
  dueDate?: string
  disbursementAccountId?: string
  notes?: string
}

export interface RecordRepaymentPayload {
  accountId: string
  amount: number
  repaymentDate: string
  notes?: string
}

export interface RecordRepaymentResponse {
  repaymentId: string
  loanId: string
  repaidAmount: number
  remainingBalance: number
  status: string
  isSettled: boolean
  updatedAccountBalance: number
}

// Gift types
export interface Gift {
  id: string
  direction: 'Given' | 'Received'
  recipientOrGiver: string
  occasion: string
  amount: number
  accountId: string
  accountName?: string
  date: string
  notes?: string
  transactionId?: string
  createdAtUtc: string
}

export interface GiftSummary {
  totalGiftsGiven: number
  totalGiftsReceived: number
  netGiftFlow: number
  totalGiftsCount: number
  gifts: Gift[]
}

export interface CreateGiftPayload {
  direction: 'Given' | 'Received'
  recipientOrGiver: string
  occasion: string
  amount: number
  accountId: string
  date: string
  notes?: string
}
