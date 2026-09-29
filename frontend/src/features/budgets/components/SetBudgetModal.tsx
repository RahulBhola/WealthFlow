import React, { useState, useEffect, useMemo } from 'react'
import { X, Sparkles, Trash2 } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { categoriesApi } from '@/features/categories/api/categoriesApi'
import type { CategoryDto } from '@/features/categories/types'
import type { CreateBudgetPayload } from '../types'
import { useCurrency, USD_TO_INR_RATE } from '../../../context/CurrencyContext'

export interface SetBudgetModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: CreateBudgetPayload) => Promise<void>
  initialCategoryId?: string
  initialBudgetId?: string
  initialLimit?: number
  categoryName?: string
  isLoading?: boolean
  existingCategoryIds?: string[]
  existingCategoryNames?: string[]
  onDelete?: (budgetId: string) => Promise<void>
}

export const SetBudgetModal: React.FC<SetBudgetModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialCategoryId,
  initialBudgetId,
  initialLimit,
  categoryName,
  isLoading = false,
  existingCategoryIds = [],
  existingCategoryNames = [],
  onDelete,
}) => {
  const { symbol, currency } = useCurrency()
  const [categories, setCategories] = useState<CategoryDto[]>([])
  const [categoryId, setCategoryId] = useState(initialCategoryId || '')
  const [monthlyLimit, setMonthlyLimit] = useState(() => {
    if (!initialLimit) return ''
    return currency === 'USD'
      ? Math.round(initialLimit / USD_TO_INR_RATE).toString()
      : initialLimit.toString()
  })
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const existingIdSet = useMemo(() => new Set(existingCategoryIds || []), [existingCategoryIds])
  const existingNameSet = useMemo(
    () => new Set((existingCategoryNames || []).map((n) => n.trim().toLowerCase())),
    [existingCategoryNames]
  )

  const availableCategories = useMemo(() => {
    return categories.filter((cat) => {
      // If editing an existing budget, allow this category
      if (initialCategoryId && cat.id === initialCategoryId) {
        return true
      }
      // Exclude categories already added to the board
      if (existingIdSet.has(cat.id)) {
        return false
      }
      if (existingNameSet.has(cat.name.trim().toLowerCase())) {
        return false
      }
      // Filter out non-expense system categories
      const lower = cat.name.trim().toLowerCase()
      if (lower === 'income' || lower === 'transfers' || lower === 'transfer') {
        return false
      }
      return true
    })
  }, [categories, existingIdSet, existingNameSet, initialCategoryId])

  // Synchronize categoryId selection whenever availableCategories changes
  useEffect(() => {
    if (!initialCategoryId) {
      if (availableCategories.length > 0) {
        if (!categoryId || !availableCategories.some((c) => c.id === categoryId)) {
          setCategoryId(availableCategories[0].id)
        }
      } else {
        setCategoryId('')
      }
    }
  }, [availableCategories, categoryId, initialCategoryId])

  useEffect(() => {
    if (isOpen) {
      setCategoryId(initialCategoryId || '')
      const initialDisplayLimit = initialLimit
        ? currency === 'USD'
          ? Math.round(initialLimit / USD_TO_INR_RATE).toString()
          : initialLimit.toString()
        : ''
      setMonthlyLimit(initialDisplayLimit)
      setError(null)

      let ignore = false
      async function fetchCategories() {
        try {
          setLoadingCategories(true)
          const list = await categoriesApi.getCategories()
          if (!ignore) {
            setCategories(list)
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
  }, [isOpen, initialCategoryId, initialLimit, currency])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const limitNum = parseFloat(monthlyLimit)

    if (!categoryId) {
      setError(
        availableCategories.length === 0
          ? 'All categories already have an active budget.'
          : 'Please select a category.'
      )
      return
    }

    if (isNaN(limitNum) || limitNum <= 0) {
      setError(`Please enter a valid monthly budget limit greater than ${symbol}0.`)
      return
    }

    try {
      setError(null)
      const finalLimitInINR = currency === 'USD' ? Math.round(limitNum * USD_TO_INR_RATE) : limitNum
      await onSubmit({
        categoryId,
        monthlyLimit: finalLimitInINR,
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
            ) : availableCategories.length > 0 ? (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={loadingCategories || Boolean(initialCategoryId)}
                className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
                All expense categories already have an active budget on the board. You can adjust any category limit directly using &quot;Adjust Limit&quot; on its envelope card.
              </div>
            )}
          </FormField>

          {/* Monthly Limit */}
          <FormField
            label={`Monthly Spending Limit (${currency})`}
            required
            helperText="Maximum allowed expenditures for this envelope each calendar month."
          >
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-medium text-slate-400">
                {symbol}
              </span>
              <Input
                type="number"
                step="any"
                min="1"
                placeholder={currency === 'USD' ? 'e.g. 250' : 'e.g. 15000'}
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
              {(currency === 'USD' ? [50, 100, 250, 500, 1000] : [2000, 5000, 10000, 20000, 50000]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMonthlyLimit(preset.toString())}
                  className="px-2.5 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  {symbol}{preset.toLocaleString(currency === 'USD' ? 'en-US' : 'en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            {initialBudgetId && onDelete ? (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(`Are you sure you want to remove the budget for ${categoryName || 'this category'}?`)) {
                    await onDelete(initialBudgetId)
                    onClose()
                  }
                }}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Budget</span>
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                disabled={!initialCategoryId && availableCategories.length === 0}
              >
                {initialCategoryId ? 'Update Budget' : 'Save Budget'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
