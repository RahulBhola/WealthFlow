import React, { useEffect, useState } from 'react'
import {
  X,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  ShieldAlert,
  Clock,
  Trash2,
  RefreshCw,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { fetchUserSessions, revokeUserSession } from '../api/adminApi'
import type { AdminUserDto, AdminUserSessionDto } from '../types'

export interface UserSessionInspectorModalProps {
  user: AdminUserDto | null
  isOpen: boolean
  onClose: () => void
}

export const UserSessionInspectorModal: React.FC<UserSessionInspectorModalProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const [sessions, setSessions] = useState<AdminUserSessionDto[]>([])
  const [loading, setLoading] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSessions = async () => {
    if (!user) return
    try {
      setLoading(true)
      setError(null)
      const data = await fetchUserSessions(user.id)
      setSessions(data)
    } catch (err: any) {
      console.error('Failed to load user sessions', err)
      setError(err?.message || 'Unable to retrieve user sessions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && user) {
      loadSessions()
      setMessage(null)
    }
  }, [isOpen, user])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !user) return null

  const handleRevoke = async (sessionId: string) => {
    if (!confirm('Are you sure you want to remotely terminate this session? The device will immediately be logged out.')) {
      return
    }
    try {
      setRevokingId(sessionId)
      await revokeUserSession(user.id, sessionId)
      setMessage('Session successfully terminated.')
      await loadSessions()
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke session.')
    } finally {
      setRevokingId(null)
    }
  }

  const getDeviceIcon = (deviceType: string) => {
    const dt = deviceType?.toLowerCase() || ''
    if (dt.includes('mobile') || dt.includes('phone') || dt.includes('ios') || dt.includes('android')) {
      return Smartphone
    }
    if (dt.includes('tablet') || dt.includes('ipad')) {
      return Tablet
    }
    if (dt.includes('desktop') || dt.includes('laptop') || dt.includes('mac') || dt.includes('windows')) {
      return Laptop
    }
    return Globe
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Active Devices & Sessions
              </h2>
              <Badge variant="indigo" size="sm">
                {sessions.filter((s) => !s.isRevoked).length} Active
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Remote session inspector for <span className="font-semibold text-slate-700 dark:text-slate-200">{user.email}</span> ({user.firstName} {user.lastName})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={loadSessions} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Banners */}
        {message && (
          <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="px-5 py-2.5 bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Sessions List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {loading && sessions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-xs">Querying authorized session directory...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No active or historical sessions discovered for this user account.
            </div>
          ) : (
            sessions.map((session) => {
              const DeviceIcon = getDeviceIcon(session.deviceType)
              const isExpired = new Date(session.expiresAtUtc).getTime() < Date.now()
              const isRevoked = session.isRevoked || isExpired

              return (
                <div
                  key={session.sessionId}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isRevoked
                      ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isRevoked
                          ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                          : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400'
                      }`}
                    >
                      <DeviceIcon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {session.deviceName || 'Unknown Hardware'}
                        </span>
                        {session.browser && (
                          <span className="text-xs text-slate-400">
                            • {session.browser}
                          </span>
                        )}
                        {isRevoked ? (
                          <Badge variant="rose" size="sm">
                            {session.isRevoked ? 'Revoked' : 'Expired'}
                          </Badge>
                        ) : (
                          <Badge variant="emerald" size="sm">
                            Active
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1 flex-wrap">
                        <span>IP: {session.ipAddress || 'Internal'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-sans">
                          <Clock className="w-3 h-3" />
                          Last active: {new Date(session.lastActiveAtUtc).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isRevoked && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRevoke(session.sessionId)}
                      disabled={revokingId === session.sessionId}
                      className="shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      {revokingId === session.sessionId ? 'Revoking...' : 'Revoke Session'}
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>Revoking a session immediately blacklists the JWT and deletes refresh tokens.</span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
