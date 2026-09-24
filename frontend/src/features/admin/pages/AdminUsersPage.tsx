import React, { useEffect, useState } from 'react'
import {
  Users,
  Search,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Crown,
  Laptop,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AdminNavTabs } from '../components/AdminNavTabs'
import { UserSessionInspectorModal } from '../components/UserSessionInspectorModal'
import { fetchAdminUsers, toggleUserLock } from '../api/adminApi'
import type { AdminUserDto } from '../types'

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUserDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  // Session inspector state
  const [selectedUserForSessions, setSelectedUserForSessions] = useState<AdminUserDto | null>(null)
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null)

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchAdminUsers()
      setUsers(data)
    } catch (err: any) {
      console.error('Failed to load admin users', err)
      setError(err?.message || 'Unable to load user directory.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleToggleLock = async (user: AdminUserDto) => {
    if (user.role === 'Admin') {
      alert('The Singleton Admin account is architecturally protected and cannot be locked out.')
      return
    }

    const action = user.isLocked ? 'unlock' : 'lock'
    if (!confirm(`Are you sure you want to ${action} ${user.email}?`)) {
      return
    }

    try {
      setTogglingUserId(user.id)
      const res = await toggleUserLock(user.id)
      setActionNotice(res.message)
      await loadUsers()
    } catch (err: any) {
      setError(err?.message || `Failed to ${action} user.`)
    } finally {
      setTogglingUserId(null)
    }
  }

  const openSessionInspector = (user: AdminUserDto) => {
    setSelectedUserForSessions(user)
    setIsSessionModalOpen(true)
  }

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.email.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q)
    )
  })

  const totalUsers = users.length
  const totalLocked = users.filter((u) => u.isLocked).length
  const totalActiveDevices = users.reduce((sum, u) => sum + u.activeDevicesCount, 0)

  return (
    <div className="space-y-6">
      {/* Tier 1: Page Header & Admin Nav Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              User Directory & Device Management
            </h1>
            <Badge variant="indigo" size="sm">
              ERP High-Density
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registered accounts, active sessions, lockout states, and device revoking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={loadUsers} variant="secondary" size="sm">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Admin Module Navigation Tabs */}
      <AdminNavTabs />

      {/* Hard Invariant Notice */}
      <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>
          <strong>Hard Invariant Enforced:</strong> Role promotion and elevation routes are disabled. Exactly 1 Admin account exists in PostgreSQL.
        </span>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
          {actionNotice}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tier 2: Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Users
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
              {totalUsers}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Registered accounts</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Active Devices
            </div>
            <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
              {totalActiveDevices}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Connected multi-device sessions</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Locked Accounts
            </div>
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
              {totalLocked}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Security lockout status</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Singleton Superuser
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              1 Active
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">PostgreSQL enforced</div>
          </CardContent>
        </Card>
      </div>

      {/* Tier 3: High-Density User Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              Users & Authorized Devices
            </CardTitle>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by email / name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-y border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3">Accounts</th>
                  <th className="py-2.5 px-3">Trips</th>
                  <th className="py-2.5 px-3">Devices</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-sans text-xs">
                      No users matching search query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="h-[36px] hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* User Avatar & Name */}
                      <td className="py-1.5 px-4 font-sans whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200 shrink-0">
                            {user.firstName ? user.firstName[0].toUpperCase() : user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {user.firstName} {user.lastName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono ml-2">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-1.5 px-3 font-sans">
                        {user.role === 'Admin' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Crown className="w-2.5 h-2.5" /> Admin
                          </span>
                        ) : (
                          <Badge variant="slate" size="sm">
                            User
                          </Badge>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-1.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {new Date(user.createdAtUtc).toLocaleDateString()}
                      </td>

                      {/* Accounts Count */}
                      <td className="py-1.5 px-3 text-slate-600 dark:text-slate-300 tabular-nums">
                        {user.accountsCount}
                      </td>

                      {/* Trips Count */}
                      <td className="py-1.5 px-3 text-slate-600 dark:text-slate-300 tabular-nums">
                        {user.tripsCount}
                      </td>

                      {/* Active Devices */}
                      <td className="py-1.5 px-3 tabular-nums">
                        <button
                          onClick={() => openSessionInspector(user)}
                          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                          title="Click to inspect active device sessions"
                        >
                          <Laptop className="w-3 h-3" />
                          {user.activeDevicesCount}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-1.5 px-3 font-sans">
                        {user.isLocked ? (
                          <Badge variant="rose" size="sm">
                            Locked
                          </Badge>
                        ) : (
                          <Badge variant="emerald" size="sm">
                            Active
                          </Badge>
                        )}
                      </td>

                      {/* Action CTAs */}
                      <td className="py-1.5 px-4 text-right font-sans whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openSessionInspector(user)}
                            className="h-7 text-[11px] px-2"
                          >
                            Sessions
                          </Button>

                          {user.role !== 'Admin' && (
                            <Button
                              variant={user.isLocked ? 'secondary' : 'danger'}
                              size="sm"
                              onClick={() => handleToggleLock(user)}
                              disabled={togglingUserId === user.id}
                              className="h-7 text-[11px] px-2"
                            >
                              {user.isLocked ? (
                                <>
                                  <Unlock className="w-3 h-3 mr-1 text-emerald-500" />
                                  Unlock
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3 mr-1" />
                                  Lock
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* User Sessions Inspector Modal */}
      <UserSessionInspectorModal
        user={selectedUserForSessions}
        isOpen={isSessionModalOpen}
        onClose={() => {
          setIsSessionModalOpen(false)
          setSelectedUserForSessions(null)
          loadUsers()
        }}
      />
    </div>
  )
}
