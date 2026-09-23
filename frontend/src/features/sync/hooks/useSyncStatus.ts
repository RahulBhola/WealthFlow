import { useEffect, useState, useCallback } from 'react'
import { syncEngine } from '../engine/syncEngine'
import type { SyncStatusState } from '../types'

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatusState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    conflictCount: 0,
    lastSyncTime: null
  })

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newStatus) => {
      setStatus(newStatus)
    })
    return () => unsubscribe()
  }, [])

  const triggerSync = useCallback(async () => {
    await syncEngine.processSyncQueue()
  }, [])

  const retryConflicts = useCallback(async () => {
    await syncEngine.retryConflicts()
  }, [])

  const clearConflict = useCallback(async (id: number) => {
    await syncEngine.clearConflict(id)
  }, [])

  return {
    ...status,
    triggerSync,
    retryConflicts,
    clearConflict
  }
}
