import React, { useState } from 'react'
import { X, Palmtree, AlertCircle } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { tripsApi } from '../api/tripsApi'
import type { CreateTripPayload } from '../types'

export interface AddTripModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (tripId: string) => void
}

export const AddTripModal: React.FC<AddTripModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 4)
    return d.toISOString().slice(0, 10)
  })
  const [budget, setBudget] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Please enter a trip name.')
      return
    }

    if (!destination.trim()) {
      setError('Please enter a destination.')
      return
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be on or after start date.')
      return
    }

    const numBudget = budget ? parseFloat(budget) : null
    if (numBudget !== null && (isNaN(numBudget) || numBudget < 0)) {
      setError('Please enter a valid budget amount.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: CreateTripPayload = {
        name: name.trim(),
        destination: destination.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        budget: numBudget,
      }

      const created = await tripsApi.createTrip(payload)
      onSuccess(created.id)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create trip.'
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
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Palmtree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Plan New Trip
              </h2>
              <p className="text-xs text-slate-500">
                Track shared travel expenses, advances & debt settlements
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

          <FormField label="Trip Name" required>
            <Input
              type="text"
              placeholder="e.g. Goa Vacation, Manali Trek"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Destination" required>
            <Input
              type="text"
              placeholder="e.g. North Goa, India"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date" required>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </FormField>

            <FormField label="End Date" required>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </FormField>
          </div>

          <FormField label="Total Trip Budget (₹ Optional)">
            <Input
              type="number"
              min="0"
              step="100"
              placeholder="e.g. 50000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </FormField>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Trip'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
