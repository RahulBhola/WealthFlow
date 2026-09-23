import React, { useState, useEffect } from 'react'
import { X, CheckCircle2, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { tripsApi } from '../api/tripsApi'
import type { SettlementInstruction, ExecuteSettlementPayload } from '../types'

export interface SettleUpModalProps {
  isOpen: boolean
  tripId: string
  instruction: SettlementInstruction | null
  onClose: () => void
  onSuccess: () => void
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  isOpen,
  tripId,
  instruction,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState(() => (instruction ? instruction.amount.toString() : ''))
  const [settledDate, setSettledDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [notes, setNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (instruction) {
      setAmount(instruction.amount.toString())
      setError(null)
    }
  }, [instruction])

  if (!isOpen || !instruction) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid settlement amount greater than zero.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: ExecuteSettlementPayload = {
        payerMemberId: instruction.fromMemberId,
        receiverMemberId: instruction.toMemberId,
        amount: numAmount,
        settledDate: new Date(settledDate).toISOString(),
        paymentMethod,
        notes: notes.trim() || undefined,
      }

      await tripsApi.executeSettlement(tripId, payload)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record settlement.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Record Settle Up
              </h2>
              <p className="text-xs text-slate-500">
                Pure bookkeeping ledger update confirming debt extinguishment
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Critical Accounting Banner */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Pure Bookkeeping Record:</span> WealthFlow is strictly an
              informational ledger. Confirming this settlement updates the group balance without
              launching external UPI payment apps or banking gateways.
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Participant summary banner */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Debtor</span>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {instruction.fromMemberName}
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-500" />
            <div className="space-y-0.5 text-right">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Creditor</span>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {instruction.toMemberName}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Settled Amount (₹)" required>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Settled Date" required>
              <Input
                type="date"
                value={settledDate}
                onChange={(e) => setSettledDate(e.target.value)}
                required
              />
            </FormField>
          </div>

          <FormField label="Settlement Method" required>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
              <option value="Bank Transfer">Bank Transfer (IMPS / NEFT)</option>
              <option value="Cash">Cash Handover</option>
              <option value="Credit Card Settlement">Credit Card Settlement</option>
              <option value="Other">Other</option>
            </select>
          </FormField>

          <FormField label="Notes (Optional)">
            <Input
              type="text"
              placeholder="e.g. Cleared via UPI transaction #12345"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </FormField>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Confirming...' : 'Confirm Settle Up'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
