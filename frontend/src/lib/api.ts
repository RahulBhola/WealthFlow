/**
 * Centralized API client for WealthFlow.
 * Enforces short-lived JWT access token bearer injection, credentials: 'include' for HttpOnly cookies,
 * and automatic 401 refresh token rotation retry loop.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined 
  ? import.meta.env.VITE_API_URL 
  : (import.meta.env.PROD ? '' : 'http://localhost:5000')

const ACCESS_TOKEN_KEY = 'wf_access_token'
const REFRESH_TOKEN_KEY = 'wf_refresh_token'

let currentAccessToken: string | null = null
let currentRefreshToken: string | null = null
let refreshPromise: Promise<string | null> | null = null

// Restore tokens from localStorage upon module load
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    currentAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    currentRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  }
} catch {
  // Ignore storage access errors in restricted environments
}

export function setAccessToken(token: string | null) {
  currentAccessToken = token
  try {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
    }
  } catch {
    // Ignore storage errors
  }
}

export function setRefreshToken(token: string | null) {
  currentRefreshToken = token
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  } catch {
    // Ignore storage errors
  }
}

export function getAccessToken(): string | null {
  if (!currentAccessToken && typeof window !== 'undefined' && window.localStorage) {
    try {
      currentAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    } catch {
      // Ignore
    }
  }
  return currentAccessToken
}

export function getRefreshToken(): string | null {
  if (!currentRefreshToken && typeof window !== 'undefined' && window.localStorage) {
    try {
      currentRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    } catch {
      // Ignore
    }
  }
  return currentRefreshToken
}

export function clearAuthTokens() {
  currentAccessToken = null
  currentRefreshToken = null
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    // Ignore storage errors
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
  const headers = new Headers(options.headers || {})

  const token = getAccessToken()
  if (!options.skipAuth && token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Always send cookies (wf_refresh_token HttpOnly)
  }

  let response = await fetch(url, fetchOptions)

  // Handle 401 Unauthorized by attempting a refresh token exchange
  if (response.status === 401 && !options.skipAuth && !endpoint.includes('/auth/refresh-token') && !endpoint.includes('/auth/login')) {
    const newToken = await handleTokenRefresh()
    if (newToken) {
      // Retry original request with newly rotated access token
      headers.set('Authorization', `Bearer ${newToken}`)
      response = await fetch(url, { ...fetchOptions, headers })
    }
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText || ''}`.trim()
    try {
      const errorJson = await response.json()
      if (errorJson?.message) {
        errorMessage = errorJson.message
      } else if (errorJson?.error) {
        errorMessage = errorJson.error
      }
    } catch {
      // Ignore JSON parse failure for empty error responses
    }

    if (response.status === 401 && !errorMessage.includes('Invalid email or password')) {
      errorMessage = 'Your session has expired. Please log in again.'
    }

    const error = new Error(errorMessage) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json() as Promise<T>
}

async function handleTokenRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      const storedRefreshToken = getRefreshToken()
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: storedRefreshToken || undefined }),
      })

      if (!response.ok) {
        clearAuthTokens()
        return null
      }

      const data = await response.json()
      if (data?.accessToken) {
        setAccessToken(data.accessToken)
        if (data.refreshToken) {
          setRefreshToken(data.refreshToken)
        }
        return data.accessToken
      }

      clearAuthTokens()
      return null
    } catch {
      clearAuthTokens()
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}
