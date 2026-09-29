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
    try {
      const params = new URLSearchParams()
      if (sipId) params.append('sipId', sipId)
      if (pendingOnly !== undefined) params.append('pendingOnly', pendingOnly.toString())
      const query = params.toString() ? `?${params.toString()}` : ''
      return await apiClient<JointSipReconciliation[]>(`/api/v1/investments/joint-sips/reconciliations${query}`)
    } catch {
      // Fallback: extract from joint-sips summary
      try {
        const sum = await investmentsApi.getJointSipSummary()
        const allRecons = (sum.jointSips || []).flatMap((s) => s.reconciliations || [])
        if (sipId) return allRecons.filter((r) => r.sipId === sipId)
        if (pendingOnly) return allRecons.filter((r) => r.settlementStatus !== 'Settled')
        return allRecons
      } catch {
        return []
      }
    }
  },

  async repayReconciliation(id: string, payload: SipRepaymentPayload): Promise<SipRepaymentResponse> {
    return apiClient<SipRepaymentResponse>(`/api/v1/investments/joint-sips/reconciliations/${id}/repay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async getIpoApplications(): Promise<import('../../transactions/types').Transaction[]> {
    try {
      // 1. Primary: fetch by eventType=IpoApplication
      const res = await apiClient<import('../../transactions/types').PagedResult<import('../../transactions/types').Transaction>>(
        '/api/v1/transactions?eventType=IpoApplication&pageSize=100'
      ).catch(() => ({ items: [] } as any))
      
      const ipos: import('../../transactions/types').Transaction[] = 
        res?.items || (res as any)?.Items || (Array.isArray(res) ? res : [])

      // 2. Secondary: also query general transactions to catch any IPOs recorded with matching descriptions or categories
      const generalRes = await apiClient<import('../../transactions/types').PagedResult<import('../../transactions/types').Transaction>>(
        '/api/v1/transactions?pageSize=100'
      ).catch(() => ({ items: [] } as any))
      
      const generalItems: import('../../transactions/types').Transaction[] = 
        generalRes?.items || (generalRes as any)?.Items || (Array.isArray(generalRes) ? generalRes : [])

      const additionalIpos = generalItems.filter((t) => {
        const alreadyExists = ipos.some((existing) => existing.id === t.id)
        if (alreadyExists) return false

        const isIpoType = t.eventType === 'IpoApplication'
        const isIpoStatus = t.status === 'Blocked' || t.status === 'Allotted' || t.status === 'Released'
        const desc = t.description?.trim().toLowerCase() || ''
        const isIpoDesc = desc.startsWith('ipo') || desc.includes('ipo -') || desc.includes('ipo hold')
        const cat = t.categoryName?.toLowerCase() || ''
        const isIpoCat = cat.includes('ipo')

        return isIpoType || isIpoStatus || isIpoDesc || isIpoCat
      })

      return [...ipos, ...additionalIpos]
    } catch (err) {
      console.error('Failed to load IPO applications:', err)
      return []
    }
  },
}
