import React, { useEffect, useState } from 'react'
import {
  FileText,
  Search,
  Download,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AdminNavTabs } from '../components/AdminNavTabs'
import { AuditDiffDrawer } from '../components/AuditDiffDrawer'
import { fetchAdminAuditLogs, exportAuditLogsJson } from '../api/adminApi'
import type { AdminAuditLogDto } from '../types'

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLogDto[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Diff drawer state
  const [selectedLog, setSelectedLog] = useState<AdminAuditLogDto | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const loadLogs = async (targetPage = page) => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchAdminAuditLogs({
        page: targetPage,
        pageSize: 30,
        search: search.trim() || undefined,
        entityName: entityFilter || undefined,
        action: actionFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      setLogs(res.items || [])
      setTotalCount(res.totalCount)
      setPage(res.page)
      setTotalPages(res.totalPages)
    } catch (err: any) {
      console.error('Failed to load audit logs', err)
      setError(err?.message || 'Unable to retrieve system audit events.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs(1)
  }, [entityFilter, actionFilter, startDate, endDate])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadLogs(1)
  }

  const handleExport = async () => {
    try {
      await exportAuditLogsJson()
    } catch (err: any) {
      setError(err?.message || 'Failed to download audit logs export.')
    }
  }

  const handleInspectDiff = (log: AdminAuditLogDto) => {
    setSelectedLog(log)
    setIsDrawerOpen(true)
  }

  const getActionBadgeVariant = (action: string) => {
    const act = action.toUpperCase()
    if (act.includes('INSERT') || act.includes('CREATE')) return 'emerald'
    if (act.includes('UPDATE')) return 'indigo'
    if (act.includes('DELETE') || act.includes('REVOKE')) return 'rose'
    if (act.includes('LOCK') || act.includes('AUTH')) return 'amber'
    return 'slate'
  }

  return (
    <div className="space-y-6">
      {/* Tier 1: Page Header & Admin Nav Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              System Audit Logs & Traceability
            </h1>
            <Badge variant="indigo" size="sm">
              Immutable Trail
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tamper-evident operational mutation ledger with colorized JSON diff evaluation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleExport} variant="secondary" size="sm">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export JSON
          </Button>
          <Button onClick={() => loadLogs(page)} variant="secondary" size="sm">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Admin Module Navigation Tabs */}
      <AdminNavTabs />

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Multi-Faceted Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col md:flex-row md:items-center gap-3 flex-wrap"
          >
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search actor email, entity ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Entity Name Filter */}
            <div className="w-40">
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Entities</option>
                <option value="Account">Account</option>
                <option value="Transaction">Transaction</option>
                <option value="Budget">Budget</option>
                <option value="CreditCard">CreditCard</option>
                <option value="Investment">Investment</option>
                <option value="Loan">Loan</option>
                <option value="Trip">Trip</option>
                <option value="User">User</option>
              </select>
            </div>

            {/* Action Filter */}
            <div className="w-36">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Actions</option>
                <option value="CREATE">CREATE / INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="AUTH">AUTH / LOCK</option>
              </select>
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none"
              />
            </div>

            <Button type="submit" variant="primary" size="sm" className="h-8">
              Apply Filters
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tier 2: High-Density Audit Event Grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              Audit Event Grid
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Showing {logs.length} of {totalCount} logged events across the cluster.
            </p>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => loadLogs(page - 1)}
              className="h-7 w-7 p-0 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => loadLogs(page + 1)}
              className="h-7 w-7 p-0 flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-y border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Entity ID</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-4 text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans text-xs">
                      No audit events recorded for current filter set.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => handleInspectDiff(log)}
                      className="h-[36px] hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-1.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                        {new Date(log.timestampUtc).toLocaleString()}
                      </td>
                      <td className="py-1.5 px-3 text-slate-800 dark:text-slate-200 font-sans font-medium truncate max-w-[150px]">
                        {log.actorEmail}
                      </td>
                      <td className="py-1.5 px-3">
                        <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-1.5 px-3 text-slate-700 dark:text-slate-200 font-semibold font-sans">
                        {log.entityName}
                      </td>
                      <td className="py-1.5 px-3 text-slate-400 text-[11px] truncate max-w-[120px]">
                        {log.entityId}
                      </td>
                      <td className="py-1.5 px-3 text-slate-500 text-[11px]">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-1.5 px-4 text-right font-sans whitespace-nowrap">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-6 text-[10px] px-2 opacity-80 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleInspectDiff(log)
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1 text-indigo-500" />
                          Inspect Diff
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Slide-Over Audit Diff Drawer */}
      <AuditDiffDrawer
        log={selectedLog}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false)
          setSelectedLog(null)
        }}
        onFilterEntity={(entity) => {
          setEntityFilter(entity)
          loadLogs(1)
        }}
      />
    </div>
  )
}
