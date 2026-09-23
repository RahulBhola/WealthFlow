import { apiClient } from '@/lib/api'
import type {
  Loan,
  LoanSummary,
  CreateLoanPayload,
  RecordRepaymentPayload,
  RecordRepaymentResponse,
  Gift,
  GiftSummary,
  CreateGiftPayload,
} from '../types'

export const loansApi = {
  async getLoanSummary(direction?: string): Promise<LoanSummary> {
    const query = direction && direction !== 'All' ? `?direction=${direction}` : ''
    return apiClient<LoanSummary>(`/api/v1/loans${query}`)
  },

  async getLoan(id: string): Promise<Loan> {
    return apiClient<Loan>(`/api/v1/loans/${id}`)
  },

  async createLoan(payload: CreateLoanPayload): Promise<Loan> {
    return apiClient<Loan>('/api/v1/loans', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async recordRepayment(loanId: string, payload: RecordRepaymentPayload): Promise<RecordRepaymentResponse> {
    return apiClient<RecordRepaymentResponse>(`/api/v1/loans/${loanId}/repayments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async deleteLoan(id: string): Promise<void> {
    await apiClient(`/api/v1/loans/${id}`, {
      method: 'DELETE',
    })
  },

  // Gifts
  async getGiftSummary(): Promise<GiftSummary> {
    return apiClient<GiftSummary>('/api/v1/gifts')
  },

  async createGift(payload: CreateGiftPayload): Promise<Gift> {
    return apiClient<Gift>('/api/v1/gifts', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async deleteGift(id: string): Promise<void> {
    await apiClient(`/api/v1/gifts/${id}`, {
      method: 'DELETE',
    })
  },
}
