export interface ClientMutationDto {
  id: string
  idempotencyKey: string
  entityName: string
  operation: string
  entityId: string
  clientTimestampUtc: string
  payloadJson: string
  expectedVersion?: string
}

export interface SyncBatchRequest {
  clientId?: string
  mutations: ClientMutationDto[]
}

export interface MutationResultDto {
  mutationId: string
  idempotencyKey: string
  entityName: string
  entityId: string
  status: 'Synced' | 'Duplicate' | 'Conflict' | 'Failed'
  conflictReason?: string | null
  resolution?: string | null
  serverTimestampUtc: string
  serverEntityStateJson?: string | null
  errorMessage?: string | null
}

export interface SyncBatchResponse {
  processedCount: number
  successCount: number
  conflictCount: number
  failureCount: number
  results: MutationResultDto[]
  serverTimestampUtc: string
}

export interface SyncOperationLogDto {
  id: string
  userId: string
  idempotencyKey: string
  entityName: string
  operation: string
  entityId: string
  clientTimestampUtc: string
  serverTimestampUtc: string
  status: string
  conflictReason?: string | null
  resolution?: string | null
  payloadJson: string
}

export interface SyncTelemetryDto {
  totalProcessedToday: number
  conflictCountToday: number
  deadLetterCount: number
  recentOperations: SyncOperationLogDto[]
}

export interface SyncStatusState {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  conflictCount: number
  lastSyncTime: Date | null
}
