import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setToken } from '../api/client'
import { useAuth } from '../context/AuthContext'

// Handles the OAuth redirect: the API bounces back to /auth#token=<JWT>.
// Read the fragment, persist the token, refresh the session, then go home.
export function AuthCallback() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [failed, setFailed] = useState(false)
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const hash = window.location.hash.replace(/^#/, '')
    const params = new URLSearchParams(hash)
    const token = params.get('token')

    if (!token) {
      setFailed(true)
      return
    }

    setToken(token)
    // Clear the fragment so the JWT doesn't linger in the URL / history.
    window.history.replaceState(null, '', window.location.pathname)
    void refresh().then(() => navigate('/', { replace: true }))
  }, [navigate, refresh])

  if (failed) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="banner error" style={{ marginBottom: 16 }}>
            No sign-in token was found. Please try logging in again.
          </div>
          <button
            className="btn primary"
            onClick={() => navigate('/login', { replace: true })}
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">
          Herm<span className="accent">uz</span>
        </div>
        <p>
          <span className="spinner" />
          Signing you in…
        </p>
      </div>
    </div>
  )
}
