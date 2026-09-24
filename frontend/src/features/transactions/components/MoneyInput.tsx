import React from 'react'
import { useCurrency } from '../../../context/CurrencyContext'

export interface MoneyInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  autoFocus?: boolean
  disabled?: boolean
  className?: string
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  placeholder = '0.00',
  autoFocus = false,
  disabled = false,
  className = '',
}) => {
  const { symbol } = useCurrency()
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value
    // Allow digits and up to one decimal point with 2 decimals
    if (/^\d*\.?\d{0,2}$/.test(input) || input === '') {
      onChange(input)
    }
  }

  return (
    <div
      className={`relative flex items-center w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all ${className}`}
    >
      <span className="font-mono text-2xl font-bold text-slate-400 dark:text-slate-500 select-none mr-2">
        {symbol}
      </span>
      <input
        type="text"
        inputMode="decimal"
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-transparent font-mono text-2xl font-bold text-slate-900 dark:text-slate-50 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none tabular-nums"
      />
    </div>
  )
}
