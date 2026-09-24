import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, FileText, RefreshCw, ShieldCheck } from 'lucide-react'

export const AdminNavTabs: React.FC = () => {
  const tabs = [
    {
      to: '/admin',
      end: true,
      label: 'Command Center',
      icon: LayoutDashboard,
    },
    {
      to: '/admin/users',
      end: false,
      label: 'User Directory',
      icon: Users,
    },
    {
      to: '/admin/audit-logs',
      end: false,
      label: 'System Audit Logs',
      icon: FileText,
    },
    {
      to: '/admin/sync-monitor',
      end: false,
      label: 'Sync Telemetry & Conflicts',
      icon: RefreshCw,
    },
  ]

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </NavLink>
          )
        })}
      </div>

      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>Singleton Admin Guard Active</span>
      </div>
    </div>
  )
}
