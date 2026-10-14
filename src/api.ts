export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(
      (body as { error?: string }).error || `请求失败 (${res.status})`,
      res.status,
    )
  }
  return res.json() as Promise<T>
}

export const jsonRequest = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})

export async function uploadFile(
  type: 'logo' | 'cover' | 'image' | 'video' | 'pdf',
  file: File,
): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`/api/admin/upload?type=${type}`, { method: 'POST', body: fd })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError((body as { error?: string }).error || '上传失败', res.status)
  }
  const data = (await res.json()) as { url: string }
  return data.url
}
