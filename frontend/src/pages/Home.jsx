import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CalendarCheck,
  Car,
  Clock,
  Clock3,
  CreditCard,
  MapPin,
  Search,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import api from '../services/api'

const strip = [
  { icon: Search, title: 'Find Parking', text: 'Locate nearby parking facilities' },
  { icon: CalendarCheck, title: 'Book Slot', text: 'Reserve your spot in advance' },
  { icon: CreditCard, title: 'Pay Securely', text: 'Multiple payment options' },
  { icon: Clock, title: 'Save Time', text: 'Skip the hassle, park faster' },
]

const features = [
  {
    icon: MapPin,
    title: 'Find nearby',
    description:
      'Discover available parking spaces around you with live location and availability information.',
  },
  {
    icon: Clock3,
    title: 'Reserve ahead',
    description:
      'Book your parking spot before you arrive and spend less time searching for a space.',
  },
  {
    icon: ShieldCheck,
    title: 'Park confidently',
    description:
      'Get reliable availability information and a simple digital parking pass for every booking.',
  },
  {
    icon: Zap,
    title: 'Real-time smart',
    description:
      'Smart sensors and intelligent predictions keep parking availability up to date.',
  },
]

function Home() {
  const [location, setLocation] = useState('')
  const [parkingSpots, setParkingSpots] = useState([])
  const [parkingLoading, setParkingLoading] = useState(true)
  const [parkingError, setParkingError] = useState('')

  useEffect(() => {
    api
      .get('/parking/overview')
      .then((response) => {
        setParkingSpots(response.data.parking_lots || [])
      })
      .catch((error) => {
        console.error('Failed to load parking data:', error)
        setParkingError('Unable to load parking data. Please try again.')
      })
      .finally(() => {
        setParkingLoading(false)
      })
  }, [])

  const openParkingPage = () => {
    window.history.pushState({}, '', '/parking')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const openParkingSpot = (spot) => {
    window.history.pushState(
      {},
      '',
      `/parking?parking=${encodeURIComponent(spot.name || spot.id)}`
    )
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <>
      <section className="sp-hero" id="home">
        <div className="sp-hero-overlay">
          <h1>
            Smart Parking
            <br />
            Made Simple
          </h1>

          <p>
            Find available parking slots, book in advance,
            <br />
            and enjoy a hassle-free parking experience.
          </p>

          <div className="sp-hero-search">
            <MapPin size={19} />

            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') openParkingPage()
              }}
              placeholder="Search location (e.g. City Center, Ghaziabad)"
              aria-label="Parking location"
            />

            <button type="button" onClick={openParkingPage}>
              Search
            </button>
          </div>

          <div className="sp-hero-stats">
            <span><b>1,200+</b> Parking spots</span>
            <span><b>98%</b> Availability accuracy</span>
            <span><b>24/7</b> Live monitoring</span>
          </div>
        </div>

        <div className="sp-hero-strip">
          {strip.map((item) => {
            const Icon = item.icon

            return (
              <div className="sp-strip-item" key={item.title}>
                <Icon size={26} />
                <h4>{item.title}</h4>
                <span>{item.text}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="parking-section" id="parking">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="section-kicker">NEARBY PARKING</span>
              <h2>Spaces available right now</h2>
            </div>

            <button className="text-button" onClick={openParkingPage}>
              View all
              <ArrowRight size={17} />
            </button>
          </div>

          <div className="parking-grid">
            {parkingLoading ? (
              <p>Loading parking spaces...</p>
            ) : parkingError ? (
              <p role="alert">{parkingError}</p>
            ) : parkingSpots.length === 0 ? (
              <p>No parking spaces available right now.</p>
            ) : (
              parkingSpots.map((spot) => (
                <article
                  className="parking-card"
                  key={spot.id ?? spot.name}
                  role="link"
                  tabIndex={0}
                  onClick={() => openParkingSpot(spot)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openParkingSpot(spot)
                    }
                  }}
                >
                  <div className="parking-card-icon">
                    <Car size={21} />
                  </div>

                  <div className="parking-card-main">
                    <div className="parking-card-title">
                      <h3>{spot.name || 'Parking location'}</h3>

                      <span
                        className={
                          Number(spot.available_slots) > 0
                            ? 'available'
                            : 'unavailable'
                        }
                      >
                        {Number(spot.available_slots) > 0
                          ? 'Available'
                          : 'Full'}
                      </span>
                    </div>

                    <p>
                      <MapPin size={15} />
                      {spot.address || 'Location details unavailable'}
                    </p>

                    <div className="parking-card-bottom">
                      <span>
                        <strong>{spot.available_slots ?? 0}</strong> /{' '}
                        {spot.total_slots ?? 0} spots available
                      </span>

                      <strong>
                        {spot.occupancy_rate != null
                          ? `${Math.round(
                              Number(spot.occupancy_rate) <= 1
                                ? Number(spot.occupancy_rate) * 100
                                : Number(spot.occupancy_rate)
                            )}% occupied`
                          : 'Occupancy unavailable'}
                      </strong>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="features-section" id="how-it-works">
        <div className="container">
          <div className="section-heading centered">
            <span className="section-kicker">WHY SPOTSYNC</span>

            <h2>Parking without the hassle</h2>

            <p>
              Everything you need to find, reserve, and manage parking in one
              simple experience.
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature) => {
              const Icon = feature.icon

              return (
                <article className="feature-card" key={feature.title}>
                  <div className="feature-icon">
                    <Icon size={23} />
                  </div>

                  <h3>{feature.title}</h3>

                  <p>{feature.description}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}

export default Home