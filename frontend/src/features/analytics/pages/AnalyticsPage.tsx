import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  TrendingUp,
  Flame,
  PiggyBank,
  Wallet,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react'
import { fetchAnalyticsSummary } from '../api/analyticsApi'
import type { AnalyticsSummaryDto } from '../types'
import { NetWorthAreaChart } from '@/features/dashboard/components/NetWorthAreaChart'
import { CategoryDonutChart } from '../components/CategoryDonutChart'
import { CashFlowWaterfallChart } from '../components/CashFlowWaterfallChart'

const formatINR = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val)
}

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsSummaryDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchAnalyticsSummary()
      setData(res)
    } catch (err: any) {
      console.error('Failed to load analytics data', err)
      setError(err?.message || 'Unable to retrieve financial analytics telemetry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          <div className="lg:col-span-5 h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
          <Flame className="w-6 h-6" />
        </div>
        <div className="text-base font-bold text-slate-900 dark:text-white">
          Analytics Pipeline Unavailable
        </div>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {error || 'Unable to fetch analytics telemetry. Please verify connection to the server.'}
        </p>
        <Button onClick={loadData} variant="secondary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Connection
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tier 1: Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Financial Analytics & Cash Flow
            </h1>
            <Badge variant="indigo" size="sm">
              Real-time
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Historical net worth velocity, category expenditure breakdown, and monthly cash flow waterfall.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Trailing 12 Months</span>
          </div>
          <Button onClick={loadData} variant="secondary" size="sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tier 2: 4-Card Executive Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Daily Burn Rate */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Daily Burn Rate
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white mt-2 tabular-nums">
              {formatINR(data.dailyBurnRate)}
              <span className="text-xs text-slate-400 font-sans font-normal ml-1">/ day</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Trailing 30-day amortized outflow
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Savings Rate */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Savings Rate
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white mt-2 tabular-nums">
              {data.savingsRatePercentage.toFixed(1)}%
            </div>
            <div className="text-[11px] flex items-center gap-1 mt-1 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-3 h-3" />
              {data.savingsRatePercentage >= 30 ? 'Target achieved (>30%)' : 'Below target'}
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Portfolio Investments */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Invested Capital
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white mt-2 tabular-nums">
              {formatINR(data.totalInvestments)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Mutual funds, equities & assets
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Liquid Cash Reserves */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Liquid Reserves
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white mt-2 tabular-nums">
              {formatINR(data.totalLiquidCash)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Bank accounts & cash on hand
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier 3: 12-Month Net Worth Trajectory Area Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              12-Month Net Worth Trajectory
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cumulative balance progression across all assets, liabilities, and investments.
            </p>
          </div>
          <Badge variant="indigo" size="sm">
            Continuous Trajectory
          </Badge>
        </CardHeader>
        <CardContent className="pt-2">
          <NetWorthAreaChart data={data.netWorthHistory} className="w-full" />
        </CardContent>
      </Card>

      {/* Tier 4: Waterfall Simulation & Category Donut Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Col 7: Cash Flow Waterfall */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Monthly Cash Flow Waterfall
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Stepwise delta progression from opening liquidity to final closing reserve.
              </p>
            </div>
            <Badge variant="emerald" size="sm">
              Waterfall Model
            </Badge>
          </CardHeader>
          <CardContent className="pt-2">
            <CashFlowWaterfallChart steps={data.cashFlowWaterfall} />
          </CardContent>
        </Card>

        {/* Col 5: Category Spending Donut Chart */}
        <Card className="lg:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-violet-500" />
                Expenditure by Category
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Outflow allocation with high-protein and lifestyle tagging.
              </p>
            </div>
            <Badge variant="violet" size="sm">
              Donut Drilldown
            </Badge>
          </CardHeader>
          <CardContent className="pt-2">
            <CategoryDonutChart categories={data.categoryBreakdown} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
