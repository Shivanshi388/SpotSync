function storageKey() {
  const name = localStorage.getItem('spotsync_user_name') || 'guest'
  return `spotsync_bookings_${name}`
}

export function getBookings() {
  try {
    const raw = localStorage.getItem(storageKey())
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function write(list) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(list))
  } catch (error) {
    console.error('Could not save bookings:', error)
  }
}

export function saveBooking(booking) {
  const list = getBookings()
  if (list.some((item) => item.id === booking.id)) return
  write([booking, ...list])
}

export function cancelBooking(id) {
  write(
    getBookings().map((item) =>
      item.id === id ? { ...item, cancelled: true } : item
    )
  )
}

export function getStatus(booking, now = Date.now()) {
  if (booking.cancelled) return 'cancelled'
  return booking.endsAt < now ? 'completed' : 'upcoming'
}
