import api from './api'

export async function registerUser(userData) {
  const response = await api.post('/auth/register', userData)
  return response.data
}

export async function loginUser(credentials) {
  const response = await api.post('/auth/login', credentials)

  const { access_token } = response.data

  localStorage.setItem('spotsync_token', access_token)
  localStorage.setItem('spotsync_logged_in', 'true')

  return response.data
}

export async function getCurrentUser() {
  const response = await api.get('/auth/me')
  return response.data
}

export function logoutUser() {
  localStorage.removeItem('spotsync_token')
  localStorage.removeItem('spotsync_logged_in')
  localStorage.removeItem('spotsync_user_role')
  localStorage.removeItem('spotsync_user_role')
}