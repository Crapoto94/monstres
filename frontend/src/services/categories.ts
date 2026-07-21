import { api, type ApiSuccess } from './api'

export interface Category {
  id: string
  name: string
  icon: string | null
  order: number
  active: boolean
}

export async function fetchCategories() {
  const { data } = await api.get<ApiSuccess<Category[]>>('/categories')
  return data.data
}
