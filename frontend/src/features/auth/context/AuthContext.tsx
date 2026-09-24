import React, { useEffect, useState, useCallback } from 'react'
import { apiClient, setAccessToken, setRefreshToken, clearAuthTokens, getRefreshToken } from '@/lib/api'
import { AuthContext } from './authContextDef'
import type { AuthResponse, LoginCredentials, RegisterCredentials, User, Session } from '../types'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Automatic silent session restoration on app load via rotating refresh token
  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      try {
        const storedRefresh = getRefreshToken()
        const response = await apiClient<AuthResponse>('/api/v1/auth/refresh-token', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: storedRefresh || undefined }),
          skipAuth: true,
        })
        if (isMounted && response?.accessToken) {
          setAccessToken(response.accessToken)
          if (response.refreshToken) {
            setRefreshToken(response.refreshToken)
          }
          setUser(response.user)
          setSession(response.session)
        }
      } catch {
        if (isMounted) {
          clearAuthTokens()
          setUser(null)
          setSession(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initAuth()

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true)
    try {
      const response = await apiClient<AuthResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
        skipAuth: true,
      })
      setAccessToken(response.accessToken)
      if (response.refreshToken) {
        setRefreshToken(response.refreshToken)
      }
      setUser(response.user)
      setSession(response.session)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setIsLoading(true)
    try {
      const response = await apiClient<AuthResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(credentials),
        skipAuth: true,
      })
      setAccessToken(response.accessToken)
      if (response.refreshToken) {
        setRefreshToken(response.refreshToken)
      }
      setUser(response.user)
      setSession(response.session)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiClient('/api/v1/auth/logout', { method: 'POST', skipAuth: true })
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuthTokens()
      setUser(null)
      setSession(null)
    }
  }, [])

  const refreshSessions = useCallback(async (): Promise<Session[]> => {
    return await apiClient<Session[]>('/api/v1/auth/sessions')
  }, [])

  const revokeSession = useCallback(async (sessionId: string) => {
    await apiClient(`/api/v1/auth/sessions/${sessionId}/revoke`, { method: 'POST' })
  }, [])

  const revokeAllOtherSessions = useCallback(async () => {
    await apiClient('/api/v1/auth/sessions/revoke-all-others', { method: 'POST' })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshSessions,
        revokeSession,
        revokeAllOtherSessions,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
