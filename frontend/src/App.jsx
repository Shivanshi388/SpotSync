import { useEffect, useState } from 'react'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
import ExploreParking from './pages/ExploreParking'
import ParkingDetails from './pages/ParkingDetails'
import BookingDetails from './pages/BookingDetails'
import Payment from './pages/Payment'
import BookingConfirmation from './pages/BookingConfirmation'
import Login from './pages/Login'
import Register from './pages/Register'
import Help from './pages/Help'
import AdminDashboard from './pages/AdminDashboard'
import MyBookings from './pages/MyBookings'
import LiveAvailability from './pages/LiveAvailability'

function App() {
  function navigate(path) {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const isLoggedIn = localStorage.getItem('spotsync_logged_in') === 'true'

  const protectedPaths = [
    '/home',
    '/parking',
    '/parking-details',
    '/booking',
    '/availability',
    '/payment',
    '/booking-confirmation',
    '/bookings',
    '/booking-confirmation',
  ]

  let page = <Login />

  if (protectedPaths.includes(path) && !isLoggedIn) {
    page = <Login />
  } else if (path === '/home') {
    page = <Home />
  } else if (path === '/parking') {
    page = <ExploreParking onNavigate={navigate} />
  } else if (path === '/parking-details') {
    page = <ParkingDetails />
  } else if (path === '/booking') {
    page = <BookingDetails />
  } else if (path === '/payment') {
    page = <Payment />
  } else if (path === '/booking-confirmation') {
    page = <BookingConfirmation />
  } else if (path === '/bookings') {
    page = <MyBookings />
  } else if (path === '/availability') {
    page = <LiveAvailability />
  } else if (path === '/login') {
    page = <Login />
  } else if (path === '/register') {
    page = <Register />
  } else if (path === '/help') {
    page = <Help />
  } else if (path === '/admin') {
    page = <AdminDashboard />
  }


  return <MainLayout>{page}</MainLayout>
}

export default App
