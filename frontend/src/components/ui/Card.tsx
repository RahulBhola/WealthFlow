import React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  actionSlot?: React.ReactNode
  children?: React.ReactNode
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  actionSlot,
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4',
        className
      )}
      {...props}
    >
      {children ? (
        children
      ) : (
        <div className="flex flex-col space-y-0.5">
          {title && <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      )}
      {actionSlot && <div className="flex items-center gap-2 shrink-0">{actionSlot}</div>}
    </div>
  )
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className, ...props }) => {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  )
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        'px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
