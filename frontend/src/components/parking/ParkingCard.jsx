import { MapPin, Heart, Star, Zap, CarFront, ArrowRight } from 'lucide-react'

function ParkingCard({ parking, saved, onSave }) {

  function handleOpenDetails() {
    window.history.pushState({}, '', '/parking-details')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  function handleSave(event) {
    event.stopPropagation()
    onSave(parking.id)
  }

  return (
    <article
      className="parking-card"
      onClick={handleOpenDetails}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          handleOpenDetails()
        }
      }}
    >
      <div className="parking-card-visual">
        <div className="parking-card-image">
          <MapPin size={28} />
        </div>

        <button
          className={`parking-save-button ${saved ? 'saved' : ''}`}
          onClick={handleSave}
          aria-label={saved ? 'Remove from saved parking' : 'Save parking'}
        >
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>

        <span className="parking-availability">
          <span />
          Available
        </span>
      </div>

      <div className="parking-card-content">
        <div className="parking-card-title-row">
          <div>
            <h3>{parking.name}</h3>

            <p className="parking-address">
              <MapPin size={14} />
              {parking.address}
            </p>
          </div>

          <div className="parking-rating">
            <Star size={14} fill="currentColor" />
            <span>{parking.rating}</span>
          </div>
        </div>

        <div className="parking-card-meta">
          <span>{parking.distance} away</span>
          <span>{parking.walking}</span>
        </div>

        <div className="parking-card-features">
          <span>
            <CarFront size={14} />
            {parking.available}/{parking.total} spots
          </span>

          {parking.ev && (
            <span>
              <Zap size={14} />
              EV
            </span>
          )}

          {parking.covered && <span>Covered</span>}
        </div>

        <div className="parking-card-footer">
          <div className="parking-price">
            <strong>₹{parking.price}</strong>
            <span>/hr</span>
          </div>

          <button
            className="parking-details-button"
            onClick={(event) => {
              event.stopPropagation()
              handleOpenDetails()
            }}
          >
            View details
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="parking-reviews">
          <Star size={13} fill="currentColor" />
          <span>{parking.rating}</span>
          <span>({parking.reviews} reviews)</span>
        </div>
      </div>
    </article>
  )
}

export default ParkingCard



