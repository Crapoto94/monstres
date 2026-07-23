import { api, type ApiSuccess } from './api'

export interface AdminUserSummary {
  id: string
  name: string
  email: string
  avatar: string | null
  role: string
  score: number
  trustScore: number
  emailVerifiedAt: string | null
  suspendedAt: string | null
  bannedAt: string | null
  createdAt: string
  lastLoginAt: string | null
  lastLoginIp: string | null
  lastLoginOs: string | null
  lastLoginBrowser: string | null
  registrationIp: string | null
  registrationOs: string | null
  registrationBrowser: string | null
  loginCount: number
  reportsSubmitted: number
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
  photoLatitude: number | null
  photoLongitude: number | null
  user: { id: string; name: string }
}

export interface AdminReportQueueItem {
  id: string
  title: string
  description: string | null
  status: string
  latitude: number
  longitude: number
  address: string | null
  createdAt: string
  updatedAt: string
  user: { id: string; name: string; email: string; trustScore: number; avatar: string | null }
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

export interface AdminTutorialPage {
  id: string
  order: number
  title: string
  content: string
  icon: string | null
  active: boolean
  createdAt: string
}

export async function fetchAdminTutorialPages() {
  const { data } = await api.get<ApiSuccess<AdminTutorialPage[]>>('/admin/tutorial')
  return data.data
}

export async function createTutorialPage(payload: { order: number; title: string; content: string; icon?: string; active: boolean }) {
  const { data } = await api.post<ApiSuccess<AdminTutorialPage>>('/admin/tutorial', payload)
  return data.data
}

export async function updateTutorialPage(id: string, payload: Partial<AdminTutorialPage>) {
  const { data } = await api.patch<ApiSuccess<AdminTutorialPage>>(`/admin/tutorial/${id}`, payload)
  return data.data
}

export async function deleteTutorialPage(id: string) {
  await api.delete(`/admin/tutorial/${id}`)
}

export interface AdminEmailTemplate {
  id: string
  key: string
  name: string
  subject: string
  htmlContent: string
  isSystem: boolean
  createdAt: string
}

export async function fetchAdminEmailTemplates() {
  const { data } = await api.get<ApiSuccess<AdminEmailTemplate[]>>('/admin/email-templates')
  return data.data
}

export async function createEmailTemplate(payload: { key: string; name: string; subject: string; htmlContent: string }) {
  const { data } = await api.post<ApiSuccess<AdminEmailTemplate>>('/admin/email-templates', payload)
  return data.data
}

export async function updateEmailTemplate(id: string, payload: Partial<AdminEmailTemplate>) {
  const { data } = await api.patch<ApiSuccess<AdminEmailTemplate>>(`/admin/email-templates/${id}`, payload)
  return data.data
}

export async function deleteEmailTemplate(id: string) {
  await api.delete(`/admin/email-templates/${id}`)
}

export async function previewEmailTemplate(id: string) {
  const { data } = await api.post<ApiSuccess<{ subject: string; htmlContent: string }>>(`/admin/email-templates/${id}/preview`)
  return data.data
}

export interface AdminAuditLogEntry {
  id: string
  action: string
  data: { method: string; path: string; params: Record<string, unknown>; body: Record<string, unknown> } | null
  createdAt: string
  user: { id: string; name: string; email: string; avatar: string | null; role: string } | null
}

export async function fetchAuditLog(params: { userId?: string; action?: string; page?: number; pageSize?: number }) {
  const { data } = await api.get<ApiSuccess<{ logs: AdminAuditLogEntry[] } & Paginated>>('/admin/audit-log', { params })
  return data.data
}

export interface AdminEmailLogEntry {
  id: string
  to: string
  subject: string
  htmlContent: string
  templateKey: string | null
  status: 'SENT' | 'FAILED' | 'SKIPPED'
  error: string | null
  createdAt: string
}

export async function fetchEmailLog(params: { search?: string; status?: string; page?: number; pageSize?: number }) {
  const { data } = await api.get<ApiSuccess<{ logs: AdminEmailLogEntry[] } & Paginated>>('/admin/email-log', { params })
  return data.data
}

export interface AdminWhatsAppLogEntry {
  id: string
  to: string
  message: string
  templateName: string
  testMode: boolean
  status: 'SENT' | 'FAILED' | 'SKIPPED'
  error: string | null
  createdAt: string
}

export async function fetchWhatsAppLog(params: { search?: string; status?: string; page?: number; pageSize?: number }) {
  const { data } = await api.get<ApiSuccess<{ logs: AdminWhatsAppLogEntry[] } & Paginated>>('/admin/whatsapp-log', { params })
  return data.data
}
