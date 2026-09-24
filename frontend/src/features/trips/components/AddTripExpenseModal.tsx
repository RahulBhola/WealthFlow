import React, { useState } from 'react'
import { X, Receipt, AlertCircle } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { SplitEditor } from './SplitEditor'
import { tripsApi } from '../api/tripsApi'
import { useCurrency } from '../../../context/CurrencyContext'
import type { TripMember, CreateTripExpensePayload, SplitInput } from '../types'

export interface AddTripExpenseModalProps {
  isOpen: boolean
  tripId: string
  members: TripMember[]
  initialPayerId?: string
  guestToken?: string
  onClose: () => void
  onSuccess: () => void
}

export const AddTripExpenseModal: React.FC<AddTripExpenseModalProps> = ({
  isOpen,
  tripId,
  members,
  initialPayerId,
  guestToken,
  onClose,
  onSuccess,
}) => {
  const { symbol } = useCurrency()
  const [payerMemberId, setPayerMemberId] = useState(
    initialPayerId || (members.length > 0 ? members[0].id : '')
  )
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))

  const [splitType, setSplitType] = useState<string>('Equal')
  const [splits, setSplits] = useState<SplitInput[]>([])
  const [isSplitValid, setIsSplitValid] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const numAmount = parseFloat(amount) || 0

  const handleSplitChange = (
    newSplitType: string,
    newSplits: SplitInput[],
    isValid: boolean
  ) => {
    setSplitType(newSplitType)
    setSplits(newSplits)
    setIsSplitValid(isValid)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!payerMemberId) {
      setError('Please select who paid for the expense.')
      return
    }

    if (!description.trim()) {
      setError('Please enter a description for the expense.')
      return
    }

    if (numAmount <= 0) {
      setError('Please enter an amount greater than zero.')
      return
    }

    if (!isSplitValid) {
      setError('Please ensure participant splits are valid and balanced.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: CreateTripExpensePayload = {
        payerMemberId,
        amount: numAmount,
        expenseDate: new Date(expenseDate).toISOString(),
        description: description.trim(),
        splitType: splitType as 'Equal' | 'Unequal' | 'Percentage' | 'Shares',
        splits,
      }

      if (guestToken) {
        await tripsApi.addGuestExpense(tripId, guestToken, payload)
      } else {
        await tripsApi.addExpense(tripId, payload)
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record expense.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Add Trip Expense
              </h2>
              <p className="text-xs text-slate-500">
                Record payment and allocate shares among participants
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Paid By" required>
              <select
                value={payerMemberId}
                onChange={(e) => setPayerMemberId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.guestName}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={`Amount (${symbol})`} required>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g. 2400"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Description" required>
              <Input
                type="text"
                placeholder="e.g. Seafood Dinner, Scuba Diving, Taxi"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Date" required>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </FormField>
          </div>

          {/* Split Mode Section */}
          <div className="pt-2">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Split Breakdown:
            </div>
            <SplitEditor
              members={members}
              totalAmount={numAmount}
              initialSplitType="Equal"
              onChange={handleSplitChange}
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !isSplitValid || numAmount <= 0}
            >
              {isSubmitting ? 'Recording...' : 'Record Expense'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
