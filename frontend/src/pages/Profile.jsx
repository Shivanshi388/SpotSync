import { useEffect, useState } from 'react'
import {
  ArrowLeft, RefreshCw, UserRound, Mail, ShieldCheck,
  CalendarDays, CarFront, Settings, LayoutDashboard,
  CircleUserRound, CheckCircle2, AlertCircle
} from 'lucide-react'
import { getCurrentUser } from '../services/authService'
import '../styles/profile-page.css'

function go(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function formatLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

function initials(name) {
  return String(name || 'SpotSync User')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')
}

export default function Profile() {
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const data = await getCurrentUser()
      setUser(data)
    } catch (e) {
      setError(
        e.response?.data?.detail ||
        'Unable to load your profile. Please check your login and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const safeUser = user && typeof user === 'object' ? user : {}
  const name = safeUser.name || localStorage.getItem('spotsync_user_name') || 'SpotSync User'
  const email = safeUser.email || ''
  const role = safeUser.role || 'user'
  const excluded = /password|token|secret|credential/i
  const fields = Object.entries(safeUser).filter(
    ([key, value]) =>
      !excluded.test(key) &&
      !/^(id|name|email|role)$/i.test(key) &&
      value !== null &&
      value !== undefined &&
      ['string', 'number', 'boolean'].includes(typeof value)
  )

  return (
    <div className="profile-page">
      <aside className="profile-sidebar">
        <div className="profile-brand">
          <span className="profile-brand-icon"><CarFront size={23} /></span>
          <span>Spot<span>Sync</span></span>
        </div>

        <p className="profile-menu-label">WORKSPACE</p>
        <nav className="profile-menu">
          <button onClick={() => go('/home')}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button onClick={() => go('/bookings')}>
            <CalendarDays size={18} /> My Bookings
          </button>
          <button onClick={() => go('/vehicles')}>
            <CarFront size={18} /> My Vehicles
          </button>
          <button className="selected" aria-current="page">
            <CircleUserRound size={18} /> Profile
          </button>
          <button onClick={() => go('/settings')}>
            <Settings size={18} /> Settings
          </button>
        </nav>

        <div className="profile-sidebar-note">
          <ShieldCheck size={20} />
          <div>
            <strong>Your account</strong>
            <span>Your parking journey, organized.</span>
          </div>
        </div>
      </aside>

      <main className="profile-content">
        <button className="profile-back" onClick={() => go('/bookings')}>
          <ArrowLeft size={17} /> Back to bookings
        </button>

        <div className="profile-heading">
          <div>
            <span className="profile-eyebrow">YOUR ACCOUNT</span>
            <h1>My Profile</h1>
            <p>Manage your account details and view your profile information.</p>
          </div>
          <button
            className="profile-refresh"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'profile-spinning' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="profile-alert" role="alert">
            <AlertCircle size={19} />
            <span>{error}</span>
            <button onClick={refresh}>Try again</button>
          </div>
        )}

        <section className="profile-hero">
          <div className="profile-hero-decoration profile-decoration-one" />
          <div className="profile-hero-decoration profile-decoration-two" />
          <div className="profile-avatar">{initials(name)}</div>
          <div className="profile-hero-info">
            <span className="profile-member-label">SPOTSYNC MEMBER</span>
            <h2>{loading ? 'Loading your profile…' : name}</h2>
            <p>{email || 'Your account details'}</p>
            <span className="profile-status">
              <CheckCircle2 size={14} /> Account information
            </span>
          </div>
          <div className="profile-hero-icon"><UserRound size={34} /></div>
        </section>

        <section className="profile-section">
          <div className="profile-section-heading">
            <div className="profile-section-icon"><UserRound size={19} /></div>
            <div>
              <h2>Personal information</h2>
              <p>Your details associated with SpotSync</p>
            </div>
          </div>

          {loading ? (
            <div className="profile-loading">
              <span className="profile-loader" />
              Loading your account details…
            </div>
          ) : !error ? (
            <div className="profile-info-grid">
              <div className="profile-info-card">
                <span className="profile-info-icon"><UserRound size={18} /></span>
                <div>
                  <span className="profile-field-label">Full name</span>
                  <strong>{name}</strong>
                </div>
              </div>
              <div className="profile-info-card">
                <span className="profile-info-icon"><Mail size={18} /></span>
                <div>
                  <span className="profile-field-label">Email address</span>
                  <strong className={!email ? 'profile-muted' : ''}>
                    {email || 'Not provided'}
                  </strong>
                </div>
              </div>
              <div className="profile-info-card">
                <span className="profile-info-icon"><ShieldCheck size={18} /></span>
                <div>
                  <span className="profile-field-label">Account role</span>
                  <strong className="profile-role">{role}</strong>
                </div>
              </div>

              {fields.map(([key, value]) => (
                <div className="profile-info-card" key={key}>
                  <span className="profile-info-icon"><CircleUserRound size={18} /></span>
                  <div>
                    <span className="profile-field-label">{formatLabel(key)}</span>
                    <strong>{String(value)}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="profile-help-card">
          <div className="profile-help-icon"><ShieldCheck size={23} /></div>
          <div>
            <h3>Your account, your journey</h3>
            <p>
              Your profile information is retrieved securely from your SpotSync account.
              Profile editing is not available yet.
            </p>
          </div>
        </section>

        <footer className="profile-footer">
          <span>Spot<span>Sync</span></span>
          <span>Smart parking. Simpler journeys.</span>
        </footer>
      </main>
    </div>
  )
}
