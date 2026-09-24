import React, { useState, useRef, useEffect } from 'react'
import { Bell, Check, CheckCheck, ShieldCheck, Database, Cloud, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationItem {
  id: string
  title: string
  description: string
  timestamp: string
  read: boolean
  type: 'info' | 'success' | 'warning'
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'Cloud Database Active',
    description: 'Neon Serverless PostgreSQL connection is healthy with connection pooling.',
    timestamp: 'Just now',
    read: false,
    type: 'success',
  },
  {
    id: '2',
    title: 'Receipt Storage Connected',
    description: 'Google Drive cloud storage is active for transaction receipt uploads.',
    timestamp: '15m ago',
    read: false,
    type: 'info',
  },
  {
    id: '3',
    title: 'Singleton Admin Verified',
    description: 'Zero elevation boundary maintained with AdminCount = 1.',
    timestamp: '1h ago',
    read: false,
    type: 'success',
  },
  {
    id: '4',
    title: 'Offline Sync Ready',
    description: 'Local IndexedDB cache is synchronized with the production API.',
    timestamp: '2h ago',
    read: true,
    type: 'info',
  },
]

export const NotificationPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)
  const popoverRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button - matching reference design in Image 2 */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="View notifications"
        aria-expanded={isOpen}
        className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white relative focus:outline-none transition-colors shadow-xs dark:shadow-sm cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.8)] animate-pulse" />
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No notifications right now
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={cn(
                    'p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left',
                    !notification.read && 'bg-indigo-50/30 dark:bg-indigo-950/20'
                  )}
                >
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                    {notification.id === '1' && <Database className="w-4 h-4 text-emerald-500" />}
                    {notification.id === '2' && <Cloud className="w-4 h-4 text-sky-500" />}
                    {notification.id === '3' && <ShieldCheck className="w-4 h-4 text-indigo-500" />}
                    {notification.id === '4' && <Check className="w-4 h-4 text-purple-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {notification.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {notification.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {notification.description}
                    </p>
                  </div>

                  {!notification.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
