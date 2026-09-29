export type TransactionType = 'Expense' | 'Income' | 'Transfer' | 'IpoApplication'

export type TransactionStatus = 'Completed' | 'Blocked' | 'Allotted' | 'Released'

export interface Transaction {
  id: string
  userId: string
  accountId: string
  accountName: string
  categoryId?: string | null
  categoryName?: string | null
  amount: number
  transactionDate: string
  eventType: TransactionType | string
  description: string
  merchant?: string | null
  notes?: string | null
  tags?: string | null
  targetAccountId?: string | null
  targetAccountName?: string | null
  idempotencyKey: string
  syncStatus: string
  createdAtUtc: string
  status?: TransactionStatus | string
  allottedUnits?: number | null
  resolutionDate?: string | null
}

export interface TransactionSummary {
  totalInflows: number
  totalOutflows: number
  netCashFlow: number
  totalCount: number
}

export interface CreateTransactionPayload {
  accountId: string
  amount: number
  eventType: TransactionType
  transactionDate: string
  description: string
  categoryId?: string | null
  targetAccountId?: string | null
  merchant?: string | null
  notes?: string | null
  tags?: string | null
  idempotencyKey?: string
  status?: TransactionStatus | string
  allottedUnits?: number | null
}

export interface AllotIpoPayload {
  allottedUnits: number
  allottedAmount?: number | null
  stockName?: string | null
}

export interface ReleaseIpoPayload {
  reason?: string | null
}

export interface UpdateTransactionPayload {
  accountId: string
  amount: number
  eventType: TransactionType
  transactionDate: string
  description: string
  categoryId?: string | null
  targetAccountId?: string | null
  merchant?: string | null
  notes?: string | null
  tags?: string | null
  status?: TransactionStatus
  allottedUnits?: number | null
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface TransactionFilterParams {
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
  accountId?: string
  categoryId?: string
  eventType?: string
  search?: string
}
