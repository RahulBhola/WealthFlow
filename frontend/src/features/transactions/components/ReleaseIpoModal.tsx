import React, { useState } from 'react'
import { X, Ban, AlertCircle, Info } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { transactionsApi } from '../api/transactionsApi'
import type { Transaction } from '../types'
import { useCurrency } from '../../../context/CurrencyContext'

export interface ReleaseIpoModalProps {
  isOpen: boolean
  transaction: Transaction | null
  onClose: () => void
  onSuccess: () => void
}

export const ReleaseIpoModal: React.FC<ReleaseIpoModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onSuccess,
}) => {
  const { formatCurrency } = useCurrency()
  const [reason, setReason] = useState('Not Allotted / Bid Unsuccessful')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !transaction) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await transactionsApi.releaseIpo(transaction.id, {
        reason: reason.trim() || undefined,
      })
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to release IPO hold.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Release IPO Hold (Not Allotted)
              </h2>
              <p className="text-xs text-slate-500">
                Restore available bank funds without debiting
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-500">
              <span>Application</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{transaction.description}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Bank Account</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{transaction.accountName}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Lien / Blocked Hold</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          </div>

          <FormField label="Status / Reason Note">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Not Allotted / Mandate Revoked"
            />
          </FormField>

          {/* Audit Rule Notice */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Ledger Cut / Strikethrough Display</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                The ₹{transaction.amount.toLocaleString('en-IN')} lien will be unblocked in <strong>{transaction.accountName}</strong>. This record will <strong>not be deleted</strong>; it will remain in your transaction ledger with a <span className="line-through font-semibold">strikethrough / cut</span> visual indicator for your financial audit trail.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              isLoading={isSubmitting}
              className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Release Lien & Unblock Funds
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
