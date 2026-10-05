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
