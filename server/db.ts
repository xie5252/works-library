import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DATA_DIR = join(process.cwd(), 'data')
mkdirSync(DATA_DIR, { recursive: true })

export const db = new Database(join(DATA_DIR, 'works.db'))
db.pragma('journal_mode = WAL')

// 表结构与将来 Cloudflare D1 兼容（纯 SQLite 语法）
db.exec(`
CREATE TABLE IF NOT EXISTS works (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT '其他',
  cover TEXT,
  content TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
`)

// 首次启动预置默认分类
const catCount = (db.prepare('SELECT COUNT(*) c FROM categories').get() as { c: number }).c
if (catCount === 0) {
  const ins = db.prepare('INSERT INTO categories (name, sort, created_at) VALUES (?, ?, ?)')
  const t = now()
  ;['设计', '摄影', '视频', 'AI应用', '数字化', '其他'].forEach((name, i) =>
    ins.run(name, i + 1, t),
  )
}

// 旧库迁移：补 featured_order（精选置顶顺序，NULL=非精选，数字越小越靠前）
const workCols = db.pragma('table_info(works)') as { name: string }[]
if (!workCols.some((c) => c.name === 'featured_order')) {
  db.exec('ALTER TABLE works ADD COLUMN featured_order INTEGER')
}
// 旧库迁移：补 categories（多分类 JSON 数组，如 '["设计","视频"]'；旧数据按原 category 初始化）
if (!workCols.some((c) => c.name === 'categories')) {
  db.exec("ALTER TABLE works ADD COLUMN categories TEXT NOT NULL DEFAULT '[]'")
  db.exec("UPDATE works SET categories = JSON_ARRAY(category) WHERE categories = '[]'")
}
// 旧库迁移：补 bg_theme（详情页背景主题：light=典雅白 / dark=高端黑）
if (!workCols.some((c) => c.name === 'bg_theme')) {
  db.exec("ALTER TABLE works ADD COLUMN bg_theme TEXT NOT NULL DEFAULT 'light'")
}
// 旧库迁移：补 tags（自定义标签 JSON 数组，如 '["茶饼","包装"]'）
if (!workCols.some((c) => c.name === 'tags')) {
  db.exec("ALTER TABLE works ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'")
}
// 旧库迁移：补 cover_source（封面来源：封面从正文某图裁剪时记录该图 URL，详情页避免重复展示）
if (!workCols.some((c) => c.name === 'cover_source')) {
  db.exec('ALTER TABLE works ADD COLUMN cover_source TEXT')
}

export interface WorkRow {
  id: number
  title: string
  slug: string
  category: string
  categories: string
  tags: string
  cover: string | null
  cover_source: string | null
  content: string
  status: 'draft' | 'published'
  featured_order: number | null
  bg_theme: 'light' | 'dark'
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface SettingRow {
  key: string
  value: string
}

export function now(): string {
  return new Date().toISOString()
}
