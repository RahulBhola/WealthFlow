import React, { useState } from 'react'
import { X, TrendingUp, AlertCircle } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { investmentsApi } from '../api/investmentsApi'
import type { CreateInvestmentPayload } from '../types'

export interface AddInvestmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const ASSET_CLASSES = [
  'Mutual Fund',
  'Stock',
  'Fixed Deposit',
  'Gold',
  'PPF',
  'Real Estate',
  'Other',
]

export const AddInvestmentModal: React.FC<AddInvestmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('')
  const [assetClass, setAssetClass] = useState('Mutual Fund')
  const [investedAmount, setInvestedAmount] = useState('')
  const [currentValuation, setCurrentValuation] = useState('')
  const [units, setUnits] = useState('')
  const [valuationDate, setValuationDate] = useState(() => new Date().toISOString().slice(0, 10))

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleInvestedChange = (val: string) => {
    setInvestedAmount(val)
    if (!currentValuation) {
      setCurrentValuation(val)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Please enter an investment name.')
      return
    }

    const numInvested = parseFloat(investedAmount)
    const numValuation = parseFloat(currentValuation)
    const numUnits = units ? parseFloat(units) : 0

    if (isNaN(numInvested) || numInvested <= 0) {
      setError('Please enter a valid invested amount greater than zero.')
      return
    }

    if (isNaN(numValuation) || numValuation < 0) {
      setError('Please enter a valid current valuation.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: CreateInvestmentPayload = {
        name: name.trim(),
        assetClass,
        investedAmount: numInvested,
        currentValuation: numValuation,
        units: isNaN(numUnits) ? 0 : numUnits,
        valuationDate: new Date(valuationDate).toISOString(),
      }

      await investmentsApi.createInvestment(payload)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create investment.'
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
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Add Investment Asset
              </h2>
              <p className="text-xs text-slate-500">Track mutual funds, stocks, gold, or FDs</p>
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

          <FormField label="Asset / Fund Name" required>
            <Input
              type="text"
              placeholder="e.g. Parag Parikh Flexi Cap Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Asset Class" required>
              <select
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ASSET_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Units / Quantity">
              <Input
                type="number"
                step="0.0001"
                placeholder="e.g. 150.45"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Invested Amount (₹)" required>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={investedAmount}
                onChange={(e) => handleInvestedChange(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Current Valuation (₹)" required>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={currentValuation}
                onChange={(e) => setCurrentValuation(e.target.value)}
                required
              />
            </FormField>
          </div>

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
              {isSubmitting ? 'Adding Asset...' : 'Add Investment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
