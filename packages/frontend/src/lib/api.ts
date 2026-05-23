import axios, { type AxiosError } from 'axios'
import { useAuthStore } from '@/store/auth.store'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Refresh token on 401
let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function processQueue(error: unknown, token: string | null) {
  for (const p of failedQueue) {
    if (error) p.reject(error)
    else p.resolve(token!)
  }
  failedQueue = []
}

api.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers!.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = useAuthStore.getState().refreshToken
      if (!refreshToken) {
        useAuthStore.getState().logout()
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        const { accessToken, refreshToken: newRefresh } = data.data.tokens
        useAuthStore.getState().setTokens(accessToken, newRefresh)
        processQueue(null, accessToken)
        originalRequest.headers!.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        useAuthStore.getState().logout()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

// ─── Typed API helpers ──────────────────────────────────────────────────────

export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data
    if (!data) return err.message
    const message: string = data.error ?? err.message
    // Append Zod field-level details when present (e.g. "Validation failed — email: Invalid email")
    if (data.details && typeof data.details === 'object') {
      const fieldErrors = Object.entries(data.details as Record<string, string[]>)
        .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
        .join(' | ')
      return `${message} — ${fieldErrors}`
    }
    return message
  }
  return String(err)
}
