import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_ORIGIN } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { OrreryMark } from '../components/OrreryMark'

const ERROR_MESSAGES: Record<string, string> = {
  not_a_member:
    "That Discord account isn't a member of the server. Ask an admin for an invite, then try again.",
  oauth_failed: 'Discord sign-in failed. Please try again.'
}

export function Login() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  // Already authenticated? Skip the login screen.
  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [loading, user, navigate])

  const errorKey = params.get('error')
  const errorMessage = errorKey
    ? (ERROR_MESSAGES[errorKey] ?? 'Sign-in failed. Please try again.')
    : null

  const startLogin = () => {
    window.location.href = `${API_ORIGIN}/auth/login`
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">
          <OrreryMark size={30} />
          Herm<span className="accent">uz</span>
        </div>
        <p>Scheduling for the group&apos;s games, game days, and campaigns.</p>
        {errorMessage && (
          <div className="banner error" style={{ marginBottom: 16 }}>
            {errorMessage}
          </div>
        )}
        <button className="btn primary" onClick={startLogin}>
          Log in with Discord
        </button>
      </div>
    </div>
  )
}
