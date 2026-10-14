// 从 D1 导出的 dump.sql 提取全部 /media/ 文件 key：
//   node scripts/collect-media-urls.mjs                 → 生成 data/media-keys.txt（key 清单）
//   node scripts/collect-media-urls.mjs --download      → 额外下载到 data/media-export/<key>
// 下载源：works.dev 线上站（R2 对外唯一出口）。国内网络直连 workers.dev 可能失败，
// 可走代理下载，或改在海外网络环境执行 --download。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'

const BASE = 'https://works-library.983047904.workers.dev/media/'
const dumpPath = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'data/dump.sql'
const doDownload = process.argv.includes('--download')

const sql = readFileSync(dumpPath, 'utf8')
const re = /media\/([A-Za-z0-9][A-Za-z0-9\-_./]*?\.[A-Za-z0-9]{2,5})/g
const keys = new Set()
for (const m of sql.matchAll(re)) keys.add(m[1])

if (keys.size === 0) {
  console.error(`未在 ${dumpPath} 中找到任何 /media/ 引用，请确认导出文件正确`)
  process.exit(1)
}

writeFileSync('data/media-keys.txt', [...keys].join('\n') + '\n')
writeFileSync('data/media-urls.txt', [...keys].map((k) => BASE + k).join('\n') + '\n')
console.log(`共发现 ${keys.size} 个媒体文件，清单已写入 data/media-keys.txt / data/media-urls.txt`)

if (!doDownload) {
  console.log('如需下载到本地 data/media-export/，请追加 --download 参数重跑')
  process.exit(0)
}

mkdirSync('data/media-export', { recursive: true })
let ok = 0
let fail = 0
for (const key of keys) {
  const dest = path.join('data/media-export', key)
  if (existsSync(dest)) {
    ok++
    console.log(`已存在，跳过 ${key}`)
    continue
  }
  try {
    const res = await fetch(BASE + key, { redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    mkdirSync(path.dirname(dest), { recursive: true })
    writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
    ok++
    console.log(`下载成功 ${key}`)
  } catch (e) {
    fail++
    console.error(`下载失败 ${key}: ${e.message}`)
  }
}
console.log(`\n完成：成功 ${ok}，失败 ${fail}`)
if (fail > 0) {
  console.log('失败多为网络原因（workers.dev 国内被墙），可挂代理后重跑，已成功的会自动跳过')
  process.exit(1)
}
