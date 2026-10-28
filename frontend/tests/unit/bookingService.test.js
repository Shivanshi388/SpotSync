import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

import api from '../../src/services/api'
import { cancelServerBooking, createBooking, getBooking, listBookings } from '../../src/services/bookingService'

describe('booking service API contract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a server booking using the API payload', async () => {
    const payload = { vehicle_id: 4, parking_slot_id: 12, start_time: '2026-11-01T02:00:00.000Z', end_time: '2026-11-01T04:00:00.000Z' }
    api.post.mockResolvedValue({ data: { id: 31, status: 'pending' } })
    await expect(createBooking(payload)).resolves.toEqual({ id: 31, status: 'pending' })
    expect(api.post).toHaveBeenCalledWith('/api/bookings', payload)
  })

  it('lists the current account bookings from the server', async () => {
    api.get.mockResolvedValue({ data: [{ id: 31 }] })
    await expect(listBookings()).resolves.toEqual([{ id: 31 }])
    expect(api.get).toHaveBeenCalledWith('/api/bookings')
  })

  it('fetches and cancels only by server booking ID', async () => {
    api.get.mockResolvedValue({ data: { id: 31 } })
    api.patch.mockResolvedValue({ data: { id: 31, status: 'cancelled' } })
    await expect(getBooking(31)).resolves.toEqual({ id: 31 })
    await expect(cancelServerBooking(31)).resolves.toEqual({ id: 31, status: 'cancelled' })
    expect(api.get).toHaveBeenCalledWith('/api/bookings/31')
    expect(api.patch).toHaveBeenCalledWith('/api/bookings/31/cancel')
  })
})
