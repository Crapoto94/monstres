import { api, type ApiSuccess } from './api'

export interface ItemPhoto {
  id: string
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
  createdAt: string
  photos: ItemPhoto[]
  category: { id: string; name: string; icon: string | null } | null
  user: { id: string; name: string; avatar: string | null }
  activeReservation: {
    id: string
    user: { id: string; name: string; avatar: string | null }
    expiresAt: string
  } | null
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

export async function collectItem(itemId: string, photo: File) {
  const formData = new FormData()
  formData.append('photo', photo)
  const { data } = await api.post<ApiSuccess<Item>>(`/items/${itemId}/collect`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}
