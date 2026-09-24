import { apiClient } from '@/lib/api'
import type { DashboardSummaryDto } from '../types'

export async function fetchDashboardSummary(): Promise<DashboardSummaryDto> {
  return apiClient<DashboardSummaryDto>('/api/v1/dashboard/summary')
}
