/**
 * Centralized API client for WealthFlow.
 * Enforces short-lived JWT access token bearer injection, credentials: 'include' for HttpOnly cookies,
 * and automatic 401 refresh token rotation retry loop.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined 
  ? import.meta.env.VITE_API_URL 
  : (import.meta.env.PROD ? '' : 'http://localhost:5000')

let currentAccessToken: string | null = null
let refreshPromise: Promise<string | null> | null = null

export function setAccessToken(token: string | null) {
  currentAccessToken = token
}

export function getAccessToken(): string | null {
  return currentAccessToken
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
  const headers = new Headers(options.headers || {})

  if (!options.skipAuth && currentAccessToken) {
    headers.set('Authorization', `Bearer ${currentAccessToken}`)
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
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    try {
      const errorJson = await response.json()
      if (errorJson?.message) {
        errorMessage = errorJson.message
      }
    } catch {
      // Ignore JSON parse failure for empty error responses
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
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        currentAccessToken = null
        return null
      }

      const data = await response.json()
      currentAccessToken = data.accessToken
      return data.accessToken
    } catch {
      currentAccessToken = null
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}
