// 一次性：把本地 data/works.db 的全部数据导出为 D1 可执行的 SQL
// 运行：npm run migrate:d1 && npx wrangler d1 execute works-db --local --file=data/d1-import.sql
// 真实部署后再跑一次：npx wrangler d1 execute works-db --remote --file=data/d1-import.sql
import Database from 'better-sqlite3'
import { writeFileSync, mkdirSync } from 'node:fs'
import { pbkdf2Sync } from 'node:crypto'

// 与 server/routes/auth.ts 保持一致（PBKDF2-SHA256 / 100k 次 / 32 字节）
function hashPassword(pwd) {
  const hex = pbkdf2Sync(pwd, 'works-library-salt', 100000, 32, 'sha256').toString('hex')
  return 'pbkdf2$' + hex
}

const esc = (v) =>
  v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`

mkdirSync('data', { recursive: true })
const db = new Database('data/works.db', { readonly: true })

let out = '-- 由 scripts/migrate-to-d1.mjs 自动生成\n'
for (const table of ['settings', 'categories', 'works']) {
  const rows = db.prepare(`SELECT * FROM ${table}`).all()
  out += `DELETE FROM ${table};\n`
  if (rows.length === 0) continue
  const cols = Object.keys(rows[0])
  for (const r of rows) {
    out += `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map((c) => esc(r[c])).join(',')});\n`
  }
}
db.close()

// 密码哈希从 Node scrypt 换成 PBKDF2（Workers 无 scrypt），重置为 admin123，登录后请改密码
out += `-- 密码重置为 admin123（PBKDF2 格式），password_changed=0 触发首次修改提示\n`
out += `UPDATE settings SET value='${hashPassword('admin123')}' WHERE key='admin_password_hash';\n`
out += `UPDATE settings SET value='0' WHERE key='password_changed';\n`

writeFileSync('data/d1-import.sql', out)
const counts = out.split('\n').filter((l) => l.startsWith('INSERT')).length
console.log(`已生成 data/d1-import.sql（${counts} 条 INSERT）`)
console.log('下一步：npx wrangler d1 execute works-db --local --file=data/d1-import.sql')
