import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || 'Invalid email or password.'
        )
      }

      if (!data.access_token) {
        throw new Error('No access token was returned by the server.')
      }

      localStorage.setItem('spotsync_token', data.access_token)
      localStorage.setItem('spotsync_logged_in', 'true')
      localStorage.removeItem('spotsync_user_name')

      try {
        const profileResponse = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        })

        if (profileResponse.ok) {
          const profile = await profileResponse.json()
          if (profile.name) {
            localStorage.setItem('spotsync_user_name', profile.name)
          }
        }
      } catch (profileError) {
        console.error('Could not load user profile:', profileError)
      }

      window.history.pushState({}, '', '/home')
      window.dispatchEvent(new PopStateEvent('popstate'))
    } catch (err) {
      setError(err.message || 'Login failed.')
      localStorage.removeItem('spotsync_logged_in')
      localStorage.removeItem('spotsync_token')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <span className="section-kicker">WELCOME BACK</span>
        <h1>Log in to SpotSync</h1>
        <p>Access your parking reservations and saved spots.</p>

        <p className="auth-switch">
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/forgot-password')
              window.dispatchEvent(new PopStateEvent('popstate'))
            }}
          >
            Forgot password?
          </button>
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/register')
              window.dispatchEvent(new PopStateEvent('popstate'))
            }}
          >
            Get started
          </button>
        </p>
      </div>
    </main>
  )
}

