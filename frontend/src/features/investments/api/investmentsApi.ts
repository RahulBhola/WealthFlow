import { apiClient } from '@/lib/api'
import type {
  Investment,
  InvestmentSummary,
  CreateInvestmentPayload,
  UpdateValuationPayload,
  Sip,
  CreateSipPayload,
  ExecuteSipResponse,
  JointSipSummary,
  JointSipReconciliation,
  SipRepaymentPayload,
  SipRepaymentResponse,
} from '../types'

export const investmentsApi = {
  async getInvestmentSummary(): Promise<InvestmentSummary> {
    return apiClient<InvestmentSummary>('/api/v1/investments')
  },

  async getInvestment(id: string): Promise<Investment> {
    return apiClient<Investment>(`/api/v1/investments/${id}`)
  },

  async createInvestment(payload: CreateInvestmentPayload): Promise<Investment> {
    return apiClient<Investment>('/api/v1/investments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async updateValuation(id: string, payload: UpdateValuationPayload): Promise<Investment> {
    return apiClient<Investment>(`/api/v1/investments/${id}/valuation`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  async getSips(): Promise<Sip[]> {
    return apiClient<Sip[]>('/api/v1/investments/sips')
  },

  async createSip(payload: CreateSipPayload): Promise<Sip> {
    return apiClient<Sip>('/api/v1/investments/sips', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async updateSipStatus(id: string, status: string): Promise<Sip> {
    return apiClient<Sip>(`/api/v1/investments/sips/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  },

  async executeSip(id: string): Promise<ExecuteSipResponse> {
    return apiClient<ExecuteSipResponse>(`/api/v1/investments/sips/${id}/execute`, {
      method: 'POST',
    })
  },

  async getJointSipSummary(): Promise<JointSipSummary> {
    return apiClient<JointSipSummary>('/api/v1/investments/joint-sips')
  },

  async getReconciliations(sipId?: string, pendingOnly?: boolean): Promise<JointSipReconciliation[]> {
    const params = new URLSearchParams()
    if (sipId) params.append('sipId', sipId)
    if (pendingOnly !== undefined) params.append('pendingOnly', pendingOnly.toString())
    const query = params.toString() ? `?${params.toString()}` : ''
    return apiClient<JointSipReconciliation[]>(`/api/v1/investments/joint-sips/reconciliations${query}`)
  },

  async repayReconciliation(id: string, payload: SipRepaymentPayload): Promise<SipRepaymentResponse> {
    return apiClient<SipRepaymentResponse>(`/api/v1/investments/joint-sips/reconciliations/${id}/repay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}
