import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { navigationItems } from './navItems'
import { Settings, ShieldAlert, LogOut } from 'lucide-react'

export interface SidebarProps {
  currentPath?: string
  isAdmin?: boolean
  userEmail?: string
  userRole?: string
  onNavigate?: (href: string) => void
  onLogout?: () => void
  className?: string
}

/**
 * Desktop Sidebar component with active link indicators, role filtering,
 * and the User Profile card at the bottom matching reference design (Image 1).
 */
export const Sidebar: React.FC<SidebarProps> = ({
  currentPath = '/',
  isAdmin = false,
  userEmail = 'test@wealthflow.local',
  userRole = 'User',
  onNavigate,
  onLogout,
  className,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  const visibleItems = navigationItems.filter(item => !item.isAdminOnly || isAdmin)

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProfileMenuOpen])

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col w-64 bg-slate-950 border-r border-slate-800/80 shrink-0 h-screen sticky top-0 select-none',
        className
      )}
    >
      {/* Brand Header matching reference design */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-sky-400 to-teal-400 flex items-center justify-center text-white font-extrabold text-base shadow-md shadow-indigo-500/20">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 17L8.5 7L12 14L15.5 7L20 17H16.5L14 11.5L12 15.5L10 11.5L7.5 17H4Z" />
          </svg>
        </div>
        <span className="font-bold text-lg tracking-tight text-white">
          WealthFlow
        </span>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = currentPath === item.href
          const Icon = item.icon

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => onNavigate?.(item.href)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer',
                isActive
                  ? 'bg-slate-800/90 text-white font-semibold shadow-inner'
                  : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isActive
                      ? 'text-indigo-400'
                      : 'text-slate-500'
                  )}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* User Profile Card matching reference design in Image 1 */}
      <div className="p-3 border-t border-slate-800/80 relative" ref={profileMenuRef}>
        <button
          type="button"
          onClick={() => setIsProfileMenuOpen((prev) => !prev)}
          aria-label="User profile options"
          aria-expanded={isProfileMenuOpen}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 hover:border-slate-700/80 transition-all text-left cursor-pointer group shadow-sm"
        >
          <div className="flex items-center gap-3 min-w-0">
            {!avatarError ? (
              <img
                src="/avatar.png"
                alt="User Profile"
                onError={() => setAvatarError(true)}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-700 shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-900/80 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-700/60">
                {userEmail.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
                User Profile
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
                <span className="text-[11px] text-slate-400 font-normal">Online</span>
              </div>
            </div>
          </div>
        </button>

        {/* User Profile Flyout Dropdown */}
        {isProfileMenuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="px-2.5 py-2 border-b border-slate-800/80 mb-1">
              <p className="text-xs font-semibold text-white truncate">{userEmail}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                  Role: {userRole}
                </span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Active
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsProfileMenuOpen(false)
                onNavigate?.('/settings')
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Account Settings</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false)
                  onNavigate?.('/admin')
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-indigo-300 hover:bg-indigo-950/50 hover:text-indigo-200 transition-colors text-left cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                <span>Admin ERP Command</span>
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false)
                  onLogout()
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors text-left cursor-pointer mt-1 border-t border-slate-800/80 pt-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
