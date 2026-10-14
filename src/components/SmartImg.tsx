import type { ImgHTMLAttributes } from 'react'

interface SmartImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined
  alt?: string
}

// 展示图组件：直出传入的 URL（站内 /media/ 由 rewriteMedia 处理过 CDN 前缀）。
// 注：早期 WebP 轻量版方案已随「整站部署阿里云」弃用——本地磁盘没有 .webp 副本，
// 若保留变体逻辑，每张图会先 404 再回退原图，反而多一次请求。
export default function SmartImg({ src, alt = '', ...rest }: SmartImgProps) {
  return <img {...rest} src={src || undefined} alt={alt} />
}
