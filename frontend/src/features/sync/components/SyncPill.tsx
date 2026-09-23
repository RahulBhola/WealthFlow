import React, { useState } from 'react'
import { CheckCircle2, RefreshCw, WifiOff, AlertTriangle } from 'lucide-react'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { SyncDrawer } from './SyncDrawer'

export const SyncPill: React.FC = () => {
  const { isOnline, isSyncing, pendingCount, conflictCount } = useSyncStatus()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDrawerOpen(true)}
        title="Click to view synchronization queue and conflicts"
        className="focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full cursor-pointer transition-all"
      >
        {!isOnline ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100">
            <WifiOff className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-mono text-[11px]">
              Offline {pendingCount > 0 ? `(${pendingCount} pending)` : ''}
            </span>
          </div>
        ) : conflictCount > 0 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span className="font-mono text-[11px]">
              Sync Alert ({conflictCount})
            </span>
          </div>
        ) : isSyncing ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800">
            <RefreshCw className="w-3.5 h-3.5 text-sky-500 animate-spin" />
            <span className="font-mono text-[11px]">
              Syncing {pendingCount > 0 ? `(${pendingCount})` : ''}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-mono text-[11px]">Synced</span>
          </div>
        )}
      </button>

      <SyncDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  )
}
