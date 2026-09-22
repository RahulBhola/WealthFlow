import React, { useEffect, useState } from 'react'
import { Crown, AlertCircle, CheckCircle2, Server, ShieldCheck, Key, ShieldAlert } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { apiClient } from '@/lib/api'

interface AdminTelemetry {
  status: string
  adminId: string
  adminEmail: string
  role: string
  timestampUtc: string
  message: string
}

export const AdminDashboardPage: React.FC = () => {
  const [telemetry, setTelemetry] = useState<AdminTelemetry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAdminData() {
      try {
        const data = await apiClient<AdminTelemetry>('/api/v1/admin/dashboard')
        setTelemetry(data)
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Failed to load administrator telemetry.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchAdminData()
  }, [])

  return (
    <div className="space-y-6">
      {/* Tier 1: Page Header */}
      <PageHeader
        title="Singleton Admin Control Center"
        subtitle="Exclusive administrative control center enforced by architectural invariant (AdminCount ≤ 1)."
      />

      {/* Tier 2: Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Singleton Invariant"
          value="1 Active"
          subtext="AdminCount ≤ 1 enforced"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-500" />}
        />
        <MetricCard
          label="Access Tier"
          value="Superuser"
          subtext="PostgreSQL seeded"
          icon={<Key className="w-4 h-4 text-teal-500" />}
        />
        <MetricCard
          label="Elevation API"
          value="403 Forbidden"
          subtext="Strict rejection policy"
          icon={<ShieldAlert className="w-4 h-4 text-amber-500" />}
        />
        <MetricCard
          label="Control Center"
          value={telemetry?.status || 'Active'}
          subtext="Protected JWT Bearer"
          icon={<Server className="w-4 h-4 text-indigo-500" />}
        />
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tier 3: Invariant Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl shadow-black/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Manual Singleton Admin Invariant</h3>
              <p className="text-xs text-slate-400">docs/03-security-and-access-document.md</p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Public registration is architecturally constrained to the <strong>User</strong> role.</span>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>All API self-elevation endpoints (<code className="text-amber-300 font-mono text-xs">/api/v1/auth/promote</code>) return <strong>403 Forbidden</strong>.</span>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Admin credentials can only be provisioned directly in PostgreSQL via <code className="text-emerald-300 font-mono text-xs">scripts/seed-admin.sql</code>.</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl shadow-black/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Admin Session Telemetry</h3>
              <p className="text-xs text-slate-400">Live API response from /api/v1/admin/dashboard</p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-500 gap-2">
              <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-xs">Querying admin control endpoint...</p>
            </div>
          ) : (
            <div className="space-y-2.5 font-mono text-xs bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-slate-300">
              <div><span className="text-slate-500">STATUS:</span> <span className="text-emerald-400 font-semibold">{telemetry?.status || 'OK'}</span></div>
              <div><span className="text-slate-500">ADMIN EMAIL:</span> <span className="text-white">{telemetry?.adminEmail || 'N/A'}</span></div>
              <div><span className="text-slate-500">ROLE:</span> <span className="text-amber-400 font-bold">{telemetry?.role || 'Admin'}</span></div>
              <div><span className="text-slate-500">TIMESTAMP:</span> <span className="text-slate-400">{telemetry?.timestampUtc || new Date().toISOString()}</span></div>
              <div><span className="text-slate-500">MESSAGE:</span> <span className="text-slate-200">{telemetry?.message}</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
