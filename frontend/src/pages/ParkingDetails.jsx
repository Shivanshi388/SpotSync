import { useEffect, useMemo, useState } from 'react'
import {
  Accessibility,
  ArrowLeft,
  Camera,
  Car,
  Check,
  ChevronRight,
  Clock3,
  Headphones,
  Heart,
  MapPin,
  Navigation,
  ShieldCheck,
  Star,
  Zap,
} from 'lucide-react'
import { getParkingOverview } from '../services/parkingService'
import '../styles/details-purple.css'

const slots = [
  { id: 'A01', status: 'available' },
  { id: 'A02', status: 'available' },
  { id: 'A03', status: 'occupied' },
  { id: 'A04', status: 'available' },
  { id: 'A05', status: 'reserved' },
  { id: 'A06', status: 'available' },
  { id: 'B01', status: 'available' },
  { id: 'B02', status: 'occupied' },
  { id: 'B03', status: 'available' },
  { id: 'B04', status: 'available' },
  { id: 'B05', status: 'occupied' },
  { id: 'B06', status: 'available' },
  { id: 'C01', status: 'available' },
  { id: 'C02', status: 'available' },
  { id: 'C03', status: 'reserved' },
  { id: 'C04', status: 'available' },
  { id: 'C05', status: 'available' },
  { id: 'C06', status: 'occupied' },
]

const FALLBACK = {
  name: 'City Center Parking',
  address: 'MG Road, City Center',
  distance: '',
  rating: null,
  reviews: 0,
  available: 0,
  total: 0,
  price: 30,
}

const PHOTO =
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1400&q=80'
const THUMB_POSITIONS = ['center', 'left', 'right', 'bottom']

const facilities = [
  { icon: Camera, label: 'CCTV Security' },
  { icon: Zap, label: 'EV Charging' },
  { icon: Accessibility, label: 'Wheelchair Access' },
  { icon: Headphones, label: '24/7 Support' },
]

function SlotButton({ slot, selected, onSelect }) {
  const disabled = slot.status !== 'available'

  return (
    <button
      type="button"
      className={`parking-slot ${slot.status} ${selected ? 'selected' : ''}`}
      disabled={disabled}
      onClick={() => onSelect(slot.id)}
      aria-label={`${slot.id} ${slot.status}`}
    >
      <Car size={17} />
      <span>{slot.id}</span>
      {selected && (
        <span className="slot-check">
          <Check size={10} />
        </span>
      )}
    </button>
  )
}

export default function ParkingDetails() {
  const [parking, setParking] = useState(FALLBACK)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('facilities')
  const [photo, setPhoto] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadParking() {
      const wanted = new URLSearchParams(window.location.search).get('parking')
      if (!wanted) return

      try {
        const response = await getParkingOverview()
        const lots = response?.parking_lots ?? []
        const lot = lots.find(
          (item) => String(item.id) === wanted || item.name === wanted
        )

        if (!lot || cancelled) return

        setParking({
          name: lot.name || FALLBACK.name,
          address: lot.address || FALLBACK.address,
          distance: lot.distance || '',
          rating: lot.rating ?? null,
          reviews: lot.reviews ?? lot.review_count ?? 0,
          available: Number(lot.available_slots ?? 0),
          total: Number(lot.total_slots ?? 0),
          price: lot.price ?? FALLBACK.price,
        })
      } catch (error) {
        console.error('Failed to load parking details:', error)
      }
    }

    loadParking()

    return () => {
      cancelled = true
    }
  }, [])

  const selected = useMemo(
    () => slots.find((slot) => slot.id === selectedSlot),
    [selectedSlot]
  )

  const occupied = Math.max(parking.total - parking.available, 0)

  function goBack() {
    window.history.back()
  }

  function scrollToSlots() {
    document
      .getElementById('choose-spot')
      ?.scrollIntoView({ behavior: 'smooth' })
  }

  function continueBooking() {
    if (!selectedSlot) return

    window.history.pushState(
      { parking: parking.name, slot: selectedSlot },
      '',
      `/booking?parking=${encodeURIComponent(parking.name)}&slot=${selectedSlot}`
    )

    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <main className="parking-details-page pd-page">
      <div className="container">
        <button type="button" className="back-link" onClick={goBack}>
          <ArrowLeft size={17} />
          Back
        </button>

        <section className="pd-top">
          <div className="pd-gallery">
            <div
              className="pd-photo"
              style={{
                backgroundImage: `url("${PHOTO}")`,
                backgroundPosition: THUMB_POSITIONS[photo],
              }}
            >
              <span className="pd-live">
                <span />
                Live availability
              </span>
            </div>

            <div className="pd-thumbs">
              {THUMB_POSITIONS.map((position, index) => (
                <button
                  key={position}
                  type="button"
                  aria-label={`Photo ${index + 1}`}
                  className={photo === index ? 'active' : ''}
                  style={{
                    backgroundImage: `url("${PHOTO}")`,
                    backgroundPosition: position,
                  }}
                  onClick={() => setPhoto(index)}
                />
              ))}
            </div>
          </div>

          <div className="pd-info">
            <div className="pd-title-row">
              <div>
                <h1>{parking.name}</h1>
                <p className="pd-address">
                  <MapPin size={15} />
                  {parking.address}
                  {parking.distance && <span> · {parking.distance}</span>}
                </p>
              </div>

              <div className="pd-title-actions">
                <span className="pd-open">Open</span>
                <button
                  type="button"
                  className={`pd-heart ${saved ? 'saved' : ''}`}
                  onClick={() => setSaved(!saved)}
                  aria-label={saved ? 'Remove from saved locations' : 'Save location'}
                >
                  <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            <div className="pd-stats">
              <div>
                <span>Total Slots</span>
                <strong>{parking.total}</strong>
              </div>
              <div>
                <span>Available</span>
                <strong className="green">{parking.available}</strong>
              </div>
              <div>
                <span>Occupied</span>
                <strong className="red">{occupied}</strong>
              </div>
            </div>

            <div className="pd-price">
              <strong>₹{parking.price}</strong>
              <span> / hour</span>
            </div>

            <button type="button" className="pd-book" onClick={scrollToSlots}>
              Book Now
            </button>
          </div>
        </section>

        <section className="pd-tabs-card">
          <div className="pd-tabs" role="tablist">
            {[
              ['facilities', 'Facilities'],
              ['reviews', 'Reviews'],
              ['location', 'Location'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={tab === key ? 'active' : ''}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'facilities' && (
            <div className="pd-facilities">
              {facilities.map(({ icon: Icon, label }) => (
                <div key={label}>
                  <Icon size={24} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'reviews' && (
            <div className="pd-panel">
              {parking.rating != null ? (
                <p className="pd-rating">
                  <Star size={18} fill="currentColor" />
                  <strong>{parking.rating}</strong>
                  <span>{parking.reviews} reviews</span>
                </p>
              ) : (
                <p>No reviews yet for this location.</p>
              )}
            </div>
          )}

          {tab === 'location' && (
            <div className="pd-panel">
              <p>
                <MapPin size={16} /> {parking.address}
              </p>
              <a
                className="pd-link"
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${parking.name} ${parking.address}`
                )}`}
              >
                Open in Google Maps
              </a>
            </div>
          )}
        </section>

        <section className="slot-selection-section" id="choose-spot">
          <div className="slot-selection-main">
            <div className="slot-section-heading">
              <div>
                <span className="section-kicker">LIVE PARKING GRID</span>
                <h2>Choose your spot</h2>
                <p>
                  Select an available parking space. Availability updates in
                  real time.
                </p>
              </div>

              <div className="slot-legend">
                <span>
                  <i className="legend-dot available" />
                  Available
                </span>
                <span>
                  <i className="legend-dot selected" />
                  Selected
                </span>
                <span>
                  <i className="legend-dot occupied" />
                  Occupied
                </span>
              </div>
            </div>

            <div className="parking-floor">
              <div className="floor-label">ENTRY</div>

              <div className="parking-lane">
                <div className="lane-arrow">
                  <Navigation size={16} />
                </div>
              </div>

              <div className="slot-row">
                {slots.slice(0, 6).map((slot) => (
                  <SlotButton
                    key={slot.id}
                    slot={slot}
                    selected={selectedSlot === slot.id}
                    onSelect={setSelectedSlot}
                  />
                ))}
              </div>

              <div className="parking-divider">
                <span>A ROW</span>
              </div>

              <div className="slot-row">
                {slots.slice(6, 12).map((slot) => (
                  <SlotButton
                    key={slot.id}
                    slot={slot}
                    selected={selectedSlot === slot.id}
                    onSelect={setSelectedSlot}
                  />
                ))}
              </div>

              <div className="parking-divider">
                <span>B ROW</span>
              </div>

              <div className="slot-row">
                {slots.slice(12, 18).map((slot) => (
                  <SlotButton
                    key={slot.id}
                    slot={slot}
                    selected={selectedSlot === slot.id}
                    onSelect={setSelectedSlot}
                  />
                ))}
              </div>

              <div className="floor-exit">
                <span>EXIT</span>
                <ChevronRight size={18} />
              </div>
            </div>
          </div>

          <aside className="booking-summary-card">
            <div className="summary-card-heading">
              <div>
                <span className="section-kicker">YOUR RESERVATION</span>
                <h3>Booking summary</h3>
              </div>

              <div className="summary-live">
                <span />
                Live
              </div>
            </div>

            <div className="summary-location">
              <div className="summary-icon">
                <MapPin size={18} />
              </div>

              <div>
                <strong>{parking.name}</strong>
                <span>{parking.address}</span>
              </div>
            </div>

            <div className="summary-divider" />

            <div className="summary-detail">
              <span>Selected spot</span>
              <strong>{selected ? selected.id : 'Select a spot'}</strong>
            </div>

            <div className="summary-detail">
              <span>Availability</span>
              <strong>{parking.available} spots</strong>
            </div>

            <div className="summary-detail">
              <span>Rate</span>
              <strong>₹{parking.price}/hr</strong>
            </div>

            <div className="summary-note">
              <ShieldCheck size={15} />
              <span>Your spot will be held during checkout.</span>
            </div>

            <button
              type="button"
              className="reserve-button"
              disabled={!selectedSlot}
              onClick={continueBooking}
            >
              {selectedSlot ? `Continue with ${selectedSlot}` : 'Select a spot'}
              <ChevronRight size={17} />
            </button>

            <p className="secure-note">
              No payment is charged until you confirm your booking.
            </p>
          </aside>
        </section>
      </div>
    </main>
  )
}