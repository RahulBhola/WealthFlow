import { apiClient } from '../../../lib/api'
import type {
  SyncBatchRequest,
  SyncBatchResponse,
  SyncOperationLogDto,
  SyncTelemetryDto
} from '../types'

export const syncApi = {
  postBatch: (request: SyncBatchRequest): Promise<SyncBatchResponse> =>
    apiClient<SyncBatchResponse>('/api/v1/sync/batch', {
      method: 'POST',
      body: JSON.stringify(request)
    }),

  getConflicts: (): Promise<SyncOperationLogDto[]> =>
    apiClient<SyncOperationLogDto[]>('/api/v1/sync/conflicts'),

  getTelemetry: (): Promise<SyncTelemetryDto> =>
    apiClient<SyncTelemetryDto>('/api/v1/sync/telemetry')
}
