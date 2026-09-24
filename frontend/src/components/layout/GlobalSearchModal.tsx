import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  LayoutDashboard,
  Landmark,
  Receipt,
  PieChart,
  CreditCard,
  HandCoins,
  TrendingUp,
  Compass,
  ShieldCheck,
  PlusCircle,
  X,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchItem {
  id: string
  title: string
  category: 'Pages' | 'Actions' | 'Financial Modules'
  path: string
  icon: React.ElementType
  keywords: string[]
}

const SEARCH_ITEMS: SearchItem[] = [
  {
    id: 'dashboard',
    title: 'Executive Dashboard',
    category: 'Pages',
    path: '/dashboard',
    icon: LayoutDashboard,
    keywords: ['dashboard', 'net worth', 'liquid balance', 'cash flow', 'overview', 'home'],
  },
  {
    id: 'accounts',
    title: 'Bank Accounts & Depositories',
    category: 'Pages',
    path: '/accounts',
    icon: Landmark,
    keywords: ['accounts', 'bank', 'hdfc', 'sbi', 'icici', 'depository', 'balance', 'reconcile'],
  },
  {
    id: 'ledger',
    title: 'Transactions & Ledger',
    category: 'Pages',
    path: '/ledger',
    icon: Receipt,
    keywords: ['transactions', 'ledger', 'expenses', 'income', 'receipts', 'spending', 'history'],
  },
  {
    id: 'budgets',
    title: 'Budgets & Spending Limits',
    category: 'Pages',
    path: '/budgets',
    icon: PieChart,
    keywords: ['budgets', 'limits', 'categories', 'dining', 'food', 'groceries', 'thresholds'],
  },
  {
    id: 'credit-cards',
    title: 'Credit Cards & Liabilities',
    category: 'Pages',
    path: '/credit-cards',
    icon: CreditCard,
    keywords: ['credit card', 'cards', 'liability', 'bill payment', 'due date', 'limit'],
  },
  {
    id: 'loans',
    title: 'Loans & Bilateral Debts',
    category: 'Pages',
    path: '/loans',
    icon: HandCoins,
    keywords: ['loans', 'borrowed', 'lent', 'repayments', 'gifts', 'debts', 'liabilities'],
  },
  {
    id: 'investments',
    title: 'Investments & Joint SIPs',
    category: 'Pages',
    path: '/investments',
    icon: TrendingUp,
    keywords: ['investments', 'sip', 'mutual funds', 'portfolio', 'stocks', 'equity', 'reconciliation'],
  },
  {
    id: 'trips',
    title: 'Group Trips & Debt Settlement',
    category: 'Pages',
    path: '/trips',
    icon: Compass,
    keywords: ['trips', 'split', 'settle', 'group', 'travel', 'roommates', 'greedy debt'],
  },
  {
    id: 'admin',
    title: 'Admin ERP Command Center',
    category: 'Pages',
    path: '/admin',
    icon: ShieldCheck,
    keywords: ['admin', 'erp', 'audit logs', 'database monitor', 'security', 'users', 'system'],
  },
  {
    id: 'add-expense',
    title: 'Record New Expense',
    category: 'Actions',
    path: '/ledger',
    icon: PlusCircle,
    keywords: ['add expense', 'new transaction', 'pay', 'spend', 'record'],
  },
  {
    id: 'add-account',
    title: 'Add Bank Account',
    category: 'Actions',
    path: '/accounts',
    icon: PlusCircle,
    keywords: ['new account', 'add bank', 'savings', 'checking'],
  },
  {
    id: 'create-trip',
    title: 'Create Group Trip',
    category: 'Actions',
    path: '/trips',
    icon: PlusCircle,
    keywords: ['new trip', 'plan travel', 'shared trip'],
  },
]

export interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onNavigate?: (path: string) => void
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Filter items based on query
  const filteredItems = query.trim() === ''
    ? SEARCH_ITEMS
    : SEARCH_ITEMS.filter((item) => {
        const q = query.toLowerCase()
        return (
          item.title.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.toLowerCase().includes(q))
        )
      })

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleSelect = (item: SearchItem) => {
    if (onNavigate) {
      onNavigate(item.path)
    } else if (typeof window !== 'undefined') {
      window.location.href = item.path
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Search modules, transactions, accounts, actions..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching pages or actions found for "{query}"
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon
              const isSelected = index === selectedIndex

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-left',
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-lg text-sm shrink-0',
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {item.category} • {item.path}
                      </span>
                    </div>
                  </div>

                  <ArrowRight
                    className={cn(
                      'w-3.5 h-3.5 transition-transform shrink-0',
                      isSelected ? 'translate-x-0.5 text-indigo-600 dark:text-indigo-400' : 'opacity-0'
                    )}
                  />
                </div>
              )
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Use <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-[9px]">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-[9px]">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-[9px]">Enter</kbd> to select
            </span>
          </div>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-[9px]">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  )
}
