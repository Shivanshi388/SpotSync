import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Car,
  Clock3,
  Heart,
  MapPin,
  Navigation,
  Search,
  Star,
  Zap,
} from 'lucide-react'
import { getParkingOverview } from '../services/parkingService'
import '../styles/explore-purple.css'

const FILTERS = ['All', 'Available', 'Full', 'EV Charging']
// Temporary placeholder positions (approximate), used only when the backend sends none
const FALLBACK_COORDS = {
  'City Center Parking': [28.6692, 77.4538],
  'Metro Plaza Parking': [28.6615, 77.4412],
  'Tech Park Parking': [28.6848, 77.4330],
}

const pinIcon = L.divIcon({
  className: '',
  html: '<div class="ep-pin"><span>P</span></div>',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
})

function toNumber(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function ParkingCard({ parking, selected, saved, onSelect, onSave, onNavigate }) {
  return (
    <article
      className={`ep-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(parking.id)}
    >
      <div className="ep-thumb">
        <Car size={26} />
      </div>

      <div className="ep-card-main">
        <div className="ep-card-top">
          <h3>{parking.name}</h3>

          <button
            type="button"
            className={`ep-save ${saved ? 'saved' : ''}`}
            aria-label={saved ? 'Remove saved parking' : 'Save parking'}
            onClick={(event) => {
              event.stopPropagation()
              onSave(parking.id)
            }}
          >
            <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>

        <p className="ep-address">
          <MapPin size={13} />
          {parking.address || 'Location details unavailable'}
        </p>

        <div className="ep-meta">
          <span>
            Total slots: <b>{parking.total}</b>
          </span>
          <span>
            Available:{' '}
            <b className={parking.available > 0 ? 'green' : 'red'}>
              {parking.available}
            </b>
          </span>
          {parking.distance && (
            <span>
              <Navigation size={12} /> {parking.distance}
            </span>
          )}
          {parking.walking && (
            <span>
              <Clock3 size={12} /> {parking.walking}
            </span>
          )}
          {parking.rating != null && (
            <span>
              <Star size={12} fill="currentColor" /> {parking.rating}
            </span>
          )}
          {parking.ev && (
            <span className="ep-tag">
              <Zap size={12} /> EV
            </span>
          )}
          {parking.covered && <span className="ep-tag">Covered</span>}
        </div>

        <div className="ep-card-bottom">
          <strong>{parking.price != null ? `₹${parking.price}/hour` : ' '}</strong>

          <button
            type="button"
            className="ep-button"
            onClick={(event) => {
              event.stopPropagation()
              onNavigate?.(`/parking-details?parking=${parking.id}`)
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  )
}

function MapPanel({ lots, selected, onSelect }) {
  const withCoords = lots.filter((lot) => lot.lat != null && lot.lng != null)

  if (withCoords.length === 0) {
    return (
      <div className="ep-map-empty">
        <MapPin size={34} />
        <h3>Map locations not available yet</h3>
        <p>
          Your parking data has no latitude and longitude, so pins can't be
          placed on the map yet.
        </p>
      </div>
    )
  }

  const center = selected?.lat != null
    ? [selected.lat, selected.lng]
    : [withCoords[0].lat, withCoords[0].lng]

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="ep-map"
      key={selected?.id ?? 'map'}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap"
      />

      {withCoords.map((lot) => (
        <Marker
          key={lot.id}
          position={[lot.lat, lot.lng]}
          icon={pinIcon}
          eventHandlers={{ click: () => onSelect(lot.id) }}
        >
          <Popup>
            <b>{lot.name}</b>
            <br />
            {lot.available} of {lot.total} spots available
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

export default function ExploreParking({ onNavigate }) {
  const [parkingData, setParkingData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [saved, setSaved] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadParking() {
      try {
        setLoading(true)
        setError('')

        const response = await getParkingOverview()
        const lots = response?.parking_lots ?? []

                const mapped = lots.map((lot) => ({
          id: lot.id,
          name: lot.name || `Parking location ${lot.id}`,
          address: lot.address || '',
          available: Number(lot.available_slots ?? 0),
          total: Number(lot.total_slots ?? 0),
          price: lot.price ?? null,
          rating: lot.rating ?? null,
          distance: lot.distance ?? '',
          walking: lot.walking ?? '',
          ev: Boolean(lot.ev_charging),
          covered: Boolean(lot.covered),
          lat:
            toNumber(lot.latitude ?? lot.lat) ??
            FALLBACK_COORDS[lot.name]?.[0] ??
            null,
          lng:
            toNumber(lot.longitude ?? lot.lng ?? lot.lon) ??
            FALLBACK_COORDS[lot.name]?.[1] ??
            null,
        }))

        if (cancelled) return

        setParkingData(mapped)

        const wanted = new URLSearchParams(window.location.search).get('parking')
        if (wanted) {
          const match = mapped.find(
            (lot) => lot.name === wanted || String(lot.id) === wanted
          )
          if (match) setSelectedId(match.id)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              'Could not load parking locations. Check that the backend is running.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadParking()

    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase()

    return parkingData
      .filter((lot) => {
        if (text) {
          const hit =
            lot.name.toLowerCase().includes(text) ||
            lot.address.toLowerCase().includes(text)
          if (!hit) return false
        }
        if (filter === 'Available') return lot.available > 0
        if (filter === 'Full') return lot.available === 0
        if (filter === 'EV Charging') return lot.ev
        return true
      })
      .sort((a, b) => b.available - a.available)
  }, [parkingData, query, filter])

  const selected = filtered.find((lot) => lot.id === selectedId) ?? filtered[0]

  function toggleSaved(id) {
    setSaved((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  return (
    <main className="ep-page">
      <section className="ep-layout">
        <aside className="ep-list">
          <div className="ep-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by location or parking name"
              aria-label="Search parking"
            />
          </div>

          <div className="ep-pills">
            {FILTERS.map((name) => (
              <button
                key={name}
                type="button"
                className={filter === name ? 'active' : ''}
                onClick={() => setFilter(name)}
              >
                {name}
              </button>
            ))}
          </div>

          <p className="ep-count">
            {loading ? 'Loading...' : `${filtered.length} parking locations`}
          </p>

          {loading && <p className="ep-note">Loading parking locations from the server...</p>}

          {!loading && error && (
            <div className="ep-note" role="alert">
              <strong>Could not load parking</strong>
              <p>{error}</p>
              <button type="button" className="ep-button" onClick={() => window.location.reload()}>
                Try again
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <p className="ep-note">
              {parkingData.length === 0
                ? 'No parking locations available.'
                : 'No parking found. Try a different search or filter.'}
            </p>
          )}

          {!loading &&
            !error &&
            filtered.map((lot) => (
              <ParkingCard
                key={lot.id}
                parking={lot}
                selected={selected?.id === lot.id}
                saved={saved.includes(lot.id)}
                onSelect={setSelectedId}
                onSave={toggleSaved}
                onNavigate={onNavigate}
              />
            ))}
        </aside>

        <div className="ep-map-column">
          <MapPanel lots={filtered} selected={selected} onSelect={setSelectedId} />
        </div>
      </section>
    </main>
  )
}