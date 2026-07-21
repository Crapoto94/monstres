import { api, type ApiSuccess } from './api'

export interface Comment {
  id: string
  itemId: string
  content: string
  createdAt: string
  user: { id: string; name: string; avatar: string | null }
}

export async function fetchComments(itemId: string) {
  const { data } = await api.get<ApiSuccess<Comment[]>>(`/items/${itemId}/comments`)
  return data.data
}

export async function createComment(itemId: string, content: string) {
  const { data } = await api.post<ApiSuccess<Comment>>(`/items/${itemId}/comments`, { content })
  return data.data
}

export async function deleteComment(itemId: string, commentId: string) {
  await api.delete(`/items/${itemId}/comments/${commentId}`)
}
