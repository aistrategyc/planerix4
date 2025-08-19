'use client'

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type PropsWithChildren,
} from 'react'
import { useRouter } from 'next/navigation'
import { AxiosError } from 'axios'
import { api, setAccessToken, clearTokens } from '@/lib/api/config'
import { CompanyAPI } from '@/lib/api/company'

interface User {
  id: string
  email: string
  full_name?: string | null
  is_active?: boolean
}

interface LoginData {
  email: string
  password: string
}

interface RegisterData {
  email: string
  password: string
  username: string
  terms_accepted: boolean
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

interface AuthContextType extends AuthState {
  login: (data: LoginData) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  clearError: () => void
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  const clearError = useCallback(() => setState(p => ({ ...p, error: null })), [])
  const setLoading = useCallback((loading: boolean) => setState(p => ({ ...p, loading })), [])
  const setError = useCallback((error: string) => setState(p => ({ ...p, error, loading: false })), [])
  const setUser = useCallback((user: User | null) => setState(p => ({ ...p, user, loading: false, error: null })), [])

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const { data } = await api.post(
        '/auth/refresh',
        {},
        { headers: { 'x-skip-auth-retry': 'true' } } // чтобы интерсептор не перехватывал сам себя
      )
      const token: string | undefined = data?.access_token
      if (token) setAccessToken(token)
      return Boolean(token)
    } catch {
      return false
    }
  }, [])

  const getCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      const { data } = await api.get('/users/me')
      return data
    } catch (err: any) {
      if (err?.response?.status === 401) {
        const ok = await refreshToken()
        if (ok) {
          const { data } = await api.get('/users/me')
          return data
        }
      }
      console.error('Failed to get current user:', err)
      return null
    }
  }, [refreshToken])

  const checkAuth = useCallback(async () => {
    setLoading(true)
    try {
      let user = await getCurrentUser()
      if (!user) {
        const ok = await refreshToken()
        if (ok) user = await getCurrentUser()
      }
      setUser(user || null)
    } catch (err) {
      console.error('Auth check failed:', err)
      clearTokens()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [getCurrentUser, refreshToken, setUser, setLoading])

  const login = useCallback(async (payload: LoginData) => {
    clearError()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', payload)
      const token: string | undefined = data?.access_token
      if (!token) throw new Error('Access token not received from server')

      setAccessToken(token)

      const user = await getCurrentUser()
      if (!user) throw new Error('Failed to get user profile after login')

      setUser(user)

      // Проверяем наличие организации
      try {
        const org = await CompanyAPI.getCurrentCompany()
        router.push(org?.id ? '/dashboard' : '/onboarding')
      } catch {
        router.push('/onboarding')
      }
    } catch (err) {
      console.error('Login error:', err)
      let message = 'Login failed. Please try again.'
      if (err instanceof AxiosError) {
        const detail = err.response?.data?.detail
        message = typeof detail === 'string' ? detail : detail?.detail || detail?.title || message
      }
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [clearError, setLoading, getCurrentUser, setUser, setError, router])

  const register = useCallback(async (payload: RegisterData) => {
    clearError()
    setLoading(true)
    try {
      // Если бэкенд слушает /register — замени путь
      await api.post('/register', payload)
      router.push(`/verify-email?email=${encodeURIComponent(payload.email)}`)
    } catch (err) {
      console.error('Registration error:', err)
      let message = 'Registration failed. Please try again.'
      if (err instanceof AxiosError) {
        const detail = err.response?.data?.detail
        if (typeof detail === 'string') message = detail
        else if (detail && typeof detail === 'object') {
          if (Array.isArray(detail)) {
            const msgs = detail.map((e: any) => e.msg || e.message).filter(Boolean)
            message = msgs.length ? msgs.join(', ') : message
          } else {
            message = detail.detail || detail.title || message
          }
        }
      }
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [clearError, setError, router, setLoading])

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      await api.post('/auth/logout')
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      clearTokens()
      setUser(null)
      setLoading(false)
      router.push('/login')
    }
  }, [router, setUser, setLoading])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    clearError,
    checkAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}