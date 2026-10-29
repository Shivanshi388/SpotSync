import { useEffect, useState } from 'react'
import { ArrowLeft, RefreshCw, UserRound } from 'lucide-react'
import { getCurrentUser } from '../services/authService'
import '../styles/mybookings-purple.css'

function go(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Profile() {
  const [user,setUser] = useState(null)
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(true)

  async function refresh() {
    setLoading(true); setError('')
    try { setUser(await getCurrentUser()) }
    catch(e) { setError(e.response?.data?.detail || 'Could not load your profile. Please sign in again if your session expired.') }
    finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [])

  return <div className="mb-wrap">
    <aside className="mb-side">
      <div className="mb-user"><span className="mb-avatar">S</span><strong>SpotSync</strong></div>
      <nav>
        <button onClick={() => go('/home')}>Dashboard</button>
        <button onClick={() => go('/bookings')}>My Bookings</button>
        <button onClick={() => go('/vehicles')}>My Vehicles</button>
        <button className="active">Profile</button>
        <button onClick={() => go('/settings')}>Settings</button>
      </nav>
    </aside>
    <section className="mb-main"><div className="mb-card">
      <button onClick={() => go('/bookings')}><ArrowLeft size={16}/> Back to bookings</button>
      <h1><UserRound size={24}/> My Profile</h1>
      {loading ? <p>Loading profile…</p> : error ? <p role="alert">{error}</p> : <div style={{display:'grid',gap:14,marginTop:20}}>
        {Object.entries(user || {}).filter(([key,value]) => !/password|token|secret/i.test(key) && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')).map(([key,value])=><div key={key}><strong>{key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</strong><p>{String(value)}</p></div>)}
        <p>Profile editing is unavailable because the current backend does not expose a profile-update endpoint.</p>
      </div>}
      <button type="button" onClick={refresh}><RefreshCw size={15}/> Refresh profile</button>
    </div></section>
  </div>
}
