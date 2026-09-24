import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  ArrowRight,
  Trash2,
  Layers,
  Activity
} from 'lucide-react'
import { db, type MutationQueueItem } from '@/lib/db'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { syncApi } from '../api/syncApi'
import type { SyncTelemetryDto } from '../types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface SyncDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export const SyncDrawer: React.FC<SyncDrawerProps> = ({ isOpen, onClose }) => {
  const { isOnline, isSyncing, pendingCount, conflictCount, lastSyncTime, triggerSync, retryConflicts, clearConflict } = useSyncStatus()
  const [queueItems, setQueueItems] = useState<MutationQueueItem[]>([])
  const [telemetry, setTelemetry] = useState<SyncTelemetryDto | null>(null)
  const [activeTab, setActiveTab] = useState<'queue' | 'conflicts' | 'telemetry'>('queue')

  const loadData = async () => {
    try {
      const items = await db.mutationQueue.toArray()
      setQueueItems(items)

      if (isOnline) {
        try {
          const t = await syncApi.getTelemetry()
          setTelemetry(t)
        } catch {
          // Ignore if unauthenticated or offline
        }
      }
    } catch (err) {
      console.error('Error loading sync queue:', err)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadData()
      const interval = setInterval(loadData, 3000)
      return () => clearInterval(interval)
    }
  }, [isOpen, isOnline, pendingCount, conflictCount])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const pendingItems = queueItems.filter((i) => i.status === 'Pending' || i.status === 'InFlight')
  const conflictItems = queueItems.filter((i) => i.status === 'Conflict' || i.status === 'Failed')

  const drawerContent = (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Offline Sync Hub">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 z-50">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden text-slate-900 dark:text-slate-100 animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-teal-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-sm">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Offline Sync Hub
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  {isOnline ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <Wifi className="w-3.5 h-3.5" /> Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <WifiOff className="w-3.5 h-3.5" /> Offline Mode
                    </span>
                  )}
                  {lastSyncTime && (
                    <span className="text-[11px] text-slate-400">
                      • {new Date(lastSyncTime).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close sync drawer"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2.5 p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-center shrink-0">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col items-center">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pending</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                {pendingCount}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col items-center">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Conflicts</span>
              <span className={cn('text-lg font-bold font-mono mt-0.5', conflictCount > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400')}>
                {conflictCount}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col items-center">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Status</span>
              <span className={cn('text-xs font-semibold mt-1 flex items-center gap-1', isSyncing ? 'text-sky-500 dark:text-sky-400' : isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500')}>
                <span className={cn('w-1.5 h-1.5 rounded-full', isSyncing ? 'bg-sky-400 animate-pulse' : isOnline ? 'bg-emerald-400' : 'bg-amber-400')} />
                {isSyncing ? 'Syncing...' : isOnline ? 'Ready' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Sync Trigger Controls */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2.5 shrink-0">
            <Button
              variant="primary"
              size="sm"
              disabled={isSyncing || !isOnline}
              onClick={() => triggerSync()}
              leftIcon={<RefreshCw className={cn('w-4 h-4 shrink-0', isSyncing && 'animate-spin')} />}
              className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-teal-500 hover:from-indigo-600 hover:to-teal-600 border-none text-white shadow-lg shadow-indigo-500/25 font-semibold text-xs transition-all cursor-pointer"
            >
              {isSyncing ? 'Synchronizing...' : 'Sync Now'}
            </Button>
            {conflictCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => retryConflicts()}
                leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                className="text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                Retry All
              </Button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-50/60 dark:bg-slate-950/40 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={cn(
                'py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer',
                activeTab === 'queue'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Pending Outbox</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {pendingItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('conflicts')}
              className={cn(
                'py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer',
                activeTab === 'conflicts'
                  ? 'border-rose-600 dark:border-rose-400 text-rose-600 dark:text-rose-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Conflicts</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {conflictItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('telemetry')}
              className={cn(
                'py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer',
                activeTab === 'telemetry'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Diagnostics</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white dark:bg-slate-900">
            {activeTab === 'queue' && (
              <>
                {pendingItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500 mb-3">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Outbox Queue Empty
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                      All local modifications are fully synchronized with the database.
                    </p>
                  </div>
                ) : (
                  pendingItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="indigo">{item.entityName}</Badge>
                          <Badge variant="slate">{item.operation}</Badge>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.clientTimestampUtc).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate bg-white dark:bg-slate-900/90 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        {item.payloadJson}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === 'conflicts' && (
              <>
                {conflictItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500 mb-3">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      No Active Conflicts
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                      Your local cache is clean and completely free of concurrent write collisions.
                    </p>
                  </div>
                ) : (
                  conflictItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                          <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                            {item.entityName} Conflict
                          </span>
                        </div>
                        <Badge variant="rose">{item.resolution || 'ServerWins'}</Badge>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">
                          Conflict Reason:
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                          {item.conflictReason || item.errorMessage || 'Server had a newer version of this record.'}
                        </p>
                      </div>

                      {item.serverEntityStateJson && (
                        <div className="text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                            <ArrowRight className="w-3 h-3 text-indigo-500" /> Authoritative Server State:
                          </span>
                          <pre className="font-mono text-slate-500 whitespace-pre-wrap">
                            {item.serverEntityStateJson}
                          </pre>
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearConflict(item.id!)}
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                          className="text-xs text-slate-500 hover:text-rose-600"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === 'telemetry' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-indigo-500" />
                    Sync Server Telemetry
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 text-[11px] block">Processed Today:</span>
                      <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
                        {telemetry?.totalProcessedToday ?? '—'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 text-[11px] block">Conflicts Today:</span>
                      <span className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
                        {telemetry?.conflictCountToday ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50/80 dark:bg-slate-800/30 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Offline Resilience Guarantee:
                  </p>
                  Transactions, Accounts, and Trips created offline retain client-generated GUIDs. Relationships are established immediately in IndexedDB and reconciled via idempotent batch execution on network reconnect.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : drawerContent
}
