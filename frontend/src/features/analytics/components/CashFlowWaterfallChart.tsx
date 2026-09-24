import React, { useState } from 'react'
import type { CashFlowWaterfallStepDto } from '../types'
import { useCurrency } from '../../../context/CurrencyContext'

export interface CashFlowWaterfallChartProps {
  steps: CashFlowWaterfallStepDto[]
  className?: string
}

export const CashFlowWaterfallChart: React.FC<CashFlowWaterfallChartProps> = ({ steps, className }) => {
  const { formatCurrency } = useCurrency()
  const formatINR = (val: number) => formatCurrency(val, { maximumFractionDigits: 0 })
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (!steps || steps.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
        No cash flow waterfall simulation data available.
      </div>
    )
  }

  const width = 640
  const height = 220
  const paddingX = 40
  const paddingY = 30
  const barWidth = Math.min(60, (width - paddingX * 2) / (steps.length * 1.5))

  const runningValues = steps.map((s) => s.runningBalance)
  const maxVal = Math.max(...runningValues, 100000) * 1.15
  const minVal = 0
  const range = maxVal - minVal || 1

  const getY = (val: number) => {
    return height - paddingY - (Math.max(0, val) / range) * (height - paddingY * 2)
  }

  const getStepColor = (stepType: string) => {
    switch (stepType) {
      case 'Opening':
        return '#0284C7' // Sky
      case 'Inflow':
        return '#10B981' // Emerald
      case 'Expense':
        return '#F43F5E' // Rose
      case 'DebtPayoff':
        return '#E11D48' // Crimson Rose
      case 'Investment':
        return '#8B5CF6' // Violet
      case 'Ending':
        return '#4F46E5' // Indigo
      default:
        return '#64748B'
    }
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div className="overflow-x-auto pb-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 min-w-[500px] select-none">
          {/* Horizontal Reference Baseline */}
          <line
            x1={paddingX}
            y1={getY(0)}
            x2={width - paddingX}
            y2={getY(0)}
            stroke="#94A3B8"
            strokeWidth="1"
            opacity="0.4"
          />

          {/* Reference Ticks */}
          {[0, maxVal * 0.5, maxVal * 0.9].map((val, i) => (
            <g key={i}>
              <line
                x1={paddingX}
                y1={getY(val)}
                x2={width - paddingX}
                y2={getY(val)}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={paddingX - 6}
                y={getY(val) + 3}
                textAnchor="end"
                className="text-[9px] fill-slate-400 font-mono"
              >
                {formatINR(val)}
              </text>
            </g>
          ))}

          {/* Waterfall Bars & Connectors */}
          {steps.map((step, idx) => {
            const stepX = paddingX + idx * ((width - paddingX * 2) / steps.length) + 10
            const isFloating = step.stepType !== 'Opening' && step.stepType !== 'Ending'
            const prevRunning = idx > 0 ? steps[idx - 1].runningBalance : 0

            const barTop = isFloating
              ? getY(Math.max(prevRunning, step.runningBalance))
              : getY(step.runningBalance)
            const barBottom = isFloating
              ? getY(Math.min(prevRunning, step.runningBalance))
              : getY(0)
            const barHeight = Math.max(4, barBottom - barTop)

            const color = getStepColor(step.stepType)
            const isHovered = hoveredIdx === idx

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Connector line to next step */}
                {idx < steps.length - 1 && (
                  <line
                    x1={stepX + barWidth}
                    y1={getY(step.runningBalance)}
                    x2={paddingX + (idx + 1) * ((width - paddingX * 2) / steps.length) + 10}
                    y2={getY(step.runningBalance)}
                    stroke="#94A3B8"
                    strokeDasharray="2 2"
                    strokeWidth="1.5"
                    opacity="0.6"
                  />
                )}

                {/* Step Bar */}
                <rect
                  x={stepX}
                  y={barTop}
                  width={barWidth}
                  height={barHeight}
                  rx="4"
                  fill={color}
                  opacity={isHovered ? 1 : 0.85}
                  className="transition-all duration-150"
                />

                {/* Step Delta Value Label */}
                <text
                  x={stepX + barWidth / 2}
                  y={barTop - 6}
                  textAnchor="middle"
                  className={`text-[9px] font-mono tabular-nums font-bold ${
                    isHovered ? 'fill-slate-900 dark:fill-white font-extrabold' : 'fill-slate-500'
                  }`}
                >
                  {step.amount > 0 && isFloating ? `+${formatINR(step.amount)}` : formatINR(step.amount)}
                </text>

                {/* Step Name X-Axis Label */}
                <text
                  x={stepX + barWidth / 2}
                  y={height - 10}
                  textAnchor="middle"
                  className={`text-[9px] font-medium select-none truncate ${
                    isHovered ? 'fill-indigo-600 dark:fill-indigo-400 font-bold' : 'fill-slate-400'
                  }`}
                >
                  {step.stepName.split(' ')[0]}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Breakdown Strip below chart */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`p-2 rounded-xl border text-center font-mono ${
              hoveredIdx === i
                ? 'bg-slate-100 dark:bg-slate-800 border-indigo-400'
                : 'bg-slate-50/60 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="text-[10px] text-slate-500 font-sans truncate">{s.stepName}</div>
            <div className="font-bold text-slate-900 dark:text-white tabular-nums text-xs mt-0.5">
              {formatINR(s.runningBalance)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
