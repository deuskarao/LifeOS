// LifeOS API client — typed fetch helpers + TanStack Query hooks factory

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const json = await res.json().catch(() => ({ ok: false, error: 'Geçersiz yanıt' }))
  if (!res.ok || json.ok === false) {
    throw new ApiError(res.status, json.error || 'Bir hata oluştu')
  }
  return json.data as T
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) => request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown) => request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
}

/**
 * Liste için query + create/update/delete mutation'larını bir arada sunar.
 */
export function useCrud<T extends { id: string }>(resource: string) {
  const qc = useQueryClient()
  const key = [resource]

  const list = useQuery<T[]>({
    queryKey: key,
    queryFn: () => api.get<T[]>(`/api/lifeos/${resource}`),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['reports'] })
  }

  const create = useMutation({
    mutationFn: (body: Partial<T>) => api.post<T>(`/api/lifeos/${resource}`, body),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) => api.put<T>(`/api/lifeos/${resource}/${id}`, data),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.del<{ id: string }>(`/api/lifeos/${resource}/${id}`),
    onSuccess: invalidate,
  })

  return { list, create, update, remove }
}
