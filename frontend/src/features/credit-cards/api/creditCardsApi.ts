import { apiClient } from '@/lib/api'
import type {
  CreditCard,
  CreditCardSummary,
  CreateCreditCardPayload,
  PayCreditCardBillPayload,
  CreditCardBillPaymentResponse,
} from '../types'

export const creditCardsApi = {
  async getCreditCardSummary(): Promise<CreditCardSummary> {
    return apiClient<CreditCardSummary>('/api/v1/credit-cards')
  },

  async getCreditCard(id: string): Promise<CreditCard> {
    return apiClient<CreditCard>(`/api/v1/credit-cards/${id}`)
  },

  async createCreditCard(payload: CreateCreditCardPayload): Promise<CreditCard> {
    return apiClient<CreditCard>('/api/v1/credit-cards', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async payBill(id: string, payload: PayCreditCardBillPayload): Promise<CreditCardBillPaymentResponse> {
    return apiClient<CreditCardBillPaymentResponse>(`/api/v1/credit-cards/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async deleteCreditCard(id: string): Promise<void> {
    await apiClient(`/api/v1/credit-cards/${id}`, {
      method: 'DELETE',
    })
  },
}
