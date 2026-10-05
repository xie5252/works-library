import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import { setSignedCookie, getSignedCookie, deleteCookie } from 'hono/cookie'
import { db } from '../db'
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// 签名密钥：首次启动生成并保存到 data/.secret
const SECRET_FILE = join(process.cwd(), 'data', '.secret')
let SECRET: string
if (existsSync(SECRET_FILE)) {
  SECRET = readFileSync(SECRET_FILE, 'utf8').trim()
} else {
  SECRET = randomBytes(32).toString('hex')
  writeFileSync(SECRET_FILE, SECRET)
}

// HTTPS 部署时设置环境变量 COOKIE_SECURE=1，cookie 仅经 HTTPS 传输
const COOKIE_SECURE = process.env.COOKIE_SECURE === '1'

// 登录限速：同一 IP 每分钟最多 10 次尝试（内存版，重启即清零）
const LOGIN_MAX = 10
const LOGIN_WINDOW_MS = 60_000
const loginAttempts = new Map<string, { count: number; reset: number }>()
function loginLimited(ip: string): boolean {
  const t = Date.now()
  const rec = loginAttempts.get(ip)
  if (!rec || t > rec.reset) {
    loginAttempts.set(ip, { count: 1, reset: t + LOGIN_WINDOW_MS })
    return false
  }
  rec.count += 1
  return rec.count > LOGIN_MAX
}
const clientIp = (c: Context) =>
  c.req.header('x-forwarded-for')?.split(',')[0].trim() || c.req.header('x-real-ip') || 'local'

const hashPassword = (pwd: string) =>
  scryptSync(pwd, 'works-library-salt', 64).toString('hex')

// 首次启动初始化默认密码 admin123（本地 V1 用，部署时再换方案）
const saved = db.prepare("SELECT value FROM settings WHERE key='admin_password_hash'").get()
if (!saved) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('admin_password_hash', ?)").run(
    hashPassword('admin123'),
  )
}
db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('password_changed', '0')").run()

const mustChangePwd = () => {
  const row = db
    .prepare("SELECT value FROM settings WHERE key='password_changed'")
    .get() as { value: string }
  return row?.value !== '1'
}

// 后台接口统一鉴权中间件
export async function requireAuth(c: Context, next: Next) {
  const v = await getSignedCookie(c, SECRET, 'session')
  if (v !== 'admin') {
    return c.json({ error: '未登录' }, 401)
  }
  await next()
}

const auth = new Hono()

auth.post('/login', async (c) => {
  if (loginLimited(clientIp(c))) {
    return c.json({ error: '尝试次数过多，请 1 分钟后再试' }, 429)
  }
  const { password } = await c.req.json<{ password?: string }>()
  const row = db.prepare("SELECT value FROM settings WHERE key='admin_password_hash'").get() as {
    value: string
  }
  const input = Buffer.from(hashPassword(password ?? ''), 'hex')
  const target = Buffer.from(row.value, 'hex')
  const ok = input.length === target.length && timingSafeEqual(input, target)
  if (!ok) {
    return c.json({ error: '密码错误' }, 401)
  }
  await setSignedCookie(c, 'session', 'admin', SECRET, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'Lax',
    secure: COOKIE_SECURE,
  })
  return c.json({ ok: true, must_change_password: mustChangePwd() })
})

auth.put('/password', requireAuth, async (c) => {
  const { old_password, new_password } = await c.req.json<{
    old_password?: string
    new_password?: string
  }>()
  const row = db.prepare("SELECT value FROM settings WHERE key='admin_password_hash'").get() as {
    value: string
  }
  const input = Buffer.from(hashPassword(old_password ?? ''), 'hex')
  const target = Buffer.from(row.value, 'hex')
  const ok = input.length === target.length && timingSafeEqual(input, target)
  if (!ok) {
    return c.json({ error: '当前密码错误' }, 400)
  }
  if (!new_password || new_password.length < 6) {
    return c.json({ error: '新密码至少 6 位' }, 400)
  }
  db.prepare("UPDATE settings SET value=? WHERE key='admin_password_hash'").run(
    hashPassword(new_password),
  )
  db.prepare("UPDATE settings SET value='1' WHERE key='password_changed'").run()
  return c.json({ ok: true })
})

auth.post('/logout', (c) => {
  deleteCookie(c, 'session', { path: '/' })
  return c.json({ ok: true })
})

auth.get('/session', async (c) => {
  const v = await getSignedCookie(c, SECRET, 'session')
  return c.json({ logged_in: v === 'admin', must_change_password: mustChangePwd() })
})

export const adminRoutes = auth
