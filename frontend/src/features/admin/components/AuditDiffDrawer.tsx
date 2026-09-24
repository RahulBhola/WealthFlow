import React, { useEffect, useState } from 'react'
import { X, Copy, Check, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { AdminAuditLogDto } from '../types'

export interface AuditDiffDrawerProps {
  log: AdminAuditLogDto | null
  isOpen: boolean
  onClose: () => void
  onFilterEntity?: (entityName: string) => void
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'header'
  text: string
  key?: string
}

export function computeJsonDiff(oldJsonStr: string | null, newJsonStr: string | null): DiffLine[] {
  let oldObj: Record<string, any> = {}
  let newObj: Record<string, any> = {}

  let oldParseError = false
  let newParseError = false

  if (oldJsonStr) {
    try {
      oldObj = JSON.parse(oldJsonStr)
    } catch {
      oldParseError = true
    }
  }

  if (newJsonStr) {
    try {
      newObj = JSON.parse(newJsonStr)
    } catch {
      newParseError = true
    }
  }

  if (oldParseError || newParseError) {
    return [
      { type: 'header', text: '// Raw Diff (unparseable JSON):' },
      ...(oldJsonStr ? [{ type: 'removed' as const, text: `- ${oldJsonStr}` }] : []),
      ...(newJsonStr ? [{ type: 'added' as const, text: `+ ${newJsonStr}` }] : []),
    ]
  }

  const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)])).sort()
  const lines: DiffLine[] = [{ type: 'header', text: '{' }]

  if (allKeys.length === 0) {
    lines.push({ type: 'unchanged', text: '  // No property modifications recorded' })
  }

  for (const key of allKeys) {
    const hasOld = key in oldObj
    const hasNew = key in newObj

    if (hasOld && !hasNew) {
      lines.push({
        type: 'removed',
        key,
        text: ` - "${key}": ${JSON.stringify(oldObj[key])},`,
      })
    } else if (!hasOld && hasNew) {
      lines.push({
        type: 'added',
        key,
        text: ` + "${key}": ${JSON.stringify(newObj[key])},`,
      })
    } else {
      const oldVal = JSON.stringify(oldObj[key])
      const newVal = JSON.stringify(newObj[key])
      if (oldVal !== newVal) {
        lines.push({
          type: 'removed',
          key,
          text: ` - "${key}": ${oldVal},`,
        })
        lines.push({
          type: 'added',
          key,
          text: ` + "${key}": ${newVal},`,
        })
      } else {
        lines.push({
          type: 'unchanged',
          key,
          text: `   "${key}": ${newVal},`,
        })
      }
    }
  }

  lines.push({ type: 'header', text: '}' })
  return lines
}

export const AuditDiffDrawer: React.FC<AuditDiffDrawerProps> = ({
  log,
  isOpen,
  onClose,
  onFilterEntity,
}) => {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'diff' | 'rawOld' | 'rawNew'>('diff')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !log) return null

  const diffLines = computeJsonDiff(log.oldValuesJson, log.newValuesJson)

  const handleCopy = () => {
    const content = JSON.stringify(
      {
        id: log.id,
        timestamp: log.timestampUtc,
        actor: log.actorEmail,
        action: log.action,
        entity: log.entityName,
        entityId: log.entityId,
        oldValues: log.oldValuesJson ? JSON.parse(log.oldValuesJson) : null,
        newValues: log.newValuesJson ? JSON.parse(log.newValuesJson) : null,
      },
      null,
      2
    )
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-slate-400">
                  EVENT #{log.id.slice(0, 8)}
                </span>
                <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                  {log.action}
                </Badge>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {log.entityName}
                <span className="text-xs font-mono font-normal text-slate-500 ml-2">
                  (ID: {log.entityId.slice(0, 8)}...)
                </span>
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close diff inspector"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Metadata Section */}
          <div className="p-4 bg-slate-100/60 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-xs space-y-2 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-sans">Actor:</span>
              <span className="text-slate-900 dark:text-slate-200 font-medium">
                {log.actorEmail}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-sans">Timestamp:</span>
              <span className="text-slate-600 dark:text-slate-400">
                {new Date(log.timestampUtc).toLocaleString()} UTC
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-sans">Client IP:</span>
              <span className="text-slate-600 dark:text-slate-400">
                {log.ipAddress || '127.0.0.1 (Internal)'}
              </span>
            </div>
            {log.userAgent && (
              <div className="pt-1 border-t border-slate-200 dark:border-slate-800/60 text-[11px] text-slate-400 truncate">
                UA: {log.userAgent}
              </div>
            )}
          </div>

          {/* View Tab Switcher */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('diff')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  activeTab === 'diff'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Colorized Diff
              </button>
              <button
                onClick={() => setActiveTab('rawOld')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  activeTab === 'rawOld'
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Old State
              </button>
              <button
                onClick={() => setActiveTab('rawNew')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  activeTab === 'rawNew'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                New State
              </button>
            </div>

            <Button onClick={handleCopy} variant="secondary" size="sm">
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Copy JSON
                </>
              )}
            </Button>
          </div>

          {/* Drawer Body - Diff Render */}
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed bg-slate-950 text-slate-200">
            {activeTab === 'diff' && (
              <div className="space-y-0.5 select-text" data-testid="diff-container">
                {diffLines.map((line, idx) => {
                  let lineStyle = 'text-slate-400'
                  let bgStyle = ''

                  if (line.type === 'removed') {
                    lineStyle = 'text-rose-400 font-semibold'
                    bgStyle = 'bg-rose-950/40 border-l-2 border-rose-500 pl-2'
                  } else if (line.type === 'added') {
                    lineStyle = 'text-emerald-400 font-semibold'
                    bgStyle = 'bg-emerald-950/40 border-l-2 border-emerald-500 pl-2'
                  } else if (line.type === 'header') {
                    lineStyle = 'text-slate-500 font-bold'
                  } else {
                    lineStyle = 'text-slate-300 pl-2.5'
                  }

                  return (
                    <div
                      key={idx}
                      className={`py-0.5 whitespace-pre-wrap break-all ${lineStyle} ${bgStyle}`}
                    >
                      {line.text}
                    </div>
                  )
                })}
              </div>
            )}

            {activeTab === 'rawOld' && (
              <pre className="text-rose-300 whitespace-pre-wrap break-all">
                {log.oldValuesJson
                  ? JSON.stringify(JSON.parse(log.oldValuesJson), null, 2)
                  : '// No preceding state recorded (CREATE operation)'}
              </pre>
            )}

            {activeTab === 'rawNew' && (
              <pre className="text-emerald-300 whitespace-pre-wrap break-all">
                {log.newValuesJson
                  ? JSON.stringify(JSON.parse(log.newValuesJson), null, 2)
                  : '// No successor state recorded (DELETE operation)'}
              </pre>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
            {onFilterEntity && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onFilterEntity(log.entityName)
                  onClose()
                }}
              >
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                Filter by {log.entityName}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose} className="ml-auto">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
