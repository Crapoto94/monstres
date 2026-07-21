import { api, type ApiSuccess } from './api'

export interface AuthUser {
  id: string
  name: string
  email: string
  avatar: string | null
  role: string
  score: number
  trustScore: number
  emailVerifiedAt: string | null
  emailNotifications: boolean
  createdAt: string
}

export async function register(payload: { name: string; email: string; password: string }) {
  const { data } = await api.post<ApiSuccess<AuthUser>>('/auth/register', payload)
  return data.data
}

export async function login(payload: { email: string; password: string }) {
  const { data } = await api.post<ApiSuccess<AuthUser>>('/auth/login', payload)
  return data.data
}

export async function logout() {
  await api.post('/auth/logout')
}

export async function fetchMe() {
  const { data } = await api.get<ApiSuccess<AuthUser>>('/auth/me')
  return data.data
}

export async function verifyEmail(token: string) {
  const { data } = await api.get<ApiSuccess<AuthUser>>('/auth/verify-email', { params: { token } })
  return data.data
}

export async function forgotPassword(email: string) {
  const { data } = await api.post<ApiSuccess<{ message: string }>>('/auth/forgot-password', { email })
  return data.data
}

export async function resetPassword(payload: { token: string; password: string }) {
  const { data } = await api.post<ApiSuccess<{ message: string }>>('/auth/reset-password', payload)
  return data.data
}

export async function updateEmailNotifications(emailNotifications: boolean) {
  const { data } = await api.patch<ApiSuccess<AuthUser>>('/users/me/preferences', { emailNotifications })
  return data.data
}
