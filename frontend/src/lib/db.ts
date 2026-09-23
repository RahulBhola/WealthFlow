import Dexie, { type Table } from 'dexie'

export interface LocalAccount {
  id: string // Client-generated GUID (v4/v7)
  userId?: string
  name: string
  accountType: string
  openingBalance: number
  currentBalance: number
  currency: string
  accountNumberMask?: string
  colorTag?: string
  isActive?: boolean
  sortOrder?: number
  updatedAt: string
}

export interface LocalTransaction {
  id: string // Client-generated GUID
  userId?: string
  accountId: string
  categoryId?: string
  amount: number
  eventType: string
  transactionDate: string
  description: string
  merchant?: string
  notes?: string
  tags?: string
  syncStatus: 'Synced' | 'Pending' | 'Failed' | 'Conflict'
  updatedAt: string
}

export interface LocalTrip {
  id: string // Client-generated GUID
  hostUserId?: string
  name: string
  destination: string
  startDate: string
  endDate: string
  budget?: number
  status: string
  updatedAt: string
}

export interface LocalCategory {
  id: string // Client-generated GUID
  userId?: string
  parentCategoryId?: string
  name: string
  icon?: string
  colorHex?: string
  isSpecialProtein?: boolean
  isSpecialClothing?: boolean
  isActive?: boolean
}

export interface MutationQueueItem {
  id?: number // Auto-incrementing local ID
  idempotencyKey: string // Unique GUID for deduplication
  entityName: 'Transaction' | 'Trip' | 'Account' | 'Category'
  operation: 'Create' | 'Update' | 'Delete'
  entityId: string // Client-generated GUID of target entity
  payloadJson: string
  clientTimestampUtc: string
  status: 'Pending' | 'InFlight' | 'Synced' | 'Failed' | 'Conflict'
  conflictReason?: string
  resolution?: string
  serverEntityStateJson?: string
  errorMessage?: string
}

export class WealthFlowDatabase extends Dexie {
  accounts!: Table<LocalAccount, string>
  transactions!: Table<LocalTransaction, string>
  trips!: Table<LocalTrip, string>
  categories!: Table<LocalCategory, string>
  mutationQueue!: Table<MutationQueueItem, number>

  constructor() {
    super('WealthFlowLocalDB')
    this.version(1).stores({
      accounts: 'id, userId, name, accountType, currentBalance, updatedAt',
      transactions: 'id, userId, accountId, categoryId, amount, eventType, transactionDate, syncStatus, updatedAt',
      trips: 'id, hostUserId, name, destination, startDate, endDate, status, updatedAt',
      categories: 'id, userId, name, parentCategoryId',
      mutationQueue: '++id, idempotencyKey, entityName, operation, entityId, clientTimestampUtc, status, [status+clientTimestampUtc]'
    })
  }
}

export const db = new WealthFlowDatabase()
