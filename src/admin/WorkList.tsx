import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AdminLayout, { checkSession } from '../components/AdminLayout'
import { api, jsonRequest } from '../api'
import type { Work } from '../types'
import { formatDateTime, coverOf } from '../components/format'
import { ToastContainer, useToasts } from '../components/Toast'

const CATS = ['全部', '设计', '摄影', '视频', 'AI应用', '数字化', '其他']

// 主分类：取第一个分类标签，空则归「其他」
function primaryOf(w: Work): string {
  const first = w.categories && w.categories.length > 0 ? w.categories[0] : w.category
  return first || '其他'
}

export default function AdminWorkList() {
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('全部')
  const [checking, setChecking] = useState(true)
  const [view, setView] = useState<'list' | 'grid'>(() =>
    localStorage.getItem('admin_work_view') === 'grid' ? 'grid' : 'list',
  )
  const navigate = useNavigate()
  const { items, show } = useToasts()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    checkSession().then((ok) => {
      if (!ok) navigate('/admin/login', { replace: true })
      else setChecking(false)
    })
  }, [navigate])

  const load = useCallback((keyword: string) => {
    const sp = new URLSearchParams()
    if (keyword.trim()) sp.set('q', keyword.trim())
    setLoading(true)
    api<Work[]>('/api/admin/works?' + sp.toString())
      .then(setWorks)
      .catch(() => setWorks([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (checking) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => load(q), 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [q, checking, load])

  const remove = async (w: Work) => {
    if (!window.confirm('确定删除「' + w.title + '」？前台将不再显示，数据可恢复。')) return
    try {
      await api('/api/admin/works/' + w.id, { method: 'DELETE' })
      show('已删除')
      setWorks((prev) => prev.filter((x) => x.id !== w.id))
    } catch (err) {
      show(err instanceof Error ? err.message : '删除失败', 'error')
    }
  }

  // 星标切换：未精选 → 排到已有精选之后；已精选 → 取消
  const toggleFeatured = async (w: Work) => {
    const maxOrder = Math.max(0, ...works.map((x) => x.featured_order ?? 0))
    const next = w.featured_order ? null : maxOrder + 1
    try {
      const saved = await api<Work>(
        '/api/admin/works/' + w.id,
        jsonRequest('PUT', { featured_order: next }),
      )
      setWorks((prev) => prev.map((x) => (x.id === w.id ? saved : x)))
      show(next === null ? '已取消精选' : '已设为精选')
    } catch (err) {
      show(err instanceof Error ? err.message : '操作失败', 'error')
    }
  }

  if (checking) return null

  // 分类筛选（前端过滤）
  const filtered =
    cat === '全部'
      ? works
      : works.filter((w) => (w.categories || []).includes(cat) || w.category === cat)

  // 「全部」时按主分类分组，保持固定分类顺序，其余分类追加在后
  const groups = (() => {
    const map = new Map<string, Work[]>()
    for (const w of filtered) {
      const p = primaryOf(w)
      if (!map.has(p)) map.set(p, [])
      map.get(p)!.push(w)
    }
    const ordered = CATS.filter((n) => n !== '全部' && map.has(n)).map((n) => ({
      name: n,
      items: map.get(n)!,
    }))
    for (const [n, items] of map) {
      if (!CATS.includes(n)) ordered.push({ name: n, items })
    }
    return ordered
  })()

  // 各分类的数量（按完整作品列表统计）
  const countOf = (c: string) =>
    c === '全部'
      ? works.length
      : works.filter((w) => (w.categories || []).includes(c) || w.category === c).length

  return (
    <AdminLayout active="works">
      <ToastContainer items={items} />
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">作品管理</h1>
          <Link
            to="/admin/works/new"
            className="h-10 px-5 inline-flex items-center rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition"
          >
            + 新建作品
          </Link>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索标题 / 分类 / 正文……"
            className="w-full sm:w-80 h-10 px-4 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition bg-white"
          />
          <div className="flex-1" />
          <div className="flex rounded-xl border border-neutral-200 overflow-hidden shrink-0">
            <button
              onClick={() => {
                setView('grid')
                localStorage.setItem('admin_work_view', 'grid')
              }}
              title="瀑布流视图"
              className={
                'h-10 w-10 flex items-center justify-center transition ' +
                (view === 'grid' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-400 hover:text-neutral-900')
              }
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <rect x="3" y="3" width="8" height="10" rx="1.5" />
                <rect x="13" y="3" width="8" height="6" rx="1.5" />
                <rect x="3" y="15" width="8" height="6" rx="1.5" />
                <rect x="13" y="11" width="8" height="10" rx="1.5" />
              </svg>
            </button>
            <button
              onClick={() => {
                setView('list')
                localStorage.setItem('admin_work_view', 'list')
              }}
              title="列表视图"
              className={
                'h-10 w-10 flex items-center justify-center border-l border-neutral-200 transition ' +
                (view === 'list' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-400 hover:text-neutral-900')
              }
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <rect x="3" y="4" width="18" height="3.5" rx="1.5" />
                <rect x="3" y="10.25" width="18" height="3.5" rx="1.5" />
                <rect x="3" y="16.5" width="18" height="3.5" rx="1.5" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={
                'h-8 pl-3.5 pr-3 rounded-full text-xs font-medium border transition inline-flex items-center gap-1.5 ' +
                (cat === c
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400')
              }
            >
              {c}
              <span
                className={
                  'text-[10px] leading-none tabular-nums ' +
                  (cat === c ? 'text-white/50' : 'text-neutral-400')
                }
              >
                {countOf(c)}
              </span>
            </button>
          ))}
        </div>
        {loading ? (
          <div className="mt-6 bg-white rounded-2xl border border-neutral-200 py-24 text-center text-neutral-300 text-sm">
            加载中……
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 bg-white rounded-2xl border border-neutral-200 py-24 text-center text-sm text-neutral-400">
            {q || cat !== '全部' ? '没有找到相关作品' : '还没有作品，点击右上角新建第一个作品'}
          </div>
        ) : cat === '全部' ? (
          // 全部分类：按分类分组，每组一个小标题（分类名 + 数量）
          <div className="mt-6 space-y-6">
            {groups.map((g) => (
              <section
                key={g.name}
                className="bg-white rounded-2xl border border-neutral-200 overflow-hidden"
              >
                <div className="px-4 sm:px-6 pt-5 pb-3 flex items-baseline gap-2">
                  <h2 className="text-sm font-bold tracking-tight">{g.name}</h2>
                  <span className="text-xs text-neutral-400">{g.items.length}</span>
                </div>
                {view === 'grid' ? (
                  <div className="px-4 sm:px-6 pb-6">
                    <GridCards works={g.items} onToggle={toggleFeatured} onRemove={remove} />
                  </div>
                ) : (
                  <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
                    {g.items.map((w) => (
                      <ListRow key={w.id} w={w} onToggle={toggleFeatured} onRemove={remove} />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        ) : (
          <div className="mt-6 bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            {view === 'grid' ? (
              <div className="p-4 sm:p-6">
                <GridCards works={filtered} onToggle={toggleFeatured} onRemove={remove} />
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {filtered.map((w) => (
                  <ListRow key={w.id} w={w} onToggle={toggleFeatured} onRemove={remove} />
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </AdminLayout>
  )
}

// 列表视图单行
function ListRow({
  w,
  onToggle,
  onRemove,
}: {
  w: Work
  onToggle: (w: Work) => void
  onRemove: (w: Work) => void
}) {
  return (
    <li className="flex items-center gap-4 px-4 sm:px-6 py-4">
      <div className="w-16 h-12 rounded-lg bg-neutral-100 overflow-hidden shrink-0 flex items-center justify-center">
        {coverOf(w) ? (
          <img src={coverOf(w) || undefined} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-neutral-300 text-lg font-bold">{w.title.slice(0, 1)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm truncate">{w.title}</h3>
          <span
            className={
              'text-[10px] px-1.5 py-0.5 rounded shrink-0 ' +
              (w.status === 'published'
                ? 'bg-green-50 text-green-700'
                : 'bg-neutral-100 text-neutral-400')
            }
          >
            {w.status === 'published' ? '已发布' : '草稿'}
          </span>
        </div>
        <p className="text-xs text-neutral-400 mt-1">
          {(w.categories && w.categories.length > 0 ? w.categories : [w.category]).join(' / ')} · 更新于 {formatDateTime(w.updated_at)}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onToggle(w)}
          title={w.featured_order ? '取消精选' : '设为精选'}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-50 transition"
        >
          <svg
            viewBox="0 0 24 24"
            className={
              'w-[18px] h-[18px] transition ' +
              (w.featured_order
                ? 'fill-amber-400'
                : 'fill-none stroke-neutral-300 hover:stroke-amber-400')
            }
            strokeWidth="2"
            strokeLinejoin="round"
          >
            <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
          </svg>
        </button>
        {w.status === 'published' && (
          <a
            href={'/work/' + w.slug}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-neutral-400 hover:text-neutral-900 px-2 py-1.5 rounded-lg hover:bg-neutral-100 transition"
          >
            查看
          </a>
        )}
        <Link
          to={'/admin/works/' + w.id + '/edit'}
          className="text-xs text-neutral-600 hover:text-neutral-900 px-2 py-1.5 rounded-lg hover:bg-neutral-100 transition"
        >
          编辑
        </Link>
        <button
          onClick={() => onRemove(w)}
          className="text-xs text-neutral-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition"
        >
          删除
        </button>
      </div>
    </li>
  )
}

// 瀑布流卡片视图（CSS columns，与前台首页同款观感）
function GridCards({
  works,
  onToggle,
  onRemove,
}: {
  works: Work[]
  onToggle: (w: Work) => void
  onRemove: (w: Work) => void
}) {
  return (
    <div className="columns-2 md:columns-3 lg:columns-5 gap-5">
      {works.map((w) => (
        <div key={w.id} className="card-in mb-5 break-inside-avoid group">
          <Link
            to={'/admin/works/' + w.id + '/edit'}
            className="block rounded-xl overflow-hidden bg-neutral-100 relative"
          >
            {coverOf(w) ? (
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={coverOf(w) || undefined}
                  alt={w.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
              </div>
            ) : (
              <div className="aspect-[4/3] flex items-center justify-center">
                <span className="text-neutral-300 text-4xl font-bold tracking-widest">
                  {w.title.slice(0, 1)}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            {/* 状态角标 */}
            <span
              className={
                'absolute top-2.5 left-2.5 text-[10px] px-2 py-0.5 rounded-full backdrop-blur ' +
                (w.status === 'published'
                  ? 'bg-white/85 text-green-700'
                  : 'bg-white/85 text-neutral-500')
              }
            >
              {w.status === 'published' ? '已发布' : '草稿'}
            </span>
            {/* 悬停操作条 */}
            <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  onToggle(w)
                }}
                title={w.featured_order ? '取消精选' : '设为精选'}
                className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={
                    'w-4 h-4 transition ' +
                    (w.featured_order ? 'fill-amber-400' : 'fill-none stroke-neutral-400')
                  }
                  strokeWidth="2"
                  strokeLinejoin="round"
                >
                  <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
                </svg>
              </button>
              {w.status === 'published' && (
                <a
                  href={'/work/' + w.slug}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="查看前台"
                  className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-white transition"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
                    <path d="M7 17L17 7M9 7h8v8" />
                  </svg>
                </a>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  onRemove(w)
                }}
                title="删除"
                className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-white transition"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 7h16M9 7V5h6v2m-8 0l1 13h8l1-13" />
                </svg>
              </button>
            </div>
          </Link>
          <div className="pt-3 pb-1 px-0.5">
            <h3 className="font-medium text-sm text-neutral-900 truncate group-hover:underline underline-offset-4 decoration-neutral-300">
              {w.title}
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              {(w.categories && w.categories.length > 0 ? w.categories : [w.category]).join(' / ')} · {formatDateTime(w.updated_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
