import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Building,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  RefreshCw
} from 'lucide-react'

interface TransactionItem {
  id: string
  date: string
  merchant: string
  category: string
  account: string
  amount: string
  type: 'inflow' | 'outflow' | 'transfer'
  status: 'Synced' | 'Pending'
}

const sampleTransactions: TransactionItem[] = [
  {
    id: 'tx-101',
    date: '23-09-2026',
    merchant: 'Google Cloud Platform',
    category: 'Cloud Infrastructure',
    account: 'HDFC Corporate',
    amount: '₹4,250.00',
    type: 'outflow',
    status: 'Synced',
  },
  {
    id: 'tx-102',
    date: '22-09-2026',
    merchant: 'Client Retainer Payment',
    category: 'Consulting Inflow',
    account: 'ICICI Current',
    amount: '₹1,50,000.00',
    type: 'inflow',
    status: 'Synced',
  },
  {
    id: 'tx-103',
    date: '21-09-2026',
    merchant: 'Nippon India Small Cap SIP',
    category: 'Investments',
    account: 'HDFC Corporate',
    amount: '₹15,000.00',
    type: 'transfer',
    status: 'Synced',
  },
  {
    id: 'tx-104',
    date: '20-09-2026',
    merchant: 'Protein Supplements (Optimum)',
    category: 'Health & Nutrition',
    account: 'Axis Card (7782)',
    amount: '₹3,499.00',
    type: 'outflow',
    status: 'Synced',
  },
  {
    id: 'tx-105',
    date: '19-09-2026',
    merchant: 'Goa Collaborative Trip Advance',
    category: 'Trips Workspace',
    account: 'SBI Personal',
    amount: '₹12,000.00',
    type: 'transfer',
    status: 'Pending',
  },
]

export const DashboardPage: React.FC = () => {
  const transactionColumns: Column<TransactionItem>[] = [
    {
      key: 'date',
      header: 'Date',
      className: 'font-mono text-slate-500 w-28',
    },
    {
      key: 'merchant',
      header: 'Merchant / Description',
      render: (tx) => (
        <span className="font-medium text-slate-900 dark:text-white">
          {tx.merchant}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (tx) => (
        <span className="text-slate-600 dark:text-slate-400">
          {tx.category}
        </span>
      ),
    },
    {
      key: 'account',
      header: 'Source Account',
      render: (tx) => (
        <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
          {tx.account}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      isNumeric: true,
      render: (tx) => {
        const colorClass =
          tx.type === 'inflow'
            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
            : tx.type === 'outflow'
            ? 'text-rose-600 dark:text-rose-400 font-semibold'
            : 'text-sky-600 dark:text-sky-400 font-medium'
        const prefix = tx.type === 'inflow' ? '+ ' : tx.type === 'outflow' ? '- ' : ''

        return <span className={colorClass}>{prefix}{tx.amount}</span>
      },
    },
    {
      key: 'status',
      header: 'Sync',
      className: 'w-20',
      render: (tx) => (
        <Badge
          variant={tx.status === 'Synced' ? 'emerald' : 'amber'}
          size="sm"
          dot
        >
          {tx.status}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Tier 1: Unified PageHeader */}
      <PageHeader
        title="Financial Overview"
        subtitle="Consolidated real-time view of your liquid accounts, investments, and active liabilities."
        actionSlot={
          <>
            <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
              Sync Vault
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Add Transaction
            </Button>
          </>
        }
      />

      {/* Tier 2: Standardized 4-Card Metric / KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Net Worth"
          value="₹42,85,620.00"
          icon={<Wallet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          delta={{ value: '+4.2% MoM', isPositive: true }}
          subtext="across 6 asset classes"
        />
        <MetricCard
          label="Monthly Inflow"
          value="₹1,85,000.00"
          icon={<TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          delta={{ value: '+12.5%', isPositive: true }}
          subtext="vs last month"
        />
        <MetricCard
          label="Monthly Expenses"
          value="₹46,320.00"
          icon={<TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
          delta={{ value: '-8.1%', isPositive: true }}
          subtext="34% of monthly budget"
        />
        <MetricCard
          label="Total Liquid Cash"
          value="₹6,40,250.00"
          icon={<Building className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
          subtext="3 Bank accounts, 1 Wallet"
        />
      </div>

      {/* Tier 3 & 4: Standardized 12-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Primary Workspace (8 Columns): High-Density Ledger Table */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader
              title="Recent Transactions"
              subtitle="Latest real-time entries with verified offline checksums"
              actionSlot={
                <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
                  View All
                </Button>
              }
            />
            <CardBody className="p-0">
              <DataTable
                columns={transactionColumns}
                data={sampleTransactions}
                keyExtractor={(item) => item.id}
              />
            </CardBody>
          </Card>
        </div>

        {/* Secondary Workspace (4 Columns): Account Balances & Invariant Guard */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Liquid Accounts */}
          <Card>
            <CardHeader
              title="Account Balances"
              subtitle="Reconciled depository accounts"
            />
            <CardBody className="p-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      HDFC Corporate
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      •••• 8912 | Bank
                    </div>
                  </div>
                </div>
                <div className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                  ₹4,20,500.00
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Axis Bank Primus
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      •••• 7782 | Outstanding
                    </div>
                  </div>
                </div>
                <div className="font-mono text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                  -₹18,450.00
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Physical Cash Reserve
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Cash Vault
                    </div>
                  </div>
                </div>
                <div className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                  ₹15,000.00
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Architectural Invariants Status Card */}
          <Card>
            <CardHeader
              title="System Invariants"
              subtitle="Core architectural compliance"
            />
            <CardBody className="p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Singleton Admin Guard
                </span>
                <Badge variant="emerald" size="sm">AdminCount ≤ 1</Badge>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Universal Test User
                </span>
                <Badge variant="emerald" size="sm">Active (test@local)</Badge>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Payment Gateway Policy
                </span>
                <Badge variant="sky" size="sm">Zero Gateway</Badge>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Universal Single Styling
                </span>
                <Badge variant="indigo" size="sm">AppLayout 5-Tier</Badge>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
