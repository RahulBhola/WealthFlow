import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { db } from '../../lib/db'
import { syncEngine } from './engine/syncEngine'
import { syncApi } from './api/syncApi'
import { SyncPill } from './components/SyncPill'

describe('Offline Sync Engine & UI', () => {
  beforeEach(async () => {
    await db.mutationQueue.clear()
    await db.transactions.clear()
    await db.accounts.clear()
    await db.trips.clear()
    vi.restoreAllMocks()
    vi.spyOn(syncApi, 'postBatch').mockResolvedValue({
      processedCount: 0,
      successCount: 0,
      conflictCount: 0,
      failureCount: 0,
      serverTimestampUtc: new Date().toISOString(),
      results: []
    })
  })

  it('enqueueMutation should establish client-generated GUID and optimistic local cache record', async () => {
    const payload = {
      accountId: 'acc-123',
      amount: 1500,
      description: 'Test Groceries',
      eventType: 'Expense'
    }

    const { entityId, idempotencyKey } = await syncEngine.enqueueMutation({
      entityName: 'Transaction',
      operation: 'Create',
      payload
    })

    expect(entityId).toBeDefined()
    expect(idempotencyKey).toBeDefined()

    // 1. Verify Outbox queue
    const queuedItems = await db.mutationQueue.toArray()
    expect(queuedItems.length).toBe(1)
    expect(queuedItems[0].entityId).toBe(entityId)
    expect(queuedItems[0].status).toBe('Pending')

    // 2. Verify optimistic local table insertion
    const localTx = await db.transactions.get(entityId)
    expect(localTx).toBeDefined()
    expect(localTx?.amount).toBe(1500)
    expect(localTx?.description).toBe('Test Groceries')
    expect(localTx?.syncStatus).toBe('Pending')
  })

  it('processSyncQueue should send batch and reconcile Synced mutations', async () => {
    const mockPostBatch = vi.spyOn(syncApi, 'postBatch').mockResolvedValue({
      processedCount: 1,
      successCount: 1,
      conflictCount: 0,
      failureCount: 0,
      serverTimestampUtc: new Date().toISOString(),
      results: [
        {
          mutationId: 'mut-1',
          idempotencyKey: 'idemp-1',
          entityName: 'Transaction',
          entityId: 'tx-1',
          status: 'Synced',
          serverTimestampUtc: new Date().toISOString()
        }
      ]
    })

    // Seed outbox mutation
    await db.mutationQueue.add({
      idempotencyKey: 'idemp-1',
      entityName: 'Transaction',
      operation: 'Create',
      entityId: 'tx-1',
      clientTimestampUtc: new Date().toISOString(),
      payloadJson: JSON.stringify({ amount: 500, description: 'Lunch' }),
      status: 'Pending'
    })

    await db.transactions.put({
      id: 'tx-1',
      accountId: 'acc-1',
      amount: 500,
      description: 'Lunch',
      eventType: 'Expense',
      transactionDate: new Date().toISOString(),
      syncStatus: 'Pending',
      updatedAt: new Date().toISOString()
    })

    await syncEngine.processSyncQueue()

    expect(mockPostBatch).toHaveBeenCalledTimes(1)

    // Mutation queue should be empty after successful sync
    const remainingQueue = await db.mutationQueue.toArray()
    expect(remainingQueue.length).toBe(0)

    // Local transaction should be marked as Synced
    const syncedTx = await db.transactions.get('tx-1')
    expect(syncedTx?.syncStatus).toBe('Synced')
  })

  it('processSyncQueue should apply ServerWins authoritative state when conflict occurs', async () => {
    vi.spyOn(syncApi, 'postBatch').mockResolvedValue({
      processedCount: 1,
      successCount: 0,
      conflictCount: 1,
      failureCount: 0,
      serverTimestampUtc: new Date().toISOString(),
      results: [
        {
          mutationId: 'mut-2',
          idempotencyKey: 'idemp-2',
          entityName: 'Transaction',
          entityId: 'tx-2',
          status: 'Conflict',
          conflictReason: 'ConcurrentEdit',
          resolution: 'ServerWins',
          serverTimestampUtc: new Date().toISOString(),
          serverEntityStateJson: JSON.stringify({
            Amount: 999,
            Description: 'Server Authoritative Description',
            UpdatedAtUtc: new Date().toISOString()
          })
        }
      ]
    })

    // Seed local transaction with old edit
    await db.transactions.put({
      id: 'tx-2',
      accountId: 'acc-1',
      amount: 400,
      description: 'Local Stale Edit',
      eventType: 'Expense',
      transactionDate: new Date().toISOString(),
      syncStatus: 'Pending',
      updatedAt: new Date().toISOString()
    })

    await db.mutationQueue.add({
      idempotencyKey: 'idemp-2',
      entityName: 'Transaction',
      operation: 'Update',
      entityId: 'tx-2',
      clientTimestampUtc: new Date().toISOString(),
      payloadJson: JSON.stringify({ amount: 400, description: 'Local Stale Edit' }),
      status: 'Pending'
    })

    await syncEngine.processSyncQueue()

    // Conflict item should remain in queue for user inspection
    const queue = await db.mutationQueue.toArray()
    expect(queue.length).toBe(1)
    expect(queue[0].status).toBe('Conflict')
    expect(queue[0].resolution).toBe('ServerWins')

    // Local transaction should have authoritative server values applied
    const reconciledTx = await db.transactions.get('tx-2')
    expect(reconciledTx?.amount).toBe(999)
    expect(reconciledTx?.description).toBe('Server Authoritative Description')
    expect(reconciledTx?.syncStatus).toBe('Synced')
  })

  it('SyncPill renders and opens SyncDrawer upon click', async () => {
    render(<SyncPill />)

    // Verify initial synced pill
    expect(screen.getByText(/Synced/i)).toBeInTheDocument()

    // Click pill to open drawer
    const pillButton = screen.getByRole('button', { name: /Synced/i })
    fireEvent.click(pillButton)

    await waitFor(() => {
      expect(screen.getByText(/Offline Sync Hub/i)).toBeInTheDocument()
      expect(screen.getByText(/Sync Now/i)).toBeInTheDocument()
    })
  })
})
