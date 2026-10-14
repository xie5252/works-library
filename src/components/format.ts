import type { Work } from '../types'

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return formatDate(iso) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

// 封面回退：cover 为空时取文章第一张图（与后台编辑页 effectiveCover 规则一致）
export function coverOf(w: Work): string | null {
  if (w.cover) return w.cover
  const img = w.content.find((b) => b.type === 'image')
  return img && img.type === 'image' ? img.url : null
}

// 媒体 CDN 重写：把数据里的 "/media/..." 相对路径换成 CDN 完整地址。
// 通过 JSON 字符串替换实现（媒体 URL 只出现在字符串值开头，以 "/media/ 为锚点，不会误伤其他字段）。
// cdn 为空时原样返回（直连 Worker / R2）。
export function rewriteMedia<T>(cdn: string | undefined, obj: T): T {
  const host = (cdn || '').trim().replace(/\/+$/, '')
  if (!host) return obj
  return JSON.parse(JSON.stringify(obj).replaceAll('"/media/', `"${host}/media/`))
}
