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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-800/60 hover:bg-amber-900/60 transition-colors shadow-sm">
            <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              Offline {pendingCount > 0 ? `(${pendingCount})` : ''}
            </span>
          </div>
        ) : conflictCount > 0 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/60 text-rose-300 border border-rose-800/60 hover:bg-rose-900/60 transition-colors shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>
              Sync Alert ({conflictCount})
            </span>
          </div>
        ) : isSyncing ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-950/60 text-sky-300 border border-sky-800/60 transition-colors shadow-sm">
            <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />
            <span>
              Syncing {pendingCount > 0 ? `(${pendingCount})` : ''}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/60 transition-colors shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse shrink-0" />
            <span className="tracking-tight">Synced</span>
          </div>
        )}
      </button>

      <SyncDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  )
}
