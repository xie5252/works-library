// 把本地 media/ 目录的文件批量写入 R2（本地模拟或远端）
// 用法：node scripts/seed-media.mjs        → 本地模拟（dev 用）
//       node scripts/seed-media.mjs remote → 远端 R2（上线用）
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { execFileSync } from 'node:child_process'
import { getPlatformProxy } from 'wrangler'

const MEDIA_DIR = 'media'
const BUCKET = 'works-media'
const REMOTE = process.argv[2] === 'remote'

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

const extType = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf',
}

const files = walk(MEDIA_DIR)
console.log(`共 ${files.length} 个文件，目标：${REMOTE ? '远端 R2' : '本地模拟 R2'}`)

if (REMOTE) {
  // 远端：逐个调 wrangler r2 object put
  let ok = 0
  let fail = 0
  for (const f of files) {
    const key = relative(MEDIA_DIR, f).split(sep).join('/')
    const ext = key.split('.').pop().toLowerCase()
    const type = extType[ext] || 'application/octet-stream'
    try {
      execFileSync('npx', [
        'wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`,
        '--file', f, '--content-type', type, '--remote',
      ], { stdio: 'pipe', shell: process.platform === 'win32' })
      ok++
      console.log(`OK ${key}`)
    } catch (e) {
      fail++
      console.error(`FAIL ${key}:`, (e.stderr || e.message || '').toString().slice(0, 200))
    }
  }
  console.log(`远端 R2 上传完成：成功 ${ok}，失败 ${fail}`)
} else {
  // 本地：getPlatformProxy 与 vite dev 共用 .wrangler/state
  const proxy = await getPlatformProxy()
  const R2 = proxy.env.MEDIA
  if (!R2) {
    console.error('找不到 MEDIA 绑定，请检查 wrangler.jsonc')
    process.exit(1)
  }
  let ok = 0
  let fail = 0
  for (const f of files) {
    const key = relative(MEDIA_DIR, f).split(sep).join('/')
    const ext = key.split('.').pop().toLowerCase()
    try {
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
}
