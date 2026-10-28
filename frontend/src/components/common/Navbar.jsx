import { MapPin, Menu, X, UserRound } from 'lucide-react'

import { useEffect, useState } from 'react'

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function goHome(hash = '') {
  window.history.pushState({}, '', `/home${hash}`)
  window.dispatchEvent(new PopStateEvent('popstate'))

  setTimeout(() => {
    if (hash) {
      document.getElementById(hash.replace('#', ''))?.scrollIntoView({
        behavior: 'smooth',
      })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, 100)
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem('spotsync_logged_in') === 'true'
  )
  const [userName, setUserName] = useState(
    localStorage.getItem('spotsync_user_name') || ''
  )
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    let cancelled = false

    async function syncAuth() {
      const loggedIn = localStorage.getItem('spotsync_logged_in') === 'true'
      const token = localStorage.getItem('spotsync_token')

      setIsLoggedIn(loggedIn)
      setPath(window.location.pathname)

      if (!loggedIn) {
        setUserName('')
        return
      }

      const savedName = localStorage.getItem('spotsync_user_name')
      if (savedName) setUserName(savedName)

      if (!token) return

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/auth/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        if (!response.ok) return

        const user = await response.json()
        if (cancelled) return

        const name = user.name || user.full_name || ''
        if (name) {
          localStorage.setItem('spotsync_user_name', name)
          setUserName(name)
        }
      } catch (error) {
        console.error('Could not load profile name:', error)
      }
    }

    syncAuth()

    const handleNavigation = () => syncAuth()
    window.addEventListener('popstate', handleNavigation)
    window.addEventListener('storage', handleNavigation)

    return () => {
      cancelled = true
      window.removeEventListener('popstate', handleNavigation)
      window.removeEventListener('storage', handleNavigation)
    }
  }, [])

  function handleHome(hash = '') {
    setMenuOpen(false)
    goHome(hash)
  }

  function handleNavigation(destination) {
    setMenuOpen(false)
    navigate(destination)
  }

  function logout() {
    localStorage.removeItem('spotsync_logged_in')
    localStorage.removeItem('spotsync_token')
    localStorage.removeItem('spotsync_user_name')
    setIsLoggedIn(false)
    setUserName('')
    setMenuOpen(false)
    navigate('/login')
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <button
          type="button"
          className="brand"
          onClick={() => handleHome()}
          aria-label="SpotSync home"
        >
          <span className="brand-mark">
            <MapPin size={20} fill="currentColor" />
          </span>
          <span>
            Spot<span>Sync</span>
          </span>
        </button>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <button
            type="button"
            className={path === '/home' ? 'active' : ''}
            onClick={() => handleHome('#home')}
          >
            Home
          </button>
                    {isLoggedIn && (
            <button
              type="button"
              className={path === '/bookings' ? 'active' : ''}
              onClick={() => handleNavigation('/bookings')}
            >
              My Bookings
            </button>
          )}
          
          <button
            type="button"
            className={path === '/parking' ? 'active' : ''}
            onClick={() => handleNavigation('/parking')}
          >
            Find Parking
          </button>

          {isLoggedIn && (
            <button
              type="button"
              className={path === '/availability' ? 'active' : ''}
              onClick={() => handleNavigation('/availability')}
            >
              Live Availability
            </button>
          )}

          <button
            type="button"
            className={path === '/' && window.location.hash === '#how-it-works' ? 'active' : ''}
            onClick={() => handleHome('#how-it-works')}
          >
            How It Works
          </button>
        </nav>

        <div className="nav-actions">
          {isLoggedIn ? (
            <>
              <div className="nav-user-greeting">
                <span className="nav-user-icon">
                  <UserRound size={17} />
                </span>
                <span>Hi, {userName ? userName.split(' ')[0] : 'there'}</span>
              </div>

              <button
                type="button"
                className="nav-logout-button"
                onClick={logout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="login-button"
                onClick={() => handleNavigation('/login')}
              >
                Log in
              </button>
              <button
                type="button"
                className="primary-button small"
                onClick={() => handleNavigation('/register')}
              >
                Get Started
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>
    </header>
  )
}

export default Navbar
