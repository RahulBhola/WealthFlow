import React, { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { categoriesApi } from '@/features/categories/api/categoriesApi'
import type { CategoryDto } from '@/features/categories/types'
import type { CreateBudgetPayload } from '../types'

export interface SetBudgetModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: CreateBudgetPayload) => Promise<void>
  initialCategoryId?: string
  initialLimit?: number
  categoryName?: string
  isLoading?: boolean
}

export const SetBudgetModal: React.FC<SetBudgetModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialCategoryId,
  initialLimit,
  categoryName,
  isLoading = false,
}) => {
  const [categories, setCategories] = useState<CategoryDto[]>([])
  const [categoryId, setCategoryId] = useState(initialCategoryId || '')
  const [monthlyLimit, setMonthlyLimit] = useState(initialLimit ? initialLimit.toString() : '')
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setCategoryId(initialCategoryId || '')
      setMonthlyLimit(initialLimit ? initialLimit.toString() : '')
      setError(null)

      let ignore = false
      async function fetchCategories() {
        try {
          setLoadingCategories(true)
          const list = await categoriesApi.getCategories()
          if (!ignore) {
            setCategories(list)
            if (!initialCategoryId && list.length > 0) {
              setCategoryId(list[0].id)
            }
          }
        } catch (err) {
          console.error('Failed to load categories:', err)
        } finally {
          if (!ignore) setLoadingCategories(false)
        }
      }
      fetchCategories()

      return () => {
        ignore = true
      }
    }
  }, [isOpen, initialCategoryId, initialLimit])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const limitNum = parseFloat(monthlyLimit)

    if (!categoryId) {
      setError('Please select a category.')
      return
    }

    if (isNaN(limitNum) || limitNum <= 0) {
      setError('Please enter a valid monthly budget limit greater than ₹0.')
      return
    }

    try {
      setError(null)
      await onSubmit({
        categoryId,
        monthlyLimit: limitNum,
        period: 'Month',
      })
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to save category budget.')
      }
    }
  }

  const selectedCategoryObj = categories.find((c) => c.id === categoryId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {initialCategoryId ? 'Adjust Category Budget' : 'Set Category Budget'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Define monthly spending caps and monitor live envelope utilization
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {error}
            </div>
          )}

          {/* Educational Callout */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Automated Threshold Guard:</span> You will receive real-time alerts when category spend reaches 80% (Warning) and 100% (Exceeded).
            </div>
          </div>

          {/* Category Dropdown */}
          <FormField label="Expense Category" required>
            {initialCategoryId && categoryName ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedCategoryObj?.colorTag || '#6366F1' }}
                />
                {categoryName}
              </div>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={loadingCategories || Boolean(initialCategoryId)}
                className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          {/* Monthly Limit */}
          <FormField
            label="Monthly Spending Limit (INR)"
            required
            helperText="Maximum allowed expenditures for this envelope each calendar month."
          >
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-medium text-slate-400">
                ₹
              </span>
              <Input
                type="number"
                step="100"
                min="1"
                placeholder="e.g. 15000"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                className="pl-8"
                required
              />
            </div>
          </FormField>

          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-500">Quick Envelopes:</span>
            <div className="flex flex-wrap gap-2">
              {[2000, 5000, 10000, 20000, 50000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMonthlyLimit(preset.toString())}
                  className="px-2.5 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  ₹{preset.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              {initialCategoryId ? 'Update Budget' : 'Save Budget'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
