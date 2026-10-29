
import { useEffect, useState } from 'react'
import {
  CarFront,
  MapPin,
  ParkingSquare,
  Activity,
  RefreshCw,
  CalendarCheck,
  IndianRupee,
  TrendingUp,
} from 'lucide-react'
import api from '../services/api'

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <article className="admin-stat-card">
      <div className="admin-stat-top">
        <span>{title}</span>
        <Icon size={21} />
      </div>
      <h2>{value}</h2>
      <p>{subtitle}</p>
    </article>
  )
}

function formatINR(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function AdminDashboard() {
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analytics, setAnalytics] = useState([])
  const [hourlyPredictions, setHourlyPredictions] = useState([])
  const [analyticsError, setAnalyticsError] = useState('')

  async function loadDashboard() {
    setLoading(true)
    setError('')
    setAnalyticsError('')

    try {
      const response = await api.get('/parking/overview')
      const parkingLots = Array.isArray(response.data?.parking_lots)
        ? response.data.parking_lots
        : []

      setLots(parkingLots)

      // Load analytics and prediction history for each parking lot.
      const results = await Promise.all(
        parkingLots.map(async (lot) => {
          const id = lot.id ?? lot.parking_lot_id

          if (id == null) {
            return { analytics: null, predictions: [] }
          }

          const [analyticsResult, predictionResult] =
            await Promise.allSettled([
              api.get(`/analytics/parking/${id}`),
              api.get(`/api/predictions/history/${id}`),
            ])

          return {
            analytics:
              analyticsResult.status === 'fulfilled'
                ? analyticsResult.value.data
                : null,
            predictions:
              predictionResult.status === 'fulfilled'
                ? predictionResult.value.data?.predictions ?? []
                : [],
          }
        })
      )

      const validAnalytics = results
        .map((item) => item.analytics)
        .filter(Boolean)

      setAnalytics(validAnalytics)

      const predictionRecords = results.flatMap(
        (item) => item.predictions
      )

      // Group saved predictions by hour and calculate average occupancy.
      const groups = new Map()

      predictionRecords.forEach((prediction) => {
        const hour = Number(prediction.prediction_hour)
        const value = Number(prediction.predicted_occupancy)

        if (
          !Number.isInteger(hour) ||
          hour < 0 ||
          hour > 23 ||
          !Number.isFinite(value)
        ) {
          return
        }

        if (!groups.has(hour)) {
          groups.set(hour, [])
        }

        groups.get(hour).push(value * 100)
      })

      const hourlyData = [...groups.entries()]
        .map(([hour, values]) => ({
          hour,
          average:
            values.reduce((sum, value) => sum + value, 0) /
            values.length,
          count: values.length,
        }))
        .sort((a, b) => a.hour - b.hour)

      setHourlyPredictions(hourlyData)

      if (validAnalytics.length < parkingLots.length) {
        setAnalyticsError(
          'Analytics could not be loaded for every parking location. Summary totals may be incomplete.'
        )
      } else if (predictionRecords.length === 0) {
        setAnalyticsError(
          'No saved predictions are available yet. Generate predictions to populate the hourly chart.'
        )
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Unable to load parking data. Check that the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const totalSlots = lots.reduce(
    (sum, lot) => sum + Math.max(0, Number(lot.total_slots) || 0),
    0
  )

  const availableSlots = lots.reduce(
    (sum, lot) =>
      sum + Math.max(0, Number(lot.available_slots) || 0),
    0
  )

  const occupiedSlots = lots.reduce(
    (sum, lot) =>
      sum + Math.max(0, Number(lot.occupied_slots) || 0),
    0
  )

  const occupancy = totalSlots
    ? Math.round((occupiedSlots / totalSlots) * 100)
    : 0

  const totalBookings = analytics.reduce(
    (sum, item) =>
      sum + (Number(item.bookings?.total_bookings) || 0),
    0
  )

  const netRevenue = analytics.reduce(
    (sum, item) =>
      sum + (Number(item.revenue?.net_revenue) || 0),
    0
  )

  const paymentCount = analytics.reduce(
    (sum, item) =>
      sum +
      (Number(item.revenue?.successful_payment_count) || 0),
    0
  )

  const predictionCount = analytics.reduce(
    (sum, item) =>
      sum + (Number(item.predictions?.prediction_count) || 0),
    0
  )

  const statusCounts = {}

  analytics.forEach((item) => {
    Object.entries(item.bookings?.status_counts ?? {}).forEach(
      ([status, count]) => {
        statusCounts[status] =
          (statusCounts[status] || 0) + Number(count || 0)
      }
    )
  })

  const cardStyle = {
    background: '#ffffff',
    border: '1px solid #e4e9e5',
    borderRadius: '16px',
    padding: '22px',
  }

  const mutedStyle = {
    color: '#66736a',
    fontSize: 14,
  }

  return (
    <div
      className="container"
      style={{ paddingTop: 32, paddingBottom: 48 }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 28,
        }}
      >
        <div>
          <p
            style={{
              color: '#7b68c8',
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            SPOTSYNC OPERATIONS
          </p>

          <h1 style={{ margin: 0 }}>Admin Dashboard</h1>

          <p style={mutedStyle}>
            Monitor parking capacity, bookings, revenue and predicted
            demand.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="primary-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <RefreshCw size={17} />
          {loading ? 'Refreshing...' : 'Refresh data'}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: 16,
            marginBottom: 20,
            borderRadius: 12,
            background: '#fff1f0',
            color: '#a12622',
          }}
        >
          {error}
          <button
            type="button"
            onClick={loadDashboard}
            style={{ marginLeft: 12 }}
          >
            Retry
          </button>
        </div>
      )}

      {analyticsError && (
        <p
          role="status"
          style={{
            padding: 12,
            borderRadius: 10,
            background: '#f5f2ff',
            color: '#57449c',
          }}
        >
          {analyticsError}
        </p>
      )}

      {loading && lots.length === 0 ? (
        <p role="status">Loading parking overview...</p>
      ) : (
        <>
          {/* Existing parking summary cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 18,
              marginBottom: 28,
            }}
          >
            <StatCard
              title="Parking Locations"
              value={lots.length}
              subtitle="Locations returned by the API"
              icon={MapPin}
            />

            <StatCard
              title="Total Capacity"
              value={totalSlots}
              subtitle="Parking slots across listed locations"
              icon={ParkingSquare}
            />

            <StatCard
              title="Available Slots"
              value={availableSlots}
              subtitle="Slots currently reported available"
              icon={CarFront}
            />

            <StatCard
              title="Occupancy Rate"
              value={`${occupancy}%`}
              subtitle={`${occupiedSlots} occupied slots`}
              icon={Activity}
            />

            {/* Added analytics summary cards */}
            <StatCard
              title="Total Bookings"
              value={analytics.length ? totalBookings : '—'}
              subtitle="Across locations with available analytics"
              icon={CalendarCheck}
            />

            <StatCard
              title="Net Revenue"
              value={analytics.length ? formatINR(netRevenue) : '—'}
              subtitle="After processed refunds"
              icon={IndianRupee}
            />
          </div>

          {/* Added booking and revenue summaries */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 18,
              marginBottom: 28,
            }}
          >
            <section style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Booking Status</h2>

              {analytics.length === 0 ? (
                <p style={mutedStyle}>
                  Booking analytics are unavailable.
                </p>
              ) : Object.keys(statusCounts).length === 0 ? (
                <p style={mutedStyle}>
                  No booking status records were returned.
                </p>
              ) : (
                Object.entries(statusCounts).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px 0',
                        borderBottom: '1px solid #eef0ee',
                      }}
                    >
                      <span style={{ textTransform: 'capitalize' }}>
                        {status}
                      </span>
                      <strong>{count}</strong>
                    </div>
                  )
                )
              )}
            </section>

            <section style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Revenue Summary</h2>

              {analytics.length === 0 ? (
                <p style={mutedStyle}>
                  Revenue analytics are unavailable.
                </p>
              ) : (
                <>
                  <p style={mutedStyle}>Payment records counted by API</p>
                  <h2>{paymentCount}</h2>

                  <p style={mutedStyle}>Net revenue</p>
                  <h2>{formatINR(netRevenue)}</h2>

                  <p style={mutedStyle}>
                    Aggregated across {analytics.length} of {lots.length}{' '}
                    locations. Verify payment/refund accounting before
                    using these figures for financial reporting.
                  </p>
                </>
              )}
            </section>
          </div>

          {/* Existing parking location table */}
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>
              Parking Location Overview
            </h2>

            <p style={mutedStyle}>
              Availability and capacity reported by the backend.
            </p>

            {lots.length === 0 ? (
              <p>No parking locations were returned by the API.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        textAlign: 'left',
                        borderBottom: '1px solid #e4e9e5',
                      }}
                    >
                      <th style={{ padding: '14px 10px' }}>Location</th>
                      <th style={{ padding: '14px 10px' }}>Total slots</th>
                      <th style={{ padding: '14px 10px' }}>Available</th>
                      <th style={{ padding: '14px 10px' }}>Occupied</th>
                      <th style={{ padding: '14px 10px' }}>Occupancy</th>
                    </tr>
                  </thead>

                  <tbody>
                    {lots.map((lot, index) => {
                      const total = Math.max(
                        0,
                        Number(lot.total_slots) || 0
                      )
                      const available = Math.max(
                        0,
                        Number(lot.available_slots) || 0
                      )
                      const occupied = Math.max(
                        0,
                        Number(lot.occupied_slots) || 0
                      )
                      const rate = total
                        ? Math.min(
                            100,
                            Math.round((occupied / total) * 100)
                          )
                        : 0

                      return (
                        <tr
                          key={lot.id ?? lot.parking_lot_id ?? index}
                          style={{
                            borderBottom: '1px solid #eef0ee',
                          }}
                        >
                          <td style={{ padding: '16px 10px' }}>
                            <strong>
                              {lot.name || 'Unnamed location'}
                            </strong>
                            <div
                              style={{
                                color: '#66736a',
                                fontSize: 13,
                              }}
                            >
                              {lot.address || 'Address unavailable'}
                            </div>
                          </td>

                          <td style={{ padding: '16px 10px' }}>
                            {total}
                          </td>
                          <td style={{ padding: '16px 10px' }}>
                            {available}
                          </td>
                          <td style={{ padding: '16px 10px' }}>
                            {occupied}
                          </td>

                          <td
                            style={{
                              padding: '16px 10px',
                              minWidth: 120,
                            }}
                          >
                            <div
                              style={{
                                background: '#eeeaf9',
                                height: 7,
                                borderRadius: 8,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${rate}%`,
                                  height: '100%',
                                  background: '#7b68c8',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: 13 }}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Added predicted occupancy chart */}
          <section
            style={{
              ...cardStyle,
              marginTop: 28,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <TrendingUp size={22} color="#7b68c8" />
              <h2 style={{ margin: 0 }}>
                Predicted Occupancy by Hour
              </h2>
            </div>

            <p style={mutedStyle}>
              Average saved model predictions grouped by hour. These
              values are predictions, not measured historical occupancy.
            </p>

            {hourlyPredictions.length === 0 ? (
              <p style={mutedStyle}>
                No saved prediction history is available yet. Generate
                predictions to populate this chart.
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'end',
                  gap: 10,
                  height: 230,
                  padding: '20px 4px 0',
                  overflowX: 'auto',
                }}
              >
                {hourlyPredictions.map((item) => {
                  const height = Math.max(
                    3,
                    Math.min(100, item.average)
                  )

                  return (
                    <div
                      key={item.hour}
                      title={`${item.hour}:00 — ${item.average.toFixed(1)}% average predicted occupancy (${item.count} predictions)`}
                      style={{
                        flex: '1 0 24px',
                        minWidth: 24,
                        maxWidth: 56,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'end',
                        alignItems: 'center',
                        gap: 7,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: '#536158',
                        }}
                      >
                        {Math.round(item.average)}%
                      </span>

                      <div
                        style={{
                          height: `${height}%`,
                          width: '100%',
                          background: '#7b68c8',
                          borderRadius: '5px 5px 0 0',
                          minHeight: 3,
                        }}
                      />

                      <span style={{ fontSize: 11 }}>
                        {String(item.hour).padStart(2, '0')}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            <p style={mutedStyle}>
              Saved prediction records available in analytics:{' '}
              {predictionCount}
            </p>
          </section>
        </>
      )}
    </div>
  )
}

export default AdminDashboard

