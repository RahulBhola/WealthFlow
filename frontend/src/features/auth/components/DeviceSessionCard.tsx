import React from 'react'
import { Monitor, Smartphone, Tablet, Globe, Clock, ShieldCheck, XCircle } from 'lucide-react'
import type { Session } from '../types'

interface DeviceSessionCardProps {
  session: Session
  onRevoke: (id: string) => void
  isRevoking?: boolean
}

export const DeviceSessionCard: React.FC<DeviceSessionCardProps> = ({
  session,
  onRevoke,
  isRevoking = false,
}) => {
  const getDeviceIcon = () => {
    switch (session.deviceType) {
      case 'Mobile':
        return <Smartphone className="w-5 h-5 text-teal-400" />
      case 'Tablet':
        return <Tablet className="w-5 h-5 text-indigo-400" />
      default:
        return <Monitor className="w-5 h-5 text-emerald-400" />
    }
  }

  const formatDateTime = (isoDate: string) => {
    try {
      const d = new Date(isoDate)
      return d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    } catch {
      return isoDate
    }
  }

  return (
    <div
      className={`p-5 rounded-2xl border transition-all ${
        session.isCurrent
          ? 'bg-slate-900/90 border-emerald-500/30 shadow-lg shadow-emerald-950/20'
          : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700/80 shadow-md shadow-black/20'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shrink-0 mt-0.5">
            {getDeviceIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-white text-sm">{session.deviceName || 'Unknown Device'}</h4>
              {session.isCurrent ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  This Device
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                  {session.deviceType}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
              {session.browser && (
                <span className="flex items-center gap-1 text-slate-300">
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  {session.browser}
                </span>
              )}
              {session.ipAddress && (
                <span className="font-mono text-slate-400">
                  IP: {session.ipAddress}
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Last active: {formatDateTime(session.lastActiveAtUtc)}
              </span>
            </div>
          </div>
        </div>

        {!session.isCurrent && (
          <div className="sm:self-center shrink-0">
            <button
              type="button"
              disabled={isRevoking}
              onClick={() => onRevoke(session.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Revoke Session
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
