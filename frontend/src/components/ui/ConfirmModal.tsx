import React, { useEffect } from 'react'
import { AlertTriangle, Trash2, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title?: string
  message: string
  subMessage?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

/**
 * Universal Glassmorphic Confirmation Modal replacing browser window.confirm
 * with a high-fidelity, accessible, themed confirmation dialog.
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  subMessage,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 select-none"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2.5 rounded-xl border',
                variant === 'danger' && 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                variant === 'warning' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                variant === 'info' && 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              )}
            >
              {variant === 'danger' ? (
                <Trash2 className="w-4 h-4" />
              ) : variant === 'warning' ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Info className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 id="confirm-dialog-title" className="text-sm font-bold text-white tracking-tight">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Authoritative Confirmation</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-200 leading-relaxed font-medium">
            {message}
          </p>

          {subMessage && (
            <div
              className={cn(
                'p-3 rounded-xl border flex items-start gap-2.5 text-xs',
                variant === 'danger' && 'bg-rose-950/30 text-rose-300 border-rose-800/40',
                variant === 'warning' && 'bg-amber-950/30 text-amber-300 border-amber-800/40',
                variant === 'info' && 'bg-indigo-950/30 text-indigo-300 border-indigo-800/40'
              )}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{subMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl shadow-lg transition-all disabled:opacity-50 cursor-pointer',
                variant === 'danger' &&
                  'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-950/50',
                variant === 'warning' &&
                  'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-amber-950/50',
                variant === 'info' &&
                  'bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white shadow-indigo-950/50'
              )}
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
