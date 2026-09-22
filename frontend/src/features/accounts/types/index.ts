export type AccountType = 'Bank' | 'Cash' | 'Wallet' | 'CreditCard' | 'Savings' | 'Other'

export interface Account {
  id: string
  name: string
  accountType: AccountType
  openingBalance: number
  currentBalance: number
  currency: string
  accountNumberMask?: string | null
  colorTag?: string | null
  isActive: boolean
  sortOrder: number
  createdAtUtc: string
}

export interface AccountSummary {
  totalLiquidBalance: number
  totalBankBalance: number
  totalCashBalance: number
  totalWalletBalance: number
  totalSavingsBalance: number
  activeAccountCount: number
}

export interface CreateAccountPayload {
  name: string
  accountType: AccountType
  openingBalance: number
  accountNumberMask?: string
  colorTag?: string
  sortOrder?: number
  currency?: string
}

export interface UpdateAccountPayload {
  name: string
  accountType: AccountType
  accountNumberMask?: string
  colorTag?: string
  sortOrder?: number
  currency?: string
}

export interface ReconcileResponse {
  accountId: string
  accountName: string
  openingBalance: number
  previousBalance: number
  reconciledBalance: number
  discrepancy: number
  hasDiscrepancy: boolean
  transactionCount: number
  reconciledAtUtc: string
}
