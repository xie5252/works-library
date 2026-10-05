-- works-library D1 schema（最终表结构，全新部署直接应用）
CREATE TABLE IF NOT EXISTS works (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT '其他',
  categories TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  cover TEXT,
  cover_source TEXT,
  content TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  featured_order INTEGER,
  bg_theme TEXT NOT NULL DEFAULT 'light',
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
-- 登录限速（同一 IP 每分钟窗口计数）
CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);

-- 全新数据库预置默认分类
INSERT INTO categories (name, sort, created_at)
SELECT '设计', 1, '2026-01-01T00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM categories);
INSERT INTO categories (name, sort, created_at)
SELECT '摄影', 2, '2026-01-01T00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM categories);
INSERT INTO categories (name, sort, created_at)
SELECT '视频', 3, '2026-01-01T00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM categories);
INSERT INTO categories (name, sort, created_at)
SELECT 'AI应用', 4, '2026-01-01T00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM categories);
INSERT INTO categories (name, sort, created_at)
SELECT '数字化', 5, '2026-01-01T00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM categories);
INSERT INTO categories (name, sort, created_at)
SELECT '其他', 6, '2026-01-01T00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM categories);
