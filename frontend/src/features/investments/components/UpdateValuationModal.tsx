import React, { useState, useEffect } from 'react'
import { X, RefreshCw, AlertCircle } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { investmentsApi } from '../api/investmentsApi'
import type { Investment, UpdateValuationPayload } from '../types'

export interface UpdateValuationModalProps {
  investment: Investment | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

import { useCurrency } from '../../../context/CurrencyContext'

export const UpdateValuationModal: React.FC<UpdateValuationModalProps> = ({
  investment,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { formatCurrency } = useCurrency()
  const formatINR = formatCurrency
  const [currentValuation, setCurrentValuation] = useState('')
  const [units, setUnits] = useState('')
  const [valuationDate, setValuationDate] = useState(() => new Date().toISOString().slice(0, 10))

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (investment && isOpen) {
      setCurrentValuation(investment.currentValuation.toString())
      setUnits(investment.units ? investment.units.toString() : '0')
      setValuationDate(new Date().toISOString().slice(0, 10))
      setError(null)
    }
  }, [investment, isOpen])

  if (!isOpen || !investment) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const numValuation = parseFloat(currentValuation)
    const numUnits = parseFloat(units)

    if (isNaN(numValuation) || numValuation < 0) {
      setError('Please enter a valid current valuation.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: UpdateValuationPayload = {
        currentValuation: numValuation,
        units: isNaN(numUnits) ? 0 : numUnits,
        valuationDate: new Date(valuationDate).toISOString(),
      }

      await investmentsApi.updateValuation(investment.id, payload)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update valuation.'
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
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Update Asset Valuation
              </h2>
              <p className="text-xs text-slate-500 truncate max-w-xs">{investment.name}</p>
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

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs flex justify-between">
            <span className="text-slate-500">Invested Capital:</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              {formatINR(investment.investedAmount)}
            </span>
          </div>

          <FormField label="Updated Current Valuation (₹)" required>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={currentValuation}
              onChange={(e) => setCurrentValuation(e.target.value)}
              required
              autoFocus
            />
          </FormField>

          <FormField label="Units / Quantity">
            <Input
              type="number"
              step="0.0001"
              placeholder="0.0000"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
            />
          </FormField>

          <FormField label="Valuation Date" required>
            <Input
              type="date"
              value={valuationDate}
              onChange={(e) => setValuationDate(e.target.value)}
              required
            />
          </FormField>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Save Valuation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
