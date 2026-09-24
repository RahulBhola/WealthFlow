import React, { useState } from 'react'
import type { NetWorthHistoryPointDto } from '../types'

export interface NetWorthAreaChartProps {
  data: NetWorthHistoryPointDto[]
  className?: string
}

const formatINR = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val)
}

export const NetWorthAreaChart: React.FC<NetWorthAreaChartProps> = ({ data, className }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No net worth historical data available.
      </div>
    )
  }

  const width = 700
  const height = 240
  const paddingX = 45
  const paddingY = 30

  const netWorths = data.map((d) => (typeof d.netWorth === 'number' && !isNaN(d.netWorth) ? d.netWorth : 0))
  const assets = data.map((d) => (typeof d.assets === 'number' && !isNaN(d.assets) ? d.assets : d.netWorth || 0))
  const liabilities = data.map((d) => (typeof d.liabilities === 'number' && !isNaN(d.liabilities) ? d.liabilities : 0))
  const allValues = [...netWorths, ...assets, ...liabilities]

  const rawMin = Math.min(...allValues, 0)
  const rawMax = Math.max(...allValues, 10000)
  const padding = (rawMax - rawMin) * 0.1 || 1000
  const minValue = Math.floor(rawMin - padding)
  const maxValue = Math.ceil(rawMax + padding)
  const range = maxValue - minValue || 1

  const getX = (index: number) => {
    if (data.length <= 1) return width / 2
    return paddingX + (index / (data.length - 1)) * (width - paddingX * 2)
  }

  const getY = (value: number) => {
    return height - paddingY - ((value - minValue) / range) * (height - paddingY * 2)
  }

  // Generate smooth cubic bezier SVG path
  const createSmoothPath = (values: number[]) => {
    const points = values.map((val, idx) => ({ x: getX(idx), y: getY(val) }))
    if (points.length === 0) return ''
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1]

      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }
    return d
  }

  const netWorthLinePath = createSmoothPath(netWorths)
  const assetsLinePath = createSmoothPath(assets)
  const liabilitiesLinePath = createSmoothPath(liabilities)

  // Area path closing at baseline
  const baselineY = getY(Math.max(0, minValue))
  const firstX = getX(0)
  const lastX = getX(data.length - 1)
  const netWorthAreaPath = `${netWorthLinePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`

  // Grid tick levels
  const ticksCount = 4
  const gridTicks = Array.from({ length: ticksCount + 1 }, (_, i) => {
    const val = minValue + (range / ticksCount) * i
    return { val, y: getY(val) }
  })

  const activePoint = hoveredIdx !== null ? data[hoveredIdx] : data[data.length - 1]
  const activeX = hoveredIdx !== null ? getX(hoveredIdx) : getX(data.length - 1)
  const activeY = hoveredIdx !== null ? getY(data[hoveredIdx].netWorth) : getY(data[data.length - 1].netWorth)

  return (
    <div className={`space-y-3 ${className || ''}`}>
      {/* Top Legend and Quick Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Net Worth</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-sky-500 border-t-2 border-dashed border-sky-400" />
            <span className="text-slate-500 dark:text-slate-400">Total Assets</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-rose-500 border-t-2 border-dashed border-rose-400" />
            <span className="text-slate-500 dark:text-slate-400">Liabilities</span>
          </div>
        </div>

        {activePoint && (
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700/60 font-mono text-xs">
            <span className="text-slate-500">{activePoint.monthName}:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {formatINR(activePoint.netWorth)}
            </span>
          </div>
        )}
      </div>

      {/* SVG Canvas Container */}
      <div className="relative w-full overflow-hidden rounded-xl bg-slate-50/50 dark:bg-slate-950/40 p-2 border border-slate-200/60 dark:border-slate-800/60">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-56 sm:h-64 overflow-visible select-none"
        >
          <defs>
            <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#6366F1" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="assetsStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={paddingX}
                y1={tick.y}
                x2={width - paddingX}
                y2={tick.y}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800/70"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={paddingX - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-500 dark:fill-slate-400 font-mono font-medium"
              >
                {formatINR(tick.val)}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path d={netWorthAreaPath} fill="url(#nwGradient)" />

          {/* Liabilities line */}
          <path
            d={liabilitiesLinePath}
            fill="none"
            stroke="#F43F5E"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.7"
          />

          {/* Assets line */}
          <path
            d={assetsLinePath}
            fill="none"
            stroke="url(#assetsStroke)"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            opacity="0.8"
          />

          {/* Main Net Worth Line */}
          <path
            d={netWorthLinePath}
            fill="none"
            stroke="#6366F1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover Column Indicator */}
          {hoveredIdx !== null && (
            <line
              x1={activeX}
              y1={paddingY}
              x2={activeX}
              y2={height - paddingY}
              stroke="#818CF8"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          )}

          {/* Active Circle Marker */}
          <circle
            cx={activeX}
            cy={activeY}
            r="6"
            className="fill-indigo-600 stroke-white dark:stroke-slate-900"
            strokeWidth="2.5"
          />
          <circle cx={activeX} cy={activeY} r="10" className="fill-indigo-500/20 animate-ping" />

          {/* Transparent interactive overlay columns for mouse tracking */}
          {data.map((_, idx) => {
            const colWidth = (width - paddingX * 2) / data.length
            const colX = getX(idx) - colWidth / 2

            return (
              <rect
                key={idx}
                x={colX}
                y={paddingY}
                width={colWidth}
                height={height - paddingY * 2}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            )
          })}

          {/* X Axis Month Labels */}
          {data.map((d, idx) => {
            // Show every month on wider screens or every 2nd on small screens
            const isVisible = idx % 2 === 0 || idx === data.length - 1
            if (!isVisible) return null

            return (
              <text
                key={idx}
                x={getX(idx)}
                y={height - 8}
                textAnchor="middle"
                className={`text-[10px] font-mono select-none font-medium ${
                  hoveredIdx === idx ? 'fill-indigo-600 dark:fill-indigo-400 font-bold' : 'fill-slate-500 dark:fill-slate-400'
                }`}
              >
                {(d.monthName || (d as any).monthLabel || 'N/A').split(' ')[0]}
              </text>
            )
          })}
        </svg>

        {/* Hover Floating Tooltip Card */}
        {hoveredIdx !== null && activePoint && (
          <div
            className="absolute pointer-events-none z-10 p-2.5 rounded-xl bg-slate-900/90 text-white shadow-xl backdrop-blur-sm border border-slate-700/60 text-xs space-y-1 transition-all duration-75"
            style={{
              left: `${Math.min(Math.max(12, (activeX / width) * 100), 75)}%`,
              top: '12px',
            }}
          >
            <div className="font-semibold text-slate-300 border-b border-slate-700 pb-1 text-[11px]">
              {activePoint.monthName || (activePoint as any).monthLabel || 'N/A'}
            </div>
            <div className="flex items-center justify-between gap-4 font-mono">
              <span className="text-indigo-400">Net Worth:</span>
              <span className="font-bold text-white">{formatINR(activePoint.netWorth)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 font-mono text-[11px] text-slate-400">
              <span className="text-sky-400">Assets:</span>
              <span>{formatINR(activePoint.assets)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 font-mono text-[11px] text-slate-400">
              <span className="text-rose-400">Liabilities:</span>
              <span>{formatINR(activePoint.liabilities)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
