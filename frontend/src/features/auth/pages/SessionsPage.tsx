import React, { useEffect, useState, useCallback } from 'react'
import { Shield, Smartphone, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { DeviceSessionCard } from '../components/DeviceSessionCard'
import { useAuth } from '../hooks/useAuth'
import type { Session } from '../types'

export const SessionsPage: React.FC = () => {
  const { refreshSessions, revokeSession, revokeAllOtherSessions } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRevokingAll, setIsRevokingAll] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await refreshSessions()
      setSessions(data)
    } catch (err) {
      console.error('Failed to load active sessions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [refreshSessions])

  useEffect(() => {
    let ignore = false
    async function fetchSessions() {
      try {
        const data = await refreshSessions()
        if (!ignore) {
          setSessions(data)
        }
      } catch (err) {
        console.error('Failed to load active sessions:', err)
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    fetchSessions()
    return () => {
      ignore = true
    }
  }, [refreshSessions])

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 4000)
  }

  const handleRevokeSingle = async (sessionId: string) => {
    setRevokingId(sessionId)
    try {
      await revokeSession(sessionId)
      showToast('Session successfully revoked.')
      await loadSessions()
    } catch (err) {
      console.error('Failed to revoke session:', err)
    } finally {
      setRevokingId(null)
    }
  }

  const handleRevokeAllOthers = async () => {
    setIsRevokingAll(true)
    try {
      await revokeAllOtherSessions()
      showToast('All other device sessions have been revoked.')
      await loadSessions()
    } catch (err) {
      console.error('Failed to revoke other sessions:', err)
    } finally {
      setIsRevokingAll(false)
    }
  }

  const currentSession = sessions.find((s) => s.isCurrent)
  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length

  return (
    <div className="space-y-6">
      {/* Tier 1: Page Header */}
      <PageHeader
        title="Active Device Sessions"
        subtitle="Review, monitor, and remotely revoke active authenticated sessions across your devices."
        actionSlot={
          otherSessionsCount > 0 ? (
            <button
              type="button"
              disabled={isRevokingAll}
              onClick={handleRevokeAllOthers}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Revoke All Other Sessions
            </button>
          ) : undefined
        }
      />

      {/* Success Toast */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-300 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tier 2: Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Total Active Sessions"
          value={isLoading ? '...' : sessions.length.toString()}
          subtext="Cryptographically authenticated"
          icon={<Shield className="w-4 h-4 text-emerald-500" />}
        />
        <MetricCard
          label="Current Device"
          value={currentSession?.deviceName || 'Active'}
          subtext={currentSession?.browser || 'Web Client'}
          icon={<Smartphone className="w-4 h-4 text-teal-500" />}
        />
        <MetricCard
          label="Remote Device Sessions"
          value={isLoading ? '...' : otherSessionsCount.toString()}
          subtext={otherSessionsCount > 0 ? 'Remotely revocable' : 'No other devices active'}
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
        />
      </div>

      {/* Tier 3: Active Sessions List */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl shadow-black/20">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Connected Devices & Locations</h3>
              <p className="text-xs text-slate-400">
                Each session utilizes a 15-minute JWT paired with a 14-day rotating refresh token.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadSessions}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-xs">Loading active device telemetry...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No active sessions found.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <DeviceSessionCard
                key={session.id}
                session={session}
                onRevoke={handleRevokeSingle}
                isRevoking={revokingId === session.id || isRevokingAll}
              />
            ))}
          </div>
        )}
      </div>

      {/* Security Invariant Callout */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex items-start gap-3 text-slate-400 text-xs leading-relaxed">
        <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200">Compromise Detection Enabled:</strong> If any revoked or stale refresh token is replayed across the network, the authentication engine automatically revokes all sessions associated with your account immediately.
        </div>
      </div>
    </div>
  )
}
