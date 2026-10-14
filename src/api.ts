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

// 上传中转信息（上海服务器）：media_cdn 配置且 relay_token 非空时启用，失败自动回退直传 Cloudflare
let relayInfoP: Promise<{ media_cdn: string; relay_token: string } | null> | null = null
function getRelayInfo() {
  if (!relayInfoP) {
    relayInfoP = api<{ media_cdn: string; relay_token: string }>('/api/admin/relay-info').catch(
      () => null,
    )
  }
  return relayInfoP
}

export async function uploadFile(
  type: 'logo' | 'cover' | 'image' | 'video' | 'pdf',
  file: File,
): Promise<string> {
  const relay = await getRelayInfo()
  if (relay?.media_cdn && relay.relay_token) {
    try {
      const base = relay.media_cdn.replace(/\/+$/, '')
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(
        `${base}/ingest?token=${encodeURIComponent(relay.relay_token)}&type=${type}`,
        { method: 'POST', body: fd },
      )
      if (res.ok) {
        const data = (await res.json()) as { url: string }
        if (data.url) return data.url
      }
    } catch {
      // 中转不可用 → 走下面的直传
    }
  }

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
