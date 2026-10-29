
import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach the authentication token to Axios requests.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('spotsync_token')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Fetch-based helper used by parkingService.js.
export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('spotsync_token')

  const response = await fetch(
    `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`,
    {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    }
  )

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.detail || `Request failed (${response.status})`)
  }

  return data
}

export default api

