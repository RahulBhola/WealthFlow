import { apiClient } from '@/lib/api'
import type { AnalyticsSummaryDto } from '../types'

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummaryDto> {
  return apiClient<AnalyticsSummaryDto>('/api/v1/analytics/summary')
}
