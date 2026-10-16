import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import type { Work, SiteSettings, Category } from '../types'
import { FALLBACK_CATEGORIES } from '../types'
import { formatDate, coverOf, rewriteMedia } from '../components/format'
import SmartImg from '../components/SmartImg'
import CategoryIcon from '../components/CategoryIcon'

const SIDEBAR_KEY = 'worklib_sidebar_open'

export default function Home() {
  const [settings, setSettings] = useState<SiteSettings>({ logo: null, site_name: '作品库', site_name_en: '', footer_text: '', footer_credit: '', beian_no: '', media_cdn: '', about_enabled: '0' })
  const footerText = settings.footer_text
  const [cats, setCats] = useState<string[]>(FALLBACK_CATEGORIES)
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useSearchParams()
  const [input, setInput] = useState(params.get('q') || '')
  const [open, setOpen] = useState(() => localStorage.getItem(SIDEBAR_KEY) !== '0')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const category = params.get('category') || ''
  const q = params.get('q') || ''

  useEffect(() => {
    api<SiteSettings>('/api/admin/settings').then((s) => {
      setSettings(s)
      document.title = s.site_name_en ? s.site_name + ' ' + s.site_name_en : s.site_name
    }).catch(() => {})
    api<Category[]>('/api/categories')
      .then((rows) => setCats(rows.map((r) => r.name)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const sp = new URLSearchParams()
    if (category) sp.set('category', category)
    if (q) sp.set('q', q)
    api<Work[]>('/api/works?' + sp.toString())
      .then(setWorks)
      .catch(() => setWorks([]))
      .finally(() => setLoading(false))
  }, [category, q])

  function onSearch(value: string) {
    setInput(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const next = new URLSearchParams(params)
      if (value.trim()) next.set('q', value.trim())
      else next.delete('q')
      setParams(next, { replace: true })
    }, 300)
  }

  function selectCat(name: string) {
    const next = new URLSearchParams(params)
    if (name) next.set('category', name)
    else next.delete('category')
    setParams(next, { replace: true })
  }

  function toggle() {
    setOpen((prev) => {
      localStorage.setItem(SIDEBAR_KEY, prev ? '0' : '1')
      return !prev
    })
  }

  // 渲染前统一重写媒体 URL（后台配置了 CDN 域名时，图片/视频走国内加速节点）
  const viewWorks = useMemo(() => rewriteMedia(settings.media_cdn, works), [settings.media_cdn, works])
  // 星标分区只在「全部作品」默认视图生效；分类页＝纯时间线（按更新时间从新到旧），搜索时平铺
  const featuredWorks = viewWorks.filter((w) => w.featured_order != null)
  const restWorks = viewWorks.filter((w) => w.featured_order == null)
  const showSections = !q && !category && featuredWorks.length > 0
  const gridCls = 'grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-5 px-px'

  const card = (w: Work, i: number) => (
    <Link
      key={w.id}
      to={'/work/' + w.slug}
      className="card-in block group"
      style={{ animationDelay: Math.min(i * 40, 320) + 'ms' }}
    >
      <div className="rounded-lg sm:rounded-xl overflow-hidden bg-neutral-100 relative">
        {coverOf(w) ? (
          <div className="aspect-[4/3] overflow-hidden">
            <SmartImg
              src={coverOf(w)}
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
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
      </div>
      <div className="pt-2 sm:pt-3 pb-1 px-0.5">
        <h3 className="font-medium text-[13px] sm:text-base text-neutral-900 group-hover:underline underline-offset-4 decoration-neutral-300 line-clamp-2">
          {w.title}
        </h3>
        <p className="text-[11px] sm:text-[13px] text-neutral-400 mt-0.5 sm:mt-1">
          {(w.categories && w.categories.length > 0 ? w.categories : [w.category]).join(' / ')} · {formatDate(w.updated_at)}
        </p>
        {w.tags && w.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {w.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-400">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )

  const catBtn = (name: string, label: string, wide: boolean) => {
    const on = category === name
    if (wide) {
      return (
        <button
          key={name || '__all'}
          onClick={() => selectCat(name)}
          className={
            'w-full flex items-center gap-3 h-9 px-2.5 rounded-lg text-sm transition ' +
            (on
              ? 'bg-neutral-900 text-white font-medium'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900')
          }
        >
          <CategoryIcon name={name || '全部'} className="w-4 h-4 shrink-0" />
          <span className="truncate">{label}</span>
        </button>
      )
    }
    return (
      <button
        key={name || '__all'}
        onClick={() => selectCat(name)}
        title={label}
        className={
          'w-10 h-10 mx-auto flex items-center justify-center rounded-lg transition ' +
          (on ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100')
        }
      >
        <CategoryIcon name={name || '全部'} className="w-[18px] h-[18px]" />
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* 桌面侧边栏：logo 为主标识，可收起为图标条 */}
      <aside
        className={
          'hidden md:flex flex-col fixed inset-y-0 left-0 z-40 bg-white border-r border-neutral-100 transition-all duration-200 ' +
          (open ? 'w-52' : 'w-14')
        }
      >
        <div
          className={
            'h-16 shrink-0 flex items-center border-b border-neutral-50 ' +
            (open ? 'px-4 gap-2' : 'justify-center')
          }
        >
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            {settings.logo ? (
              <SmartImg
                src={rewriteMedia(settings.media_cdn, settings.logo)}
                alt="logo"
                className="h-10 w-auto max-w-[150px] object-contain shrink-0"
              />
            ) : (
              <span className="shrink-0 h-7 w-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-sm font-bold">
                {open ? '' : settings.site_name.slice(0, 1)}
              </span>
            )}
            {open && (
              <span className="min-w-0">
                <span className="block text-lg font-bold leading-6 tracking-tight truncate">
                  {settings.site_name}
                </span>
                {settings.site_name_en && (
                  <span className="block text-[9px] leading-4 text-neutral-300 truncate">
                    {settings.site_name_en}
                  </span>
                )}
              </span>
            )}
          </Link>
          {open && (
            <button
              onClick={toggle}
              title="收起侧边栏"
              className="ml-auto shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2.5" />
                <path d="M9.5 3v18" />
              </svg>
            </button>
          )}
        </div>
        <nav className={'flex-1 overflow-y-auto py-3 ' + (open ? 'px-3' : 'px-2')}>
          {catBtn('', '全部作品', open)}
          {open && (
            <p className="px-2.5 pt-4 pb-2 text-[11px] font-medium tracking-widest text-neutral-300">
              分类
            </p>
          )}
          {cats.map((c) => catBtn(c, c, open))}
          {settings.about_enabled === '1' && (
            open ? (
              <Link
                to="/about"
                className="w-full flex items-center gap-3 h-9 px-2.5 rounded-lg text-sm transition text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c1.2-3.2 3.8-5 7-5s5.8 1.8 7 5" />
                </svg>
                <span className="truncate">关于我</span>
              </Link>
            ) : (
              <Link
                to="/about"
                title="关于我"
                className="w-10 h-10 mx-auto flex items-center justify-center rounded-lg transition text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
              >
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c1.2-3.2 3.8-5 7-5s5.8 1.8 7 5" />
                </svg>
              </Link>
            )
          )}
        </nav>
        {/* 版权署名 */}
        <div
          className={
            'shrink-0 border-t border-neutral-50 py-3 text-[11px] leading-4 text-neutral-300 ' +
            (open ? 'px-4 truncate' : 'px-2 text-center')
          }
          title={footerText || '© ' + new Date().getFullYear() + ' ' + settings.site_name}
        >
          {open ? (
            footerText || '© ' + new Date().getFullYear() + ' ' + settings.site_name
          ) : (
            <span>©</span>
          )}
        </div>
        {open && settings.beian_no && (
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noreferrer"
            className="block px-4 pb-3 -mt-1 text-[11px] leading-4 text-neutral-300 hover:text-neutral-500 transition truncate"
            title="工信部备案查询"
          >
            {settings.beian_no}
          </a>
        )}
        {!open && (
          <button
            onClick={toggle}
            title="展开侧边栏"
            className="shrink-0 h-12 flex items-center justify-center text-neutral-400 hover:text-neutral-900 border-t border-neutral-50 transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2.5" />
              <path d="M9.5 3v18" />
            </svg>
          </button>
        )}
      </aside>

      <div className={'flex-1 min-w-0 transition-all duration-200 ' + (open ? 'md:ml-52' : 'md:ml-14')}>
        {/* 移动端顶栏 */}
        <header className="md:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-neutral-100">
          <div className="px-4 h-14 flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 min-w-0 shrink">
              {settings.logo ? (
                <SmartImg src={rewriteMedia(settings.media_cdn, settings.logo)} alt="logo" className="h-7 w-auto max-w-[90px] object-contain shrink-0" />
              ) : null}
              <span className="text-lg font-bold tracking-tight truncate">
                {settings.site_name_en || settings.site_name}
              </span>
            </Link>
            <div className="flex-1" />
            {settings.about_enabled === '1' && (
              <Link
                to="/about"
                className="text-sm text-neutral-500 hover:text-neutral-900 transition shrink-0"
              >
                关于我
              </Link>
            )}
          </div>
          <div className="px-4 pb-3">
            <input
              value={input}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="搜索作品……"
              className="w-full h-9 px-4 rounded-full bg-neutral-100 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-neutral-900 transition placeholder:text-neutral-400"
            />
          </div>
          <div className="px-4 pb-0 flex gap-5 overflow-x-auto [scrollbar-width:none] border-b border-neutral-100">
            {['', ...cats].map((c) => {
              const on = category === c
              return (
                <button
                  key={c || '__all'}
                  onClick={() => selectCat(c)}
                  className={
                    'shrink-0 h-10 text-sm transition relative ' +
                    (on ? 'text-neutral-900 font-bold' : 'text-neutral-400')
                  }
                >
                  {c || '全部'}
                  <span
                    className={
                      'absolute left-1/2 -translate-x-1/2 bottom-0 h-0.5 rounded-full bg-neutral-900 transition-all duration-200 ' +
                      (on ? 'w-5 opacity-100' : 'w-0 opacity-0')
                    }
                  />
                </button>
              )
            })}
          </div>
        </header>

        {/* 桌面顶栏：搜索 */}
        <div className="hidden md:flex sticky top-0 z-30 h-16 items-center gap-4 bg-white/90 backdrop-blur border-b border-neutral-100 px-8">
          <div className="relative w-72">
            <input
              value={input}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="搜索作品……"
              className="w-full h-9 px-4 rounded-full bg-neutral-100 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-neutral-900 transition placeholder:text-neutral-400"
            />
          </div>
          <div className="flex-1" />
        </div>

        {/* 作品网格：自适应占满内容区宽度 */}
        <main className="w-full px-4 sm:px-8 pt-6 pb-24">
          {loading ? (
            <div className="text-center py-32 text-neutral-300 text-sm">加载中……</div>
          ) : works.length === 0 ? (
            <div className="py-32 text-center">
              <p className="text-neutral-300 text-lg font-medium">
                {q ? '没有找到与「' + q + '」相关的作品' : '还没有作品'}
              </p>
              <p className="text-neutral-300 text-sm mt-2">
                {q ? '换个关键词试试' : '登录后台，记录你的第一个作品'}
              </p>
            </div>
          ) : showSections ? (
            <>
              <div className="flex items-center gap-1.5 mb-4">
                <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
                </svg>
                <h2 className="text-xs font-medium tracking-[0.25em] text-neutral-400">精选</h2>
              </div>
              <div className={gridCls}>{featuredWorks.map((w, i) => card(w, i))}</div>
              <div className="my-8 sm:my-10 border-t border-neutral-100" />
              <div className={gridCls}>{restWorks.map((w, i) => card(w, i))}</div>
            </>
          ) : (
            <div className={gridCls}>{viewWorks.map((w, i) => card(w, i))}</div>
          )}
        </main>

        <footer className="border-t border-neutral-100 py-8 text-center text-xs text-neutral-300">
          {settings.footer_credit || 'Design · Product · Digital · Ai'}
          {settings.beian_no && (
            <>
              {' · '}
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-neutral-500 transition"
              >
                {settings.beian_no}
              </a>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
