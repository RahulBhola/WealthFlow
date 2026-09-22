import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'

interface RoleGuardProps {
  requiredRole: 'Admin' | 'User'
  children: React.ReactNode
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ requiredRole, children }) => {
  const { user } = useAuth()

  if (user?.role !== requiredRole) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6 shadow-xl shadow-rose-950/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied (403 Forbidden)</h1>
        <p className="text-slate-400 max-w-md mb-6 leading-relaxed text-sm">
          You are currently signed in as <span className="font-semibold text-slate-200">{user?.email}</span> with role{' '}
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {user?.role}
          </span>
          . WealthFlow enforces a strict <strong className="text-emerald-400">Singleton Admin Policy</strong>. Admin access is limited to the system owner and cannot be elevated through client self-service.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium border border-slate-700/80 transition-colors shadow-lg shadow-black/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
