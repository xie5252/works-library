import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import { setSignedCookie, getSignedCookie, deleteCookie } from 'hono/cookie'
import { qGet, qRun, type Env } from '../db'

// 密码哈希：PBKDF2-SHA256（WebCrypto，Workers/Node 通用），存储格式 pbkdf2$<hex>
const PBKDF2_ITERATIONS = 100_000
const SALT = 'works-library-salt'

async function hashPassword(pwd: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(pwd), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(SALT), iterations: PBKDF2_ITERATIONS },
    key,
    256,
  )
  const hex = [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return 'pbkdf2$' + hex
}

// 常数时间比较，避免时序侧信道
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

// 读取密码哈希；全新数据库时预置默认密码 admin123（password_changed=0 提示首次修改）
async function getPasswordHash(db: D1Database): Promise<string | null> {
  const row = await qGet<{ value: string }>(
    db,
    "SELECT value FROM settings WHERE key='admin_password_hash'",
  )
  if (row) return row.value
  await qRun(
    db,
    "INSERT INTO settings (key, value) VALUES ('admin_password_hash', ?)",
    await hashPassword('admin123'),
  )
  await qRun(db, "INSERT OR IGNORE INTO settings (key, value) VALUES ('password_changed', '0')")
  return (await qGet<{ value: string }>(
    db,
    "SELECT value FROM settings WHERE key='admin_password_hash'",
  ))?.value ?? null
}

const mustChangePwd = async (db: D1Database) => {
  const row = await qGet<{ value: string }>(
    db,
    "SELECT value FROM settings WHERE key='password_changed'",
  )
  return row?.value !== '1'
}

// 登录限速：同一 IP 每分钟最多 10 次（D1 存储，Workers 多实例下依然生效）
const LOGIN_MAX = 10
const LOGIN_WINDOW_S = 60
async function loginLimited(db: D1Database, ip: string): Promise<boolean> {
  const nowS = Math.floor(Date.now() / 1000)
  const rec = await qGet<{ window_start: number; count: number }>(
    db,
    'SELECT window_start, count FROM login_attempts WHERE ip=?',
    ip,
  )
  if (!rec || nowS - rec.window_start >= LOGIN_WINDOW_S) {
    await qRun(
      db,
      `INSERT INTO login_attempts (ip, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(ip) DO UPDATE SET window_start=excluded.window_start, count=1`,
      ip,
      nowS,
    )
    return false
  }
  const count = rec.count + 1
  await qRun(db, 'UPDATE login_attempts SET count=? WHERE ip=?', count, ip)
  return count > LOGIN_MAX
}

const clientIp = (c: Context<{ Bindings: Env }>) =>
  c.req.header('cf-connecting-ip') ||
  c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
  c.req.header('x-real-ip') ||
  'local'

// 后台接口统一鉴权中间件
export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const v = await getSignedCookie(c, c.env.SECRET, 'session')
  if (v !== 'admin') {
    return c.json({ error: '未登录' }, 401)
  }
  await next()
}

const auth = new Hono<{ Bindings: Env }>()

auth.post('/login', async (c) => {
  const db = c.env.DB
  if (await loginLimited(db, clientIp(c))) {
    return c.json({ error: '尝试次数过多，请 1 分钟后再试' }, 429)
  }
  const { password } = await c.req.json<{ password?: string }>()
  const stored = (await getPasswordHash(db)) ?? ''
  // 旧格式（Node scrypt，无 pbkdf2$ 前缀）在 Workers 上无法验证，需用 set-password 脚本重置
  if (!stored.startsWith('pbkdf2$')) {
    return c.json({ error: '密码哈希格式过旧，请运行 npm run set-password 重置' }, 401)
  }
  const input = await hashPassword(password ?? '')
  if (!safeEqual(input, stored)) {
    return c.json({ error: '密码错误' }, 401)
  }
  await setSignedCookie(c, 'session', 'admin', c.env.SECRET, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'Lax',
    secure: c.env.COOKIE_SECURE === '1',
  })
  return c.json({ ok: true, must_change_password: await mustChangePwd(db) })
})

auth.put('/password', requireAuth, async (c) => {
  const db = c.env.DB
  const { old_password, new_password } = await c.req.json<{
    old_password?: string
    new_password?: string
  }>()
  const stored = (await getPasswordHash(db)) ?? ''
  const input = await hashPassword(old_password ?? '')
  if (!safeEqual(input, stored)) {
    return c.json({ error: '当前密码错误' }, 400)
  }
  if (!new_password || new_password.length < 6) {
    return c.json({ error: '新密码至少 6 位' }, 400)
  }
  await qRun(db, "UPDATE settings SET value=? WHERE key='admin_password_hash'", await hashPassword(new_password))
  await qRun(db, "UPDATE settings SET value='1' WHERE key='password_changed'")
  return c.json({ ok: true })
})

auth.post('/logout', (c) => {
  deleteCookie(c, 'session', { path: '/' })
  return c.json({ ok: true })
})

auth.get('/session', async (c) => {
  const v = await getSignedCookie(c, c.env.SECRET, 'session')
  return c.json({
    logged_in: v === 'admin',
    must_change_password: await mustChangePwd(c.env.DB),
  })
})

export const adminRoutes = auth
