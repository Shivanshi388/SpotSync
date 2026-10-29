import { useState } from 'react'

export default function ForgotPassword() {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    setMessage(
      'Password reset is not enabled yet because phone verification is not configured. Your password has not been changed.'
    )
  }

  function goToLogin() {
    window.history.pushState({}, '', '/login')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <span className="section-kicker">ACCOUNT RECOVERY</span>
        <h1>Forgot your password?</h1>
        <p>
          Password recovery will use your registered mobile number once
          phone verification is configured.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Registered phone number
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Your registered mobile number"
              autoComplete="tel"
              required
            />
          </label>

          {message && (
            <p className="auth-error" role="status">
              {message}
            </p>
          )}

          <button type="submit" className="primary-button">
            Check recovery availability
          </button>
        </form>

        <p className="auth-switch">
          Remembered your password?{' '}
          <button type="button" onClick={goToLogin}>
            Back to login
          </button>
        </p>
      </div>
    </main>
  )
}
