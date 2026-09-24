import { apiClient } from '@/lib/api'
import type {
  AdminCommandCenterDto,
  AdminUserDto,
  AdminUserSessionDto,
  AdminAuditLogsPagedResponse,
  AdminSyncMonitorDto,
} from '../types'

export async function fetchAdminDashboard(): Promise<AdminCommandCenterDto> {
  return apiClient<AdminCommandCenterDto>('/api/v1/admin/dashboard')
}

export async function fetchAdminUsers(): Promise<AdminUserDto[]> {
  return apiClient<AdminUserDto[]>('/api/v1/admin/users')
}

export async function toggleUserLock(userId: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/v1/admin/users/${userId}/toggle-lock`, {
    method: 'POST',
  })
}

export async function fetchUserSessions(userId: string): Promise<AdminUserSessionDto[]> {
  return apiClient<AdminUserSessionDto[]>(`/api/v1/admin/users/${userId}/sessions`)
}

export async function revokeUserSession(
  userId: string,
  sessionId: string
): Promise<{ message: string }> {
  return apiClient<{ message: string }>(
    `/api/v1/admin/users/${userId}/sessions/${sessionId}/revoke`,
    {
      method: 'POST',
    }
  )
}

export interface AuditLogsFilterParams {
  page?: number
  pageSize?: number
  entityName?: string
  action?: string
  userId?: string
  startDate?: string
  endDate?: string
  search?: string
}

export async function fetchAdminAuditLogs(
  params: AuditLogsFilterParams = {}
): Promise<AdminAuditLogsPagedResponse> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', params.page.toString())
  if (params.pageSize) query.set('pageSize', params.pageSize.toString())
  if (params.entityName) query.set('entityName', params.entityName)
  if (params.action) query.set('action', params.action)
  if (params.userId) query.set('userId', params.userId)
  if (params.startDate) query.set('startDate', params.startDate)
  if (params.endDate) query.set('endDate', params.endDate)
  if (params.search) query.set('search', params.search)

  const qs = query.toString()
  return apiClient<AdminAuditLogsPagedResponse>(`/api/v1/admin/audit-logs${qs ? `?${qs}` : ''}`)
}

export async function exportAuditLogsJson(): Promise<void> {
  const response = await fetch('/api/v1/admin/audit-logs/export', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    },
  })
  if (!response.ok) {
    throw new Error('Failed to download audit logs export.')
  }
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wealthflow_audit_logs_${new Date().toISOString().replace(/[:.]/g, '')}.json`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

export async function fetchAdminSyncMonitor(): Promise<AdminSyncMonitorDto> {
  return apiClient<AdminSyncMonitorDto>('/api/v1/admin/sync-monitor')
}

export async function resolveSyncConflict(
  conflictId: string,
  resolution: string
): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/v1/admin/sync/conflicts/${conflictId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolution }),
  })
}

export async function sweepStaleConflicts(): Promise<{ sweptCount: number; message: string }> {
  return apiClient<{ sweptCount: number; message: string }>('/api/v1/admin/sync/sweep', {
    method: 'POST',
  })
}

export async function pruneRevokedTokens(): Promise<{ prunedCount: number; message: string }> {
  return apiClient<{ prunedCount: number; message: string }>('/api/v1/admin/tokens/prune', {
    method: 'POST',
  })
}
