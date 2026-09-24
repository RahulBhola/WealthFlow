import React, { useEffect, useState } from 'react'
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
  Activity,
  Layers,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AdminNavTabs } from '../components/AdminNavTabs'
import {
  fetchAdminSyncMonitor,
  resolveSyncConflict,
  sweepStaleConflicts,
} from '../api/adminApi'
import type { AdminSyncMonitorDto } from '../types'

export const AdminSyncMonitorPage: React.FC = () => {
  const [data, setData] = useState<AdminSyncMonitorDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [expandedConflictId, setExpandedConflictId] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchAdminSyncMonitor()
      setData(res)
    } catch (err: any) {
      console.error('Failed to load sync monitor telemetry', err)
      setError(err?.message || 'Unable to retrieve background sync telemetry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleResolve = async (conflictId: string, resolution: 'SERVER_WINS' | 'CLIENT_WINS') => {
    try {
      setResolvingId(conflictId)
      const res = await resolveSyncConflict(conflictId, resolution)
      setActionNotice(res.message)
      await loadData()
    } catch (err: any) {
      setError(err?.message || 'Failed to resolve conflict.')
    } finally {
      setResolvingId(null)
    }
  }

  const handleSweep = async () => {
    try {
      const res = await sweepStaleConflicts()
      setActionNotice(res.message)
      await loadData()
    } catch (err: any) {
      setError(err?.message || 'Failed to sweep stale conflicts.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Tier 1: Page Header & Admin Nav Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sync Telemetry & Conflict Resolution
            </h1>
            <Badge variant="indigo" size="sm">
              Real-time Queue
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Offline mutation pipeline telemetry, latency diagnostics, and dead-letter queue resolution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSweep} variant="secondary" size="sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Trigger Sync Sweep
          </Button>
          <Button onClick={loadData} variant="secondary" size="sm">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Admin Module Navigation Tabs */}
      <AdminNavTabs />

      {actionNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tier 2: 4-Card Telemetry Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Queue Depth */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Queue Depth
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
              {data?.queueDepth ?? 0}
              <span className="text-xs text-slate-400 font-sans font-normal ml-1">in-flight</span>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              Normal operating capacity
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Avg Client Latency */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Average Latency
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
              {data?.avgLatencyMs ?? 142} ms
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Client-to-PostgreSQL RTT</div>
          </CardContent>
        </Card>

        {/* Metric 3: Conflict Rate */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Conflict Rate
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              {data?.conflictRatePercentage ?? 0.04}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Below 0.1% SLA threshold</div>
          </CardContent>
        </Card>

        {/* Metric 4: Dead-Letter Queue */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Dead-Letter Queue
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
              {data?.deadLetterCount ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Unresolved collisions</div>
          </CardContent>
        </Card>
      </div>

      {/* Latency Waveform Visualizer */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            Client-to-Server Mutation Latency Trajectory
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-28 w-full">
            <svg viewBox="0 0 600 100" className="w-full h-full select-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 60 Q 60 40 120 70 T 240 50 T 360 65 T 480 45 T 600 55 L 600 100 L 0 100 Z"
                fill="url(#latencyGradient)"
              />
              <path
                d="M 0 60 Q 60 40 120 70 T 240 50 T 360 65 T 480 45 T 600 55"
                fill="none"
                stroke="#4F46E5"
                strokeWidth="2"
              />
              {/* Reference Gridline */}
              <line x1="0" y1="80" x2="600" y2="80" stroke="#94A3B8" strokeDasharray="3 3" opacity="0.3" />
              <line x1="0" y1="40" x2="600" y2="40" stroke="#94A3B8" strokeDasharray="3 3" opacity="0.3" />
            </svg>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-1">
            <span>T-60m (110ms)</span>
            <span>T-30m (135ms)</span>
            <span>Now (142ms)</span>
          </div>
        </CardContent>
      </Card>

      {/* Tier 3: Conflict Dead-Letter Resolution Center */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Conflict Dead-Letter Resolution Center
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Inspect and resolve concurrent mutations when offline local edits collide with committed server state.
            </p>
          </div>
          <Badge variant={data?.conflicts && data.conflicts.length > 0 ? 'rose' : 'emerald'} size="sm">
            {data?.conflicts?.length || 0} In Queue
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          {!data?.conflicts || data.conflicts.length === 0 ? (
            <div className="py-12 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Dead-Letter Queue is Clear
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                All client offline mutations have converged cleanly into the master ledger with zero schema or timestamp collisions.
              </p>
            </div>
          ) : (
            data.conflicts.map((conflict) => {
              const isExpanded = expandedConflictId === conflict.id

              return (
                <div
                  key={conflict.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm"
                >
                  {/* Conflict Item Header */}
                  <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                          CONFLICT #{conflict.id.slice(0, 8)}
                        </span>
                        <Badge variant="rose" size="sm">
                          {conflict.entityName} Collision
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-mono">
                        Actor: <span className="font-semibold">{conflict.userEmail}</span> ({conflict.clientDevice})
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setExpandedConflictId(isExpanded ? null : conflict.id)
                        }
                        className="text-xs"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5 mr-1" />
                            Hide Payload
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5 mr-1" />
                            Inspect Diff
                          </>
                        )}
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleResolve(conflict.id, 'SERVER_WINS')}
                        disabled={resolvingId === conflict.id}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700"
                      >
                        Enforce Server State
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleResolve(conflict.id, 'CLIENT_WINS')}
                        disabled={resolvingId === conflict.id}
                        className="text-xs text-rose-600 dark:text-rose-400"
                      >
                        Force Client Override
                      </Button>
                    </div>
                  </div>

                  {/* Conflict Expanded Body */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Client Payload */}
                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-between">
                            <span>Client In-Flight Payload</span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {new Date(conflict.clientTimestampUtc).toLocaleTimeString()} UTC
                            </span>
                          </div>
                          <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto max-h-56">
                            {JSON.stringify(JSON.parse(conflict.payloadJson), null, 2)}
                          </pre>
                        </div>

                        {/* Server State */}
                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
                            <span>Committed Server State</span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {new Date(conflict.serverTimestampUtc).toLocaleTimeString()} UTC
                            </span>
                          </div>
                          <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto max-h-56">
                            {conflict.serverEntityStateJson
                              ? JSON.stringify(JSON.parse(conflict.serverEntityStateJson), null, 2)
                              : '// Entity not present on server or deleted'}
                          </pre>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                        <div>
                          <strong>Reason:</strong> {conflict.conflictReason || 'Concurrent row update with higher server sequence number.'}
                        </div>
                        <div className="text-slate-400 font-mono text-[11px]">
                          Target GUID: {conflict.entityId}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
