import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { meApi } from '../api'
import { clearToken, getToken, UNAUTHORIZED_EVENT } from '../api/client'
import type { User } from '../types'

interface AuthState {
  user: User | null
  loading: boolean
  isAdmin: boolean
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const me = await meApi.get()
      setUser(me)
    } catch {
      // A 401 clears the token in the client; any other failure leaves the
      // user logged out for this session.
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // React to 401s raised anywhere in the app.
  useEffect(() => {
    const handler = () => setUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, handler)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      isAdmin: user?.isAdmin ?? false,
      logout,
      refresh
    }),
    [user, loading, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
