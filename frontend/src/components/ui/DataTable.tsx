import React from 'react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  isNumeric?: boolean
  className?: string
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  isLoading?: boolean
  emptyMessage?: string
  onRowClick?: (item: T) => void
  className?: string
}

/**
 * ERP High-Density Data Table component.
 * Features 36px compact rows, sticky header, tabular numbers, and zero visual bloat.
 */
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No records found',
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg', className)}>
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'h-9 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none',
                  col.isNumeric ? 'text-right' : 'text-left',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="h-24 text-center text-sm text-slate-500">
                <span className="inline-block w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                Loading records...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-24 text-center text-sm text-slate-500 dark:text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => {
              const rowKey = keyExtractor(item)
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'h-9 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50',
                    onRowClick ? 'cursor-pointer' : ''
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={`${rowKey}-${col.key}`}
                      className={cn(
                        'px-4 text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap',
                        col.isNumeric ? 'text-right font-mono tabular-nums' : '',
                        col.className
                      )}
                    >
                      {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
