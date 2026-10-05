// ---------- 内容块（与后端 content JSON 对齐，预留扩展块类型） ----------
export type BlockType = 'text' | 'image' | 'video' | 'pdf'

// 文字块简单排版
export interface TextFmt {
  h?: 1 | 2 | 3
  bold?: boolean
  italic?: boolean
  underline?: boolean
  align?: 'left' | 'center' | 'right'
  quote?: boolean
  list?: 'ul' | 'ol'
}

export interface TextBlock {
  type: 'text'
  text: string
  fmt?: TextFmt
}

export interface ImageBlock {
  type: 'image'
  url: string
  caption?: string
}

export interface VideoBlock {
  type: 'video'
  url: string
  caption?: string
}

export interface PdfBlock {
  type: 'pdf'
  url: string
  title?: string
}

export type ContentBlock = TextBlock | ImageBlock | VideoBlock | PdfBlock

export type WorkStatus = 'draft' | 'published'

// 详情页背景主题：典雅白 / 高端黑
export type WorkBgTheme = 'light' | 'dark'

export interface Work {
  id: number
  title: string
  slug: string
  category: string
  categories: string[]
  tags: string[]
  cover: string | null
  cover_source?: string | null
  content: ContentBlock[]
  status: WorkStatus
  featured_order: number | null
  bg_theme: WorkBgTheme
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface SiteSettings {
  logo: string | null
  site_name: string
  site_name_en: string
  footer_text: string
  footer_credit: string
}

export interface Category {
  id: number
  name: string
  sort: number
}

// 接口异常时的兜底分类（正常以后台「分类管理」为准）
export const FALLBACK_CATEGORIES = ['设计', '摄影', '视频', 'AI应用', '数字化', '其他']
