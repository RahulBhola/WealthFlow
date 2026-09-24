export interface LiveMutationDto {
  id: string
  timeUtc: string
  actorEmail: string
  entity: string
  opType: string
  latencyMs: number
  status: string
  device: string
}

export interface SubsystemsTelemetryDto {
  postgreSqlStatus: string
  cloudStorageProvider: string
  cloudStorageQuotaUsed: string
  backgroundJobs: string[]
}

export interface AdminCommandCenterDto {
  status: string
  totalUsersCount: number
  activeSessionsCount: number
  singleAdminVerified: boolean
  adminCount: number
  adminEmailMask: string
  adminLastLoginUtc: string | null
  dbProvider: string
  dbPoolOccupancy: string
  dbQueryP95LatencyMs: number
  dbStorageSizeBytes: number
  syncOperationsToday: number
  syncConflictRatePercentage: number
  syncDeadLetterCount: number
  securityEventsToday: number
  failedLoginAttemptsToday: number
  recentMutations: LiveMutationDto[]
  subsystems: SubsystemsTelemetryDto
}

export interface AdminUserDto {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  createdAtUtc: string
  accountsCount: number
  tripsCount: number
  activeDevicesCount: number
  isLocked: boolean
  lockoutEndUtc: string | null
}

export interface AdminUserSessionDto {
  sessionId: string
  userId: string
  deviceName: string
  deviceType: string
  browser: string | null
  ipAddress: string | null
  lastActiveAtUtc: string
  expiresAtUtc: string
  isRevoked: boolean
}

export interface AdminAuditLogDto {
  id: string
  timestampUtc: string
  actorEmail: string
  action: string
  entityName: string
  entityId: string
  ipAddress: string | null
  userAgent: string | null
  oldValuesJson: string | null
  newValuesJson: string | null
}

export interface AdminAuditLogsPagedResponse {
  items: AdminAuditLogDto[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AdminConflictItemDto {
  id: string
  clientDevice: string
  userEmail: string
  entityName: string
  entityId: string
  clientTimestampUtc: string
  serverTimestampUtc: string
  conflictReason: string | null
  resolution: string | null
  payloadJson: string
  serverEntityStateJson: string | null
}

export interface AdminSyncMonitorDto {
  queueDepth: number
  avgLatencyMs: number
  conflictRatePercentage: number
  deadLetterCount: number
  activeClients: number
  conflicts: AdminConflictItemDto[]
}
