import React, { useState } from 'react'
import { RefreshCw, WifiOff, AlertTriangle } from 'lucide-react'
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
        title="Offline cache synchronized with live database. Click to view sync queue."
        aria-label="Synced"
        className="focus:outline-none rounded-lg cursor-pointer transition-all"
      >
        {!isOnline ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60 dark:hover:bg-amber-900/60 transition-colors shadow-xs dark:shadow-sm">
            <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Offline {pendingCount > 0 ? `(${pendingCount})` : ''}
            </span>
          </div>
        ) : conflictCount > 0 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60 dark:hover:bg-rose-900/60 transition-colors shadow-xs dark:shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>
              Sync Alert ({conflictCount})
            </span>
          </div>
        ) : isSyncing ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60 dark:hover:bg-sky-900/60 transition-colors shadow-xs dark:shadow-sm">
            <RefreshCw className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 animate-spin shrink-0" />
            <span>
              Syncing {pendingCount > 0 ? `(${pendingCount})` : ''}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60 dark:hover:bg-emerald-900/60 transition-colors shadow-xs dark:shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse shrink-0" />
            <span className="tracking-tight font-medium hidden xs:inline sm:inline">Synced</span>
          </div>
        )}
      </button>

      <SyncDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  )
}
