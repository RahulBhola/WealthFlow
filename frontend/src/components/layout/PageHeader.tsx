import React from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  actionSlot?: React.ReactNode
  className?: string
}

/**
 * Universal PageHeader component enforcing single styling blueprint across all pages.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actionSlot,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800',
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {actionSlot && (
        <div className="flex items-center gap-3 shrink-0">
          {actionSlot}
        </div>
      )}
    </div>
  )
}
