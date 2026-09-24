import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react'

export type CurrencyCode = 'INR' | 'USD'

export interface CurrencyContextValue {
  currency: CurrencyCode
  setCurrency: (code: CurrencyCode) => void
  symbol: string
  rate: number
  formatCurrency: (amountInINR: number, options?: { decimals?: number }) => string
  convertAmount: (amountInINR: number) => number
}

// Fixed standard exchange rate: 1 USD = 83.5 INR
export const USD_TO_INR_RATE = 83.5

export const formatINRRaw = (val: number, decimals: number = 2) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val)
}

export const formatUSDRaw = (val: number, decimals: number = 2) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val)
}

const defaultContext: CurrencyContextValue = {
  currency: 'INR',
  setCurrency: () => {},
  symbol: '₹',
  rate: 1,
  formatCurrency: (amountInINR: number, options?: { decimals?: number }) => {
    return formatINRRaw(amountInINR, options?.decimals ?? 2)
  },
  convertAmount: (amountInINR: number) => amountInINR,
}

export const CurrencyContext = createContext<CurrencyContextValue>(defaultContext)

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('wealthflow_currency') : null
    return saved === 'USD' ? 'USD' : 'INR'
  })

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'wealthflow_currency' && (e.newValue === 'INR' || e.newValue === 'USD')) {
        setCurrencyState(e.newValue as CurrencyCode)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code)
    try {
      localStorage.setItem('wealthflow_currency', code)
      window.dispatchEvent(new Event('wealthflow_currency_change'))
    } catch {
      // Ignore in storage-restricted environments
    }
  }

  useEffect(() => {
    const handleCustomChange = () => {
      const saved = localStorage.getItem('wealthflow_currency')
      if (saved === 'USD' || saved === 'INR') {
        setCurrencyState(saved)
      }
    }
    window.addEventListener('wealthflow_currency_change', handleCustomChange)
    return () => window.removeEventListener('wealthflow_currency_change', handleCustomChange)
  }, [])

  const value = useMemo<CurrencyContextValue>(() => {
    const isUSD = currency === 'USD'
    const symbol = isUSD ? '$' : '₹'
    const rate = isUSD ? 1 / USD_TO_INR_RATE : 1

    return {
      currency,
      setCurrency,
      symbol,
      rate,
      convertAmount: (amountInINR: number) => {
        return isUSD ? amountInINR / USD_TO_INR_RATE : amountInINR
      },
      formatCurrency: (amountInINR: number, options?: { decimals?: number }) => {
        const decimals = options?.decimals ?? 2
        if (isUSD) {
          const usdVal = amountInINR / USD_TO_INR_RATE
          return formatUSDRaw(usdVal, decimals)
        }
        return formatINRRaw(amountInINR, decimals)
      },
    }
  }, [currency])

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext)
  return ctx || defaultContext
}
