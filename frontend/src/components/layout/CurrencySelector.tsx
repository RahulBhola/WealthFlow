import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrency, CurrencyCode } from '../../context/CurrencyContext'

export interface CurrencyOption {
  code: CurrencyCode
  symbol: string
  name: string
  flagType: 'in' | 'us'
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flagType: 'in' },
  { code: 'USD', symbol: '$', name: 'US Dollar', flagType: 'us' },
]

export const FlagIcon: React.FC<{ type: CurrencyOption['flagType']; className?: string }> = ({
  type,
  className = 'w-4 h-4',
}) => {
  if (type === 'in') {
    return (
      <svg viewBox="0 0 36 36" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="circle-clip-in">
            <circle cx="18" cy="18" r="18" />
          </clipPath>
        </defs>
        <g clipPath="url(#circle-clip-in)">
          <rect x="0" y="0" width="36" height="12" fill="#FF9933" />
          <rect x="0" y="12" width="36" height="12" fill="#FFFFFF" />
          <rect x="0" y="24" width="36" height="12" fill="#138808" />
          <circle cx="18" cy="18" r="4.5" fill="none" stroke="#000080" strokeWidth="1" />
          <circle cx="18" cy="18" r="1.2" fill="#000080" />
        </g>
      </svg>
    )
  }

  // US flag
  return (
    <svg viewBox="0 0 36 36" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="circle-clip-us">
          <circle cx="18" cy="18" r="18" />
        </clipPath>
      </defs>
      <g clipPath="url(#circle-clip-us)">
        <rect x="0" y="0" width="36" height="36" fill="#B22234" />
        <rect x="0" y="5" width="36" height="4" fill="#FFFFFF" />
        <rect x="0" y="13" width="36" height="4" fill="#FFFFFF" />
        <rect x="0" y="21" width="36" height="4" fill="#FFFFFF" />
        <rect x="0" y="29" width="36" height="4" fill="#FFFFFF" />
        <rect x="0" y="0" width="18" height="19" fill="#3C3B6E" />
        <circle cx="9" cy="9.5" r="2.5" fill="#FFFFFF" />
      </g>
    </svg>
  )
}

export const CurrencySelector: React.FC = () => {
  const { currency, setCurrency } = useCurrency()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedCurrency = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (code: CurrencyCode) => {
    setCurrency(code)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Select base currency"
        aria-expanded={isOpen}
        className="px-2 sm:px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60 flex items-center gap-1 sm:gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors shadow-xs dark:shadow-sm cursor-pointer shrink-0"
      >
        <FlagIcon type={selectedCurrency.flagType} className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline font-semibold">
          {selectedCurrency.code}
        </span>
        <span className="font-semibold">{selectedCurrency.symbol}</span>
        <ChevronDown
          className={cn(
            'w-3 h-3 text-slate-500 dark:text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180 text-slate-700 dark:text-slate-200'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl p-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
            Display Currency
          </div>
          <div className="py-1">
            {CURRENCIES.map((curr) => {
              const isSelected = curr.code === currency
              return (
                <button
                  key={curr.code}
                  type="button"
                  onClick={() => handleSelect(curr.code)}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left',
                    isSelected
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FlagIcon type={curr.flagType} className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {curr.code} ({curr.symbol})
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
