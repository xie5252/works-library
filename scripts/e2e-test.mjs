// 一次性端到端测试脚本：登录 → 创建 → 前台查询
// 用法：E2E_PASSWORD=你的密码 node scripts/e2e-test.mjs
const BASE = 'http://localhost:5173'

async function main() {
  // 1. 登录
  const loginRes = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: process.env.E2E_PASSWORD }),
  })
  const setCookie = loginRes.headers.get('set-cookie')
  console.log('1. login:', loginRes.status, await loginRes.text())
  console.log('   set-cookie:', setCookie?.slice(0, 80) + '...')

  const cookie = setCookie ? setCookie.split(';')[0] : ''
  console.log('   sending cookie:', cookie.slice(0, 60) + '...')

  // 2. 校验会话
  const sessRes = await fetch(`${BASE}/api/admin/session`, { headers: { Cookie: cookie } })
  console.log('2. session:', sessRes.status, await sessRes.text())

  // 3. 创建作品
  const createRes = await fetch(`${BASE}/api/admin/works`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      title: '测试作品',
      category: '设计',
      cover: null,
      content: [{ type: 'text', text: '这是一个测试段落' }],
      status: 'published',
    }),
  })
  const created = await createRes.json()
  console.log('3. create:', createRes.status, JSON.stringify(created))

  // 4. 前台查询
  const listRes = await fetch(`${BASE}/api/works`)
  const list = await listRes.json()
  console.log('4. front list:', listRes.status, 'count =', list.length)

  // 5. 搜索
  const searchRes = await fetch(`${BASE}/api/works?q=测试`)
  const searchList = await searchRes.json()
  console.log('5. search 测试:', 'count =', searchList.length)

  // 6. 详情
  if (created.slug) {
    const detailRes = await fetch(`${BASE}/api/works/${created.slug}`)
    console.log('6. detail:', detailRes.status, (await detailRes.json()).title)
  }

  // 7. 软删除后前台不可见
  if (created.id) {
    const delRes = await fetch(`${BASE}/api/admin/works/${created.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    })
    const afterDel = await (await fetch(`${BASE}/api/works`)).json()
    console.log('7. delete + front list:', delRes.status, 'count =', afterDel.length)
  }
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
