import { api, type ApiSuccess } from './api'

export interface AdminUserSummary {
  id: string
  name: string
  email: string
  role: string
  score: number
  trustScore: number
  emailVerifiedAt: string | null
  suspendedAt: string | null
  bannedAt: string | null
  createdAt: string
  lastLoginAt: string | null
  registrationIp: string | null
  registrationOs: string | null
  registrationBrowser: string | null
  _count: { items: number; reports: number }
}

export interface AdminUserDetail {
  id: string
  name: string
  email: string
  role: string
  score: number
  trustScore: number
  emailVerifiedAt: string | null
  suspendedAt: string | null
  bannedAt: string | null
  createdAt: string
  emailNotifications: boolean
  reportsReceived: number
  _count: { items: number; reservations: number; votes: number; comments: number }
}

export interface Paginated {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface AdminItemSummary {
  id: string
  title: string
  status: string
  latitude: number
  longitude: number
  createdAt: string
  collectedAt: string | null
  user: { id: string; name: string; email: string }
  category: { id: string; name: string } | null
  photos: { thumbnailPath: string | null; path: string }[]
}

export interface AdminCategory {
  id: string
  name: string
  icon: string | null
  order: number
  active: boolean
  createdAt: string
  _count: { items: number }
}

export interface AdminSetting {
  id: string
  key: string
  value: string
  type: string
  updatedAt: string
}

export interface DashboardStats {
  users: { total: number; new7d: number; new30d: number }
  items: {
    total: number
    available: number
    reserved: number
    collected: number
    hidden: number
    new7d: number
    collectionRate: number
  }
  pendingReports: number
}

export interface AdminReportEntry {
  id: string
  type: string
  reason: string | null
  createdAt: string
  user: { id: string; name: string }
}

export interface AdminReportQueueItem {
  id: string
  title: string
  status: string
  updatedAt: string
  user: { id: string; name: string; email: string; trustScore: number }
  photos: { thumbnailPath: string | null; path: string }[]
  reports: AdminReportEntry[]
}

export type ReportDecision = 'KEEP' | 'HIDE' | 'DELETE'

export async function fetchReportsQueue(params: { page?: number; pageSize?: number }) {
  const { data } = await api.get<ApiSuccess<{ items: AdminReportQueueItem[] } & Paginated>>('/admin/reports', {
    params,
  })
  return data.data
}

export async function resolveReport(itemId: string, decision: ReportDecision) {
  const { data } = await api.post<ApiSuccess<{ decision: ReportDecision }>>(`/admin/reports/${itemId}/resolve`, {
    decision,
  })
  return data.data
}

export async function fetchDashboardStats() {
  const { data } = await api.get<ApiSuccess<DashboardStats>>('/admin/dashboard')
  return data.data
}

export async function fetchAdminUsers(params: { search?: string; page?: number; pageSize?: number }) {
  const { data } = await api.get<ApiSuccess<{ users: AdminUserSummary[] } & Paginated>>(
    '/admin/users',
    { params },
  )
  return data.data
}

export async function fetchAdminUser(id: string) {
  const { data } = await api.get<ApiSuccess<AdminUserDetail>>(`/admin/users/${id}`)
  return data.data
}

export async function updateUserRole(id: string, role: string) {
  const { data } = await api.patch<ApiSuccess<AdminUserSummary>>(`/admin/users/${id}/role`, { role })
  return data.data
}

export async function suspendUser(id: string) {
  const { data } = await api.patch<ApiSuccess<AdminUserSummary>>(`/admin/users/${id}/suspend`)
  return data.data
}

export async function unsuspendUser(id: string) {
  const { data } = await api.patch<ApiSuccess<AdminUserSummary>>(`/admin/users/${id}/unsuspend`)
  return data.data
}

export async function banUser(id: string) {
  const { data } = await api.patch<ApiSuccess<AdminUserSummary>>(`/admin/users/${id}/ban`)
  return data.data
}

export async function unbanUser(id: string) {
  const { data } = await api.patch<ApiSuccess<AdminUserSummary>>(`/admin/users/${id}/unban`)
  return data.data
}

export async function verifyUserEmail(id: string) {
  const { data } = await api.patch<ApiSuccess<AdminUserSummary>>(`/admin/users/${id}/verify-email`)
  return data.data
}

export async function deleteUser(id: string) {
  await api.delete(`/admin/users/${id}`)
}

export async function fetchAdminItems(params: {
  search?: string
  status?: string
  categoryId?: string
  page?: number
  pageSize?: number
}) {
  const { data } = await api.get<ApiSuccess<{ items: AdminItemSummary[] } & Paginated>>(
    '/admin/items',
    { params },
  )
  return data.data
}

export async function updateItemStatus(id: string, status: string) {
  const { data } = await api.patch<ApiSuccess<AdminItemSummary>>(`/admin/items/${id}/status`, { status })
  return data.data
}

export async function deleteItem(id: string) {
  await api.delete(`/admin/items/${id}`)
}

export async function fetchAdminCategories() {
  const { data } = await api.get<ApiSuccess<AdminCategory[]>>('/admin/categories')
  return data.data
}

export async function createCategory(payload: { name: string; icon?: string; order?: number }) {
  const { data } = await api.post<ApiSuccess<AdminCategory>>('/admin/categories', payload)
  return data.data
}

export async function updateCategory(
  id: string,
  payload: { name?: string; icon?: string; order?: number; active?: boolean },
) {
  const { data } = await api.patch<ApiSuccess<AdminCategory>>(`/admin/categories/${id}`, payload)
  return data.data
}

export async function deleteCategory(id: string) {
  await api.delete(`/admin/categories/${id}`)
}

export async function fetchAdminSettings() {
  const { data } = await api.get<ApiSuccess<AdminSetting[]>>('/admin/settings')
  return data.data
}

export async function updateSetting(key: string, value: string) {
  const { data } = await api.patch<ApiSuccess<AdminSetting>>(`/admin/settings/${key}`, { value })
  return data.data
}

export async function listTables() {
  const { data } = await api.post<ApiSuccess<{ tables: string[] }>>('/admin/sql/tables')
  return data.data
}

export async function execSql(sql: string) {
  const { data } = await api.post<ApiSuccess<{ rows: any[]; count: number }>>('/admin/sql/exec', { sql })
  return data.data
}

export async function deleteAllItems() {
  const { data } = await api.delete<ApiSuccess<{ deleted: number }>>('/admin/items')
  return data.data
}
