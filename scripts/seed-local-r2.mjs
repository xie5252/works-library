// 把本地 media/ 目录的文件批量写入本地模拟 R2（开发环境用）
// 运行：npm run seed:r2
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { getPlatformProxy } from 'wrangler'

const MEDIA_DIR = 'media'

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

// 与 vite dev 共用同一份本地绑定状态（.wrangler/state）
const proxy = await getPlatformProxy()
const R2 = proxy.env.MEDIA
if (!R2) {
  console.error('找不到 MEDIA 绑定，请检查 wrangler.jsonc')
  process.exit(1)
}

const extType = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf',
}

const files = walk(MEDIA_DIR)
let ok = 0
let fail = 0
for (const f of files) {
  const key = relative(MEDIA_DIR, f).split(sep).join('/')
  try {
    const ext = key.split('.').pop().toLowerCase()
    await R2.put(key, readFileSync(f), {
      httpMetadata: { contentType: extType[ext] || 'application/octet-stream' },
    })
    ok++
  } catch (e) {
    fail++
    console.error(`FAIL ${key}:`, e.message)
  }
}
await proxy.dispose()
console.log(`本地 R2 预填充完成：成功 ${ok}，失败 ${fail}`)
