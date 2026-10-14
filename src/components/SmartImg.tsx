import { useEffect, useState } from 'react'
import type { ImgHTMLAttributes } from 'react'

// 仅对站内 /media/ 的 jpg/png 生成 WebP 变体地址（由上传中转服务生成；老图无 WebP 时走 onError 回退）
export function toWebpUrl(src: string | null | undefined): string | null {
  if (!src) return null
  if (!src.startsWith('/media/') && !src.includes('/media/')) return src
  return src.replace(/\.(jpe?g|png)(\?|#|$)/i, '.webp$2')
}

interface SmartImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined
  alt?: string
}

// 展示图组件：默认加载 WebP 轻量版，加载失败自动回退原图（原图永远不删）
export default function SmartImg({ src, alt = '', ...rest }: SmartImgProps) {
  const original = src || ''
  const [cur, setCur] = useState(() => toWebpUrl(src) || original)

  useEffect(() => {
    setCur(toWebpUrl(src) || original)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  return (
    <img
      {...rest}
      src={cur || undefined}
      alt={alt}
      onError={() => {
        if (cur !== original) setCur(original)
      }}
    />
  )
}
