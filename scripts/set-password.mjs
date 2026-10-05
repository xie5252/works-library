// 设置后台密码（PBKDF2 哈希直接写入 D1）
// 本地：npm run set-password -- 新密码
// 线上：npm run set-password -- 新密码 --remote（需先配置真实 database_id）
import { writeFileSync, unlinkSync } from 'node:fs'
import { pbkdf2Sync } from 'node:crypto'
import { spawnSync } from 'node:child_process'

const pwd = process.argv[2]
const remote = process.argv.includes('--remote')
if (!pwd || pwd.length < 6) {
  console.error('用法：npm run set-password -- 新密码（至少 6 位）[--remote]')
  process.exit(1)
}

const hex = pbkdf2Sync(pwd, 'works-library-salt', 100000, 32, 'sha256').toString('hex')
const hash = 'pbkdf2$' + hex
const sql = `UPDATE settings SET value='${hash}' WHERE key='admin_password_hash';\nUPDATE settings SET value='1' WHERE key='password_changed';\n`
const file = 'data/set-password.sql'
writeFileSync(file, sql)

const args = ['wrangler', 'd1', 'execute', 'works-db', remote ? '--remote' : '--local', '--file=' + file]
const r = spawnSync('npx', args, { stdio: 'inherit', shell: true })
try {
  unlinkSync(file)
} catch {}
process.exit(r.status ?? 1)
