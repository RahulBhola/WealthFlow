import { apiClient } from '@/lib/api'
import type { BudgetSummary, CreateBudgetPayload, BudgetStatus } from '../types'

export const budgetsApi = {
  async getBudgetSummary(year?: number, month?: number): Promise<BudgetSummary> {
    const query = new URLSearchParams()
    if (year) query.set('year', year.toString())
    if (month) query.set('month', month.toString())
    const qs = query.toString()
    return apiClient<BudgetSummary>(`/api/v1/budgets/summary${qs ? `?${qs}` : ''}`)
  },

  async createOrUpdateBudget(payload: CreateBudgetPayload): Promise<BudgetStatus> {
    return apiClient<BudgetStatus>('/api/v1/budgets', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}
