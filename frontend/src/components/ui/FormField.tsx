import React from 'react'
import { cn } from '@/lib/utils'

export interface FormFieldProps {
  /** Accessible label text displayed above the control */
  label?: string
  /** Field name / HTML id for matching label htmlFor */
  htmlFor?: string
  /** Error message displayed below control in rose text */
  error?: string
  /** Optional helper description displayed when error is absent */
  helperText?: string
  /** Indicates whether the field is required */
  required?: boolean
  /** Child input/control element */
  children: React.ReactNode
  /** Extra container styling */
  className?: string
}

/**
 * Composite FormField molecule standardizing vertical spacing, label typography, and error states.
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  error,
  helperText,
  required = false,
  children,
  className,
}) => {
  return (
    <div className={cn('flex flex-col space-y-1.5 w-full', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none flex items-center gap-1"
        >
          {label}
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}

      {children}

      {error ? (
        <p className="text-xs text-rose-500 dark:text-rose-400 font-medium tracking-tight animate-fadeIn">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      ) : null}
    </div>
  )
}
