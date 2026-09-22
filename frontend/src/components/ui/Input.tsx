import React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional icon rendered on the left inside the input */
  leftElement?: React.ReactNode
  /** Optional icon or action rendered on the right inside the input */
  rightElement?: React.ReactNode
  /** Highlights input with error border */
  hasError?: boolean
}

/**
 * Atomic Input component with 4px grid spacing tokens, focus states, and accessory slots.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  className,
  type = 'text',
  hasError = false,
  leftElement,
  rightElement,
  disabled,
  ...props
}, ref) => {
  return (
    <div className="relative w-full flex items-center">
      {leftElement && (
        <div className="absolute left-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
          {leftElement}
        </div>
      )}
      <input
        type={type}
        ref={ref}
        disabled={disabled}
        className={cn(
          'w-full h-10 px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border rounded-lg',
          'text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500',
          'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1',
          'disabled:bg-slate-50 disabled:text-slate-500 dark:disabled:bg-slate-800/40 disabled:cursor-not-allowed',
          hasError
            ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
            : 'border-slate-300 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20',
          leftElement ? 'pl-9' : '',
          rightElement ? 'pr-9' : '',
          className
        )}
        {...props}
      />
      {rightElement && (
        <div className="absolute right-3 flex items-center text-slate-400 dark:text-slate-500">
          {rightElement}
        </div>
      )}
    </div>
  )
})

Input.displayName = 'Input'
