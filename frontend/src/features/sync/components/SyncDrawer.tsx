import React, { useEffect, useState } from 'react'
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
  Trash2
} from 'lucide-react'
import { db, type MutationQueueItem } from '@/lib/db'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { syncApi } from '../api/syncApi'
import type { SyncTelemetryDto } from '../types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

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

  if (!isOpen) return null

  const pendingItems = queueItems.filter((i) => i.status === 'Pending' || i.status === 'InFlight')
  const conflictItems = queueItems.filter((i) => i.status === 'Conflict' || i.status === 'Failed')

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Offline Sync Hub
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  {isOnline ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <Wifi className="w-3.5 h-3.5" /> Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-500">
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
              onClick={onClose}
              aria-label="Close sync drawer"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-center">
            <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 block">Pending</span>
              <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                {pendingCount}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 block">Conflicts</span>
              <span className="text-base font-bold text-rose-600 dark:text-rose-400 font-mono">
                {conflictCount}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 block">Status</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block mt-1">
                {isSyncing ? 'Syncing...' : isOnline ? 'Ready' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Sync Trigger Controls */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={isSyncing || !isOnline}
              onClick={() => triggerSync()}
              className="flex-1"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Synchronizing...' : 'Sync Now'}
            </Button>
            {conflictCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => retryConflicts()}
                className="text-rose-600 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                Retry All
              </Button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 px-6">
            <button
              onClick={() => setActiveTab('queue')}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'queue'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Pending Outbox ({pendingItems.length})
            </button>
            <button
              onClick={() => setActiveTab('conflicts')}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'conflicts'
                  ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Conflicts ({conflictItems.length})
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'telemetry'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Diagnostics
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeTab === 'queue' && (
              <>
                {pendingItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/80 mb-2" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Outbox Queue Empty
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      All local modifications are fully synchronized.
                    </p>
                  </div>
                ) : (
                  pendingItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
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
                      <div className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
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
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/80 mb-2" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      No Active Conflicts
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Your local changes are clean and free of concurrent collisions.
                    </p>
                  </div>
                ) : (
                  conflictItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 space-y-3"
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
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          {item.conflictReason || item.errorMessage || 'Server had a newer version of this record.'}
                        </p>
                      </div>

                      {item.serverEntityStateJson && (
                        <div className="text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800">
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
                          className="text-xs text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Dismiss
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === 'telemetry' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Sync Server Telemetry
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Processed Today:</span>
                      <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                        {telemetry?.totalProcessedToday ?? '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Conflicts Today:</span>
                      <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                        {telemetry?.conflictCountToday ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 leading-relaxed bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded border border-slate-200 dark:border-slate-800">
                  <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Offline Guarantee:
                  </p>
                  Transactions and Trips created offline retain client-generated GUIDs. Relationships are established immediately in IndexedDB and reconciled via idempotent batch execution on network reconnect.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
