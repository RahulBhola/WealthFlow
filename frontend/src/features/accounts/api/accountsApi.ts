import { apiClient } from '@/lib/api'
import type {
  Account,
  AccountSummary,
  CreateAccountPayload,
  UpdateAccountPayload,
  ReconcileResponse,
} from '../types'

export const accountsApi = {
  async getAccounts(includeArchived: boolean = false): Promise<Account[]> {
    return apiClient<Account[]>(`/api/v1/accounts?includeArchived=${includeArchived}`)
  },

  async getAccountSummary(): Promise<AccountSummary> {
    return apiClient<AccountSummary>('/api/v1/accounts/summary')
  },

  async getAccount(id: string): Promise<Account> {
    return apiClient<Account>(`/api/v1/accounts/${id}`)
  },

  async createAccount(payload: CreateAccountPayload): Promise<Account> {
    return apiClient<Account>('/api/v1/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async updateAccount(id: string, payload: UpdateAccountPayload): Promise<Account> {
    return apiClient<Account>(`/api/v1/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  async archiveAccount(id: string): Promise<void> {
    await apiClient(`/api/v1/accounts/${id}/archive`, {
      method: 'POST',
    })
  },

  async activateAccount(id: string): Promise<void> {
    await apiClient(`/api/v1/accounts/${id}/activate`, {
      method: 'POST',
    })
  },

  async deleteAccount(id: string): Promise<void> {
    await apiClient(`/api/v1/accounts/${id}`, {
      method: 'DELETE',
    })
  },

  async reconcileAccount(id: string): Promise<ReconcileResponse> {
    return apiClient<ReconcileResponse>(`/api/v1/accounts/${id}/reconcile`, {
      method: 'POST',
    })
  },
}
