import { apiClient } from '@/lib/api'
import type {
  Transaction,
  TransactionSummary,
  CreateTransactionPayload,
  UpdateTransactionPayload,
  PagedResult,
  TransactionFilterParams,
} from '../types'

export const transactionsApi = {
  async getTransactions(params: TransactionFilterParams = {}): Promise<PagedResult<Transaction>> {
    const query = new URLSearchParams()
    if (params.page) query.set('page', params.page.toString())
    if (params.pageSize) query.set('pageSize', params.pageSize.toString())
    if (params.startDate) query.set('startDate', params.startDate)
    if (params.endDate) query.set('endDate', params.endDate)
    if (params.accountId) query.set('accountId', params.accountId)
    if (params.categoryId) query.set('categoryId', params.categoryId)
    if (params.eventType) query.set('eventType', params.eventType)
    if (params.search) query.set('search', params.search)

    const qs = query.toString()
    return apiClient<PagedResult<Transaction>>(`/api/v1/transactions${qs ? `?${qs}` : ''}`)
  },

  async getTransaction(id: string): Promise<Transaction> {
    return apiClient<Transaction>(`/api/v1/transactions/${id}`)
  },

  async createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
    return apiClient<Transaction>('/api/v1/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async updateTransaction(id: string, payload: UpdateTransactionPayload): Promise<Transaction> {
    return apiClient<Transaction>(`/api/v1/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  async deleteTransaction(id: string): Promise<void> {
    await apiClient(`/api/v1/transactions/${id}`, {
      method: 'DELETE',
    })
  },

  async getSummary(startDate?: string, endDate?: string): Promise<TransactionSummary> {
    const query = new URLSearchParams()
    if (startDate) query.set('startDate', startDate)
    if (endDate) query.set('endDate', endDate)
    const qs = query.toString()
    return apiClient<TransactionSummary>(`/api/v1/transactions/summary${qs ? `?${qs}` : ''}`)
  },
}
