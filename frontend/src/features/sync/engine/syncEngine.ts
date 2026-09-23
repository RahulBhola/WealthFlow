import { db, type MutationQueueItem, type LocalTransaction, type LocalTrip, type LocalAccount, type LocalCategory } from '../../../lib/db'
import { syncApi } from '../api/syncApi'
import type { ClientMutationDto, SyncStatusState } from '../types'

type SyncListener = (status: SyncStatusState) => void

class SyncEngine {
  private isProcessing = false
  private listeners: Set<SyncListener> = new Set()
  private lastSyncTime: Date | null = null
  private pollIntervalId: ReturnType<typeof setInterval> | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange())
      window.addEventListener('offline', () => this.handleNetworkChange())

      // Auto periodic background sync every 30 seconds
      this.pollIntervalId = setInterval(() => {
        if (navigator.onLine) {
          this.processSyncQueue()
        }
      }, 30000)
    }
  }

  public generateGuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    // Fallback for older environments / test runners
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener)
    this.notifyStatus()
    return () => {
      this.listeners.delete(listener)
    }
  }

  private async notifyStatus() {
    const status = await this.getSyncStatus()
    this.listeners.forEach((listener) => listener(status))
  }

  public async getSyncStatus(): Promise<SyncStatusState> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    const pendingCount = await db.mutationQueue.where('status').equals('Pending').count()
    const inFlightCount = await db.mutationQueue.where('status').equals('InFlight').count()
    const conflictCount = await db.mutationQueue.where('status').equals('Conflict').count()

    return {
      isOnline,
      isSyncing: this.isProcessing || inFlightCount > 0,
      pendingCount: pendingCount + inFlightCount,
      conflictCount,
      lastSyncTime: this.lastSyncTime
    }
  }

  /**
   * Enqueues an offline mutation and optimistically updates local IndexedDB tables.
   */
  public async enqueueMutation(params: {
    entityName: 'Transaction' | 'Trip' | 'Account' | 'Category'
    operation: 'Create' | 'Update' | 'Delete'
    entityId?: string
    payload: Record<string, any>
  }): Promise<{ entityId: string; idempotencyKey: string }> {
    const entityId = params.entityId || this.generateGuid()
    const idempotencyKey = this.generateGuid()
    const clientTimestampUtc = new Date().toISOString()

    const item: MutationQueueItem = {
      idempotencyKey,
      entityName: params.entityName,
      operation: params.operation,
      entityId,
      payloadJson: JSON.stringify(params.payload),
      clientTimestampUtc,
      status: 'Pending'
    }

    // 1. Save to outbox mutation queue
    await db.mutationQueue.add(item)

    // 2. Optimistic local cache update
    await this.applyOptimisticUpdate(params.entityName, params.operation, entityId, params.payload, clientTimestampUtc)

    this.notifyStatus()

    // 3. Eager background sync if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.processSyncQueue()
    }

    return { entityId, idempotencyKey }
  }

  private async applyOptimisticUpdate(
    entityName: 'Transaction' | 'Trip' | 'Account' | 'Category',
    operation: 'Create' | 'Update' | 'Delete',
    entityId: string,
    payload: Record<string, any>,
    timestamp: string
  ) {
    if (entityName === 'Transaction') {
      if (operation === 'Create' || operation === 'Update') {
        const txRecord: LocalTransaction = {
          id: entityId,
          accountId: payload.accountId,
          categoryId: payload.categoryId,
          amount: Number(payload.amount),
          eventType: payload.eventType || payload.type || 'Expense',
          transactionDate: payload.transactionDate || payload.date || timestamp,
          description: payload.description || 'Offline Transaction',
          merchant: payload.merchant,
          notes: payload.notes,
          tags: payload.tags,
          syncStatus: 'Pending',
          updatedAt: timestamp
        }
        await db.transactions.put(txRecord)
      } else if (operation === 'Delete') {
        await db.transactions.delete(entityId)
      }
    } else if (entityName === 'Trip') {
      if (operation === 'Create' || operation === 'Update') {
        const tripRecord: LocalTrip = {
          id: entityId,
          name: payload.name || 'Offline Trip',
          destination: payload.destination || '',
          startDate: payload.startDate || timestamp,
          endDate: payload.endDate || timestamp,
          budget: payload.budget ? Number(payload.budget) : undefined,
          status: payload.status || 'Planning',
          updatedAt: timestamp
        }
        await db.trips.put(tripRecord)
      } else if (operation === 'Delete') {
        await db.trips.delete(entityId)
      }
    } else if (entityName === 'Account') {
      if (operation === 'Create' || operation === 'Update') {
        const accRecord: LocalAccount = {
          id: entityId,
          name: payload.name || 'Offline Account',
          accountType: payload.accountType || payload.type || 'Bank',
          openingBalance: Number(payload.openingBalance || 0),
          currentBalance: Number(payload.openingBalance || 0),
          currency: payload.currency || 'INR',
          accountNumberMask: payload.accountNumberMask,
          updatedAt: timestamp
        }
        await db.accounts.put(accRecord)
      } else if (operation === 'Delete') {
        await db.accounts.delete(entityId)
      }
    } else if (entityName === 'Category') {
      if (operation === 'Create' || operation === 'Update') {
        const catRecord: LocalCategory = {
          id: entityId,
          name: payload.name || 'Offline Category',
          icon: payload.icon,
          colorHex: payload.colorHex,
          parentCategoryId: payload.parentCategoryId
        }
        await db.categories.put(catRecord)
      } else if (operation === 'Delete') {
        await db.categories.delete(entityId)
      }
    }
  }

  /**
   * Processes the outbox mutation queue in batches and reconciles server responses.
   */
  public async processSyncQueue(): Promise<void> {
    if (this.isProcessing) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    this.isProcessing = true
    this.notifyStatus()

    try {
      const pendingItems = await db.mutationQueue
        .where('status')
        .equals('Pending')
        .sortBy('clientTimestampUtc')

      if (pendingItems.length === 0) {
        this.isProcessing = false
        this.notifyStatus()
        return
      }

      // Mark in-flight
      const ids = pendingItems.map((i) => i.id!).filter(Boolean)
      await db.mutationQueue.where('id').anyOf(ids).modify({ status: 'InFlight' })

      const batchDto: ClientMutationDto[] = pendingItems.map((item) => ({
        id: this.generateGuid(),
        idempotencyKey: item.idempotencyKey,
        entityName: item.entityName,
        operation: item.operation,
        entityId: item.entityId,
        clientTimestampUtc: item.clientTimestampUtc,
        payloadJson: item.payloadJson
      }))

      const response = await syncApi.postBatch({
        clientId: 'wealthflow-pwa',
        mutations: batchDto
      })

      // Reconcile each result
      for (const res of response.results) {
        const queueItem = pendingItems.find((p) => p.idempotencyKey === res.idempotencyKey)
        if (!queueItem || !queueItem.id) continue

        if (res.status === 'Synced' || res.status === 'Duplicate') {
          // Success: delete from mutation queue
          await db.mutationQueue.delete(queueItem.id)

          // Mark local entity as synced
          if (queueItem.entityName === 'Transaction') {
            await db.transactions.update(queueItem.entityId, { syncStatus: 'Synced' })
          }
        } else if (res.status === 'Conflict') {
          // ServerWins: Update local entity with authoritative server values
          if (res.serverEntityStateJson) {
            try {
              const serverState = JSON.parse(res.serverEntityStateJson)
              await this.applyServerAuthoritativeState(queueItem.entityName, queueItem.entityId, serverState)
            } catch (err) {
              console.error('Failed to parse server entity state:', err)
            }
          }

          // Mark queue item as Conflict for user drawer inspection
          await db.mutationQueue.update(queueItem.id, {
            status: 'Conflict',
            conflictReason: res.conflictReason || 'Concurrent Server Edit',
            resolution: res.resolution || 'ServerWins',
            serverEntityStateJson: res.serverEntityStateJson || undefined
          })
        } else if (res.status === 'Failed') {
          await db.mutationQueue.update(queueItem.id, {
            status: 'Failed',
            errorMessage: res.errorMessage || 'Synchronization rejected by server.'
          })
        }
      }

      this.lastSyncTime = new Date()
    } catch (error) {
      console.error('Sync batch error:', error)
      // Reset in-flight back to pending for retry on next network poll
      await db.mutationQueue.where('status').equals('InFlight').modify({ status: 'Pending' })
    } finally {
      this.isProcessing = false
      this.notifyStatus()
    }
  }

  private async applyServerAuthoritativeState(entityName: string, entityId: string, state: Record<string, any>) {
    if (entityName === 'Transaction') {
      const local = await db.transactions.get(entityId)
      if (local) {
        await db.transactions.update(entityId, {
          amount: Number(state.Amount ?? local.amount),
          description: state.Description ?? local.description,
          syncStatus: 'Synced',
          updatedAt: state.UpdatedAtUtc ?? new Date().toISOString()
        })
      }
    } else if (entityName === 'Trip') {
      const local = await db.trips.get(entityId)
      if (local) {
        await db.trips.update(entityId, {
          name: state.Name ?? local.name,
          destination: state.Destination ?? local.destination,
          budget: state.Budget ? Number(state.Budget) : local.budget,
          updatedAt: state.UpdatedAtUtc ?? new Date().toISOString()
        })
      }
    }
  }

  private handleNetworkChange() {
    this.notifyStatus()
    if (navigator.onLine) {
      this.processSyncQueue()
    }
  }

  public async retryConflicts(): Promise<void> {
    // Reset conflicts to pending
    await db.mutationQueue.where('status').equals('Conflict').modify({ status: 'Pending' })
    await this.processSyncQueue()
  }

  public async clearConflict(id: number): Promise<void> {
    await db.mutationQueue.delete(id)
    this.notifyStatus()
  }

  public destroy() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId)
    }
  }
}

export const syncEngine = new SyncEngine()
