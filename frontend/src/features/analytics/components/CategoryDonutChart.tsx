import React, { useState } from 'react'
import type { CategorySpendingBreakdownDto } from '../types'
import { Badge } from '@/components/ui/Badge'
import { Dumbbell, Shirt } from 'lucide-react'
import { useCurrency } from '../../../context/CurrencyContext'

export interface CategoryDonutChartProps {
  categories: CategorySpendingBreakdownDto[]
  className?: string
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({ categories, className }) => {
  const { formatCurrency } = useCurrency()
  const formatINR = (val: number) => formatCurrency(val, { maximumFractionDigits: 0 })
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const totalSpent = categories.reduce((sum, c) => sum + (c.amount ?? (c as any).Amount ?? 0), 0)

  if (!categories || categories.length === 0 || totalSpent === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
        No spending breakdown data recorded for this cycle.
      </div>
    )
  }

  // Calculate donut arcs
  const radius = 80
  const strokeWidth = 28
  const center = 100
  const circumference = 2 * Math.PI * radius

  let cumulativePercent = 0
  const segments = categories.map((cat, idx) => {
    const rawAmt = cat.amount ?? (cat as any).Amount ?? 0
    const pct = totalSpent > 0 ? (rawAmt / totalSpent) * 100 : 0
    const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`
    const strokeDashoffset = -((cumulativePercent / 100) * circumference)
    cumulativePercent += pct

    const color = cat.colorHex || (cat as any).ColorHex || `hsl(${(idx * 55) % 360}, 70%, 55%)`

    return {
      cat,
      pct: Math.round(pct * 10) / 10,
      amount: rawAmt,
      color,
      strokeDasharray,
      strokeDashoffset,
    }
  })

  const activeCategory = hoveredIdx !== null ? segments[hoveredIdx] : null

  return (
    <div className={`grid grid-cols-1 md:grid-cols-12 gap-6 items-center ${className || ''}`}>
      {/* SVG Donut Center */}
      <div className="md:col-span-5 flex flex-col items-center justify-center relative">
        <svg viewBox="0 0 200 200" className="w-48 h-48 transform -rotate-90 select-none">
          {/* Background circle track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            className="text-slate-100 dark:text-slate-800"
            strokeWidth={strokeWidth}
          />

          {segments.map((seg, idx) => (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth={hoveredIdx === idx ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={seg.strokeDashoffset}
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            {activeCategory ? activeCategory.cat.categoryName : 'Total Outflow'}
          </span>
          <span className="text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {formatINR(activeCategory ? activeCategory.amount : totalSpent)}
          </span>
          {activeCategory && (
            <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
              {activeCategory.pct}%
            </span>
          )}
        </div>
      </div>

      {/* Category Items List with Specialized Tags */}
      <div className="md:col-span-7 space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {segments.map((seg, idx) => {
          const isHovered = hoveredIdx === idx
          const cat = seg.cat

          return (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                isHovered
                  ? 'bg-slate-50 dark:bg-slate-800/80 border-indigo-400 dark:border-indigo-500 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: seg.color }}
                />
                <div className="truncate">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {cat.categoryName}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {cat.isSpecialProtein && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Dumbbell className="w-2.5 h-2.5" /> Protein
                      </span>
                    )}
                    {cat.isSpecialClothing && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                        <Shirt className="w-2.5 h-2.5" /> Lifestyle
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right font-mono tabular-nums">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {formatINR(seg.amount)}
                  </div>
                </div>
                <Badge variant={isHovered ? 'indigo' : 'slate'} size="sm">
                  {seg.pct}%
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
