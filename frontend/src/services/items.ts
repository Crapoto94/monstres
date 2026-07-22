import { api, type ApiSuccess } from './api'

export interface ItemPhoto {
  id: string
  type: 'LISTING' | 'COLLECTION'
  path: string
  thumbnailPath: string | null
  order: number
}

export interface Item {
  id: string
  title: string
  description: string | null
  latitude: number
  longitude: number
  address: string | null
  status: string
  votesScore: number
  distance: number | null
  hasVoted: boolean
  hasReported: boolean
  createdAt: string
  collectedAt: string | null
  photos: ItemPhoto[]
  category: { id: string; name: string; icon: string | null } | null
  user: { id: string; name: string; avatar: string | null }
  interestedCount: number
  isInterested: boolean
}

export interface MyItems {
  posted: Item[]
  interested: Item[]
  collected: Item[]
}

export interface ItemsPage {
  items: Item[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface FindItemsParams {
  lat?: number
  lng?: number
  radius?: number
  categoryId?: string
  page?: number
  pageSize?: number
  sort?: 'recent' | 'nearby'
}

export interface CreateItemPayload {
  title: string
  description?: string
  categoryId?: string
  latitude: number
  longitude: number
  address?: string
  photos: File[]
}

export async function createItem(payload: CreateItemPayload) {
  const formData = new FormData()
  formData.append('title', payload.title)
  if (payload.description) formData.append('description', payload.description)
  if (payload.categoryId) formData.append('categoryId', payload.categoryId)
  formData.append('latitude', String(payload.latitude))
  formData.append('longitude', String(payload.longitude))
  if (payload.address) formData.append('address', payload.address)
  for (const photo of payload.photos) formData.append('photos', photo)

  const { data } = await api.post<ApiSuccess<Item>>('/items', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

export async function fetchItem(id: string) {
  const { data } = await api.get<ApiSuccess<Item>>(`/items/${id}`)
  return data.data
}

export async function fetchItems(params: FindItemsParams) {
  const { data } = await api.get<ApiSuccess<ItemsPage>>('/items', { params })
  return data.data
}

export async function fetchMyItems() {
  const { data } = await api.get<ApiSuccess<MyItems>>('/items/mine')
  return data.data
}

export async function toggleVote(itemId: string) {
  const { data } = await api.post<ApiSuccess<{ voted: boolean; votesScore: number }>>(`/items/${itemId}/vote`)
  return data.data
}

export type ReportType = 'FAKE' | 'WRONG_LOCATION' | 'INAPPROPRIATE' | 'DUPLICATE' | 'ALREADY_COLLECTED'

export async function reportItem(itemId: string, payload: { type: ReportType; reason?: string }) {
  const { data } = await api.post<ApiSuccess<{ reported: boolean }>>(`/items/${itemId}/report`, payload)
  return data.data
}

export async function collectItem(itemId: string, photo: File) {
  const formData = new FormData()
  formData.append('photo', photo)
  const { data } = await api.post<ApiSuccess<Item>>(`/items/${itemId}/collect`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}
