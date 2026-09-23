import React, { useState } from 'react'
import { X, HandCoins, AlertCircle, Info } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { tripsApi } from '../api/tripsApi'
import type { TripMember, CreateTripAdvancePayload } from '../types'

export interface AddTripAdvanceModalProps {
  isOpen: boolean
  tripId: string
  members: TripMember[]
  onClose: () => void
  onSuccess: () => void
}

export const AddTripAdvanceModal: React.FC<AddTripAdvanceModalProps> = ({
  isOpen,
  tripId,
  members,
  onClose,
  onSuccess,
}) => {
  const [giverMemberId, setGiverMemberId] = useState(
    members.length > 0 ? members[0].id : ''
  )
  const [receiverMemberId, setReceiverMemberId] = useState(
    members.length > 1 ? members[1].id : ''
  )
  const [amount, setAmount] = useState('')
  const [advanceDate, setAdvanceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!giverMemberId || !receiverMemberId) {
      setError('Please select both the advance giver and receiver.')
      return
    }

    if (giverMemberId === receiverMemberId) {
      setError('Advance giver and receiver cannot be the same member.')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid advance amount greater than zero.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: CreateTripAdvancePayload = {
        giverMemberId,
        receiverMemberId,
        amount: numAmount,
        advanceDate: new Date(advanceDate).toISOString(),
        notes: notes.trim() || undefined,
      }

      await tripsApi.addAdvance(tripId, payload)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record travel advance.'
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
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Record Travel Advance
              </h2>
              <p className="text-xs text-slate-500">
                Pre-trip deposits and bilateral pocket money
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Critical Accounting Rule Alert */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Travel Advance Invariant:</span> Advances are bilateral
              prepayments strictly isolated from trip expense totals. Total Group Spending =
              Sum(TripExpenses) ONLY. Advances adjust net settlement credits/debits without inflating
              trip expenses.
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Given By (Giver)" required>
              <select
                value={giverMemberId}
                onChange={(e) => setGiverMemberId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.guestName}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Given To (Receiver)" required>
              <select
                value={receiverMemberId}
                onChange={(e) => setReceiverMemberId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.guestName}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Advance Amount (₹)" required>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Advance Date" required>
              <Input
                type="date"
                value={advanceDate}
                onChange={(e) => setAdvanceDate(e.target.value)}
                required
              />
            </FormField>
          </div>

          <FormField label="Notes (Optional)">
            <Input
              type="text"
              placeholder="e.g. Initial pooled cash for toll and fuel"
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
              {isSubmitting ? 'Recording...' : 'Record Advance'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
