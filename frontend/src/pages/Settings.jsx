import { useState } from 'react'
import { ArrowLeft, Moon, Sun, Bell, ShieldCheck } from 'lucide-react'
import '../styles/mybookings-purple.css'

function go(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Settings() {
  const [dark,setDark] = useState(localStorage.getItem('spotsync_theme') === 'dark')
  const [notifications,setNotifications] = useState(localStorage.getItem('spotsync_notifications') !== 'off')

  function changeTheme(value) {
    setDark(value)
    localStorage.setItem('spotsync_theme',value?'dark':'light')
    document.documentElement.dataset.theme = value?'dark':'light'
    document.documentElement.style.colorScheme = value?'dark':'light'
  }

  function changeNotifications(value) {
    setNotifications(value)
    localStorage.setItem('spotsync_notifications',value?'on':'off')
  }

  return <div className="mb-wrap">
    <aside className="mb-side">
      <div className="mb-user"><span className="mb-avatar">S</span><strong>SpotSync</strong></div>
      <nav>
        <button onClick={() => go('/home')}>Dashboard</button>
        <button onClick={() => go('/bookings')}>My Bookings</button>
        <button onClick={() => go('/vehicles')}>My Vehicles</button>
        <button onClick={() => go('/profile')}>Profile</button>
        <button className="active">Settings</button>
      </nav>
    </aside>
    <section className="mb-main"><div className="mb-card">
      <button onClick={() => go('/bookings')}><ArrowLeft size={16}/> Back to bookings</button>
      <h1>Settings</h1>
      <div style={{display:'grid',gap:22,marginTop:24}}>
        <label style={{display:'flex',gap:12,alignItems:'center'}}>
          {dark?<Moon size={20}/>:<Sun size={20}/>}
          <span><strong>Dark appearance</strong><br/><small>Apply a dark color scheme to this browser.</small></span>
          <input type="checkbox" checked={dark} onChange={e=>changeTheme(e.target.checked)}/>
        </label>
        <label style={{display:'flex',gap:12,alignItems:'center'}}>
          <Bell size={20}/>
          <span><strong>Notification preference</strong><br/><small>Save your preference for notifications in this browser.</small></span>
          <input type="checkbox" checked={notifications} onChange={e=>changeNotifications(e.target.checked)}/>
        </label>
        <div><ShieldCheck size={20}/><h3>Account security</h3><p>Profile and password changes require backend support. No security settings are changed from this page.</p><button type="button" onClick={()=>go('/profile')}>View profile</button></div>
        <button type="button" onClick={()=>{localStorage.removeItem('spotsync_theme');localStorage.removeItem('spotsync_notifications');changeTheme(false);changeNotifications(true)}}>Reset preferences</button>
      </div>
    </div></section>
  </div>
}
