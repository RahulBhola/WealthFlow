import React, { useState } from 'react'
import { X, UserPlus, AlertCircle } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { tripsApi } from '../api/tripsApi'
import type { AddTripMemberPayload } from '../types'

export interface AddTripMemberModalProps {
  isOpen: boolean
  tripId: string
  onClose: () => void
  onSuccess: () => void
}

export const AddTripMemberModal: React.FC<AddTripMemberModalProps> = ({
  isOpen,
  tripId,
  onClose,
  onSuccess,
}) => {
  const [guestName, setGuestName] = useState('')
  const [canAddExpenses, setCanAddExpenses] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!guestName.trim()) {
      setError('Please enter a participant name.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: AddTripMemberPayload = {
        guestName: guestName.trim(),
        canAddExpenses,
      }

      await tripsApi.addMember(tripId, payload)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add participant.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Add Trip Participant
              </h2>
              <p className="text-xs text-slate-500">
                Invite friends or companions to track expenses
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
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <FormField label="Participant Name" required>
            <Input
              type="text"
              placeholder="e.g. Priya Sharma, Vikram, Alex"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
            />
          </FormField>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                Allow Adding Expenses
              </span>
              <span className="text-[11px] text-slate-500">
                Participant can enter expenses via guest link
              </span>
            </div>
            <input
              type="checkbox"
              checked={canAddExpenses}
              onChange={(e) => setCanAddExpenses(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Participant'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
