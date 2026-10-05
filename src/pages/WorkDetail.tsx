import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import type { Work, SiteSettings, ContentBlock, Category } from '../types'
import { formatDate, coverOf } from '../components/format'
import CategoryIcon from '../components/CategoryIcon'

// 统一固定宽度内容栏：任何尺寸的图片都按栏宽显示
const COL = 'w-[800px] max-w-full mx-auto px-5 sm:px-0'

function BlockView({
  block,
  index,
  blocks,
  dark,
  onImage,
}: {
  block: ContentBlock
  index: number
  blocks: ContentBlock[]
  dark: boolean
  onImage: (url: string) => void
}) {
  if (block.type === 'text') {
    const f = block.fmt || {}
    const size =
      f.h === 1
        ? 'text-3xl font-bold mt-12 mb-4 '
        : f.h === 2
          ? 'text-2xl font-bold mt-10 mb-3 '
          : f.h === 3
            ? 'text-xl font-bold mt-8 mb-2 '
            : 'text-[17px] leading-8 '
    const style =
      (f.bold && !f.h ? 'font-bold ' : '') +
      (f.italic ? 'italic ' : '') +
      (f.underline ? 'underline ' : '')
    const align = f.align === 'center' ? 'text-center ' : f.align === 'right' ? 'text-right ' : ''
    const quote = f.quote
      ? 'border-l-4 pl-5 ' + (dark ? 'border-neutral-700 ' : 'border-neutral-300 ')
      : ''
    let bullet = ''
    if (f.list === 'ul') bullet = '· '
    else if (f.list === 'ol') {
      let n = 1
      for (let k = index - 1; k >= 0; k--) {
        const p = blocks[k]
        if (p.type === 'text' && p.fmt?.list === 'ol') n++
        else break
      }
      bullet = n + '. '
    }
    return (
      <p
        className={
          COL +
          ' whitespace-pre-wrap ' +
          (dark ? 'text-neutral-300 ' : 'text-neutral-700 ') +
          size +
          style +
          align +
          quote
        }
      >
        {bullet}
        {block.text}
      </p>
    )
  }
  if (block.type === 'image') {
    return (
      <figure className={COL}>
        <img
          src={block.url}
          alt={block.caption || ''}
          loading="lazy"
          onClick={() => onImage(block.url)}
          className="w-full rounded-xl cursor-zoom-in"
        />
        {block.caption && (
          <figcaption className={'text-center text-sm mt-3 ' + (dark ? 'text-neutral-500' : 'text-neutral-400')}>
            {block.caption}
          </figcaption>
        )}
      </figure>
    )
  }
  if (block.type === 'pdf') {
    return (
      <div className={COL}>
        <a
          href={block.url}
          target="_blank"
          rel="noreferrer"
          className={
            'flex items-center gap-3 border rounded-xl px-4 py-3.5 transition ' +
            (dark
              ? 'border-neutral-700 hover:border-neutral-500'
              : 'border-neutral-200 hover:border-neutral-400')
          }
        >
          <span className="w-9 h-9 rounded-lg bg-red-50 text-red-600 text-[10px] font-bold flex items-center justify-center shrink-0">
            PDF
          </span>
          <span className={'text-sm truncate ' + (dark ? 'text-neutral-200' : 'text-neutral-700')}>
            {block.title || 'PDF 文件'}
          </span>
          <span className={'ml-auto text-xs shrink-0 ' + (dark ? 'text-neutral-500' : 'text-neutral-400')}>
            查看 ↗
          </span>
        </a>
      </div>
    )
  }
  return (
    <div className={COL}>
      <video src={block.url} controls preload="metadata" className="w-full rounded-xl bg-black" />
      {block.caption && (
        <p className={'text-center text-sm mt-3 ' + (dark ? 'text-neutral-500' : 'text-neutral-400')}>
          {block.caption}
        </p>
      )}
    </div>
  )
}

export default function WorkDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [work, setWork] = useState<Work | null>(null)
  const [settings, setSettings] = useState<SiteSettings>({ logo: null, site_name: '作品库', site_name_en: '', footer_text: '' })
  const [cats, setCats] = useState<string[]>([])
  const [selCat, setSelCat] = useState('__featured')
  const [more, setMore] = useState<Work[]>([])
  const [notFound, setNotFound] = useState(false)
  const moreRef = useRef<HTMLElement | null>(null)
  // 灯箱：当前查看的图片在正文图片列表中的下标
  const [lightbox, setLightbox] = useState<number | null>(null)

  // 灯箱图片列表
  const mainCover = work ? coverOf(work) : null
  const contentImgs =
    work?.content
      .filter((b): b is Extract<ContentBlock, { type: 'image' }> => b.type === 'image')
      .map((b) => b.url) ?? []
  // 封面若由正文某图裁剪而来（cover_source），正文正常显示原图，顶部不再重复渲染封面
  const coverInBody = !!work?.cover_source && contentImgs.includes(work.cover_source)
  const lightboxImages = coverInBody
    ? contentImgs
    : mainCover
      ? [mainCover, ...contentImgs]
      : contentImgs

  // 灯箱键盘操作 + 背景滚动锁定
  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
      else if (e.key === 'ArrowRight') setLightbox((i) => (i === null ? null : (i + 1) % lightboxImages.length))
      else if (e.key === 'ArrowLeft')
        setLightbox((i) => (i === null ? null : (i - 1 + lightboxImages.length) % lightboxImages.length))
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [lightbox === null, lightboxImages.length])

  useEffect(() => {
    api<SiteSettings>('/api/admin/settings').then(setSettings).catch(() => {})
    api<Category[]>('/api/categories')
      .then((rows) => setCats(rows.map((r) => r.name)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!slug) return
    api<Work>('/api/works/' + encodeURIComponent(slug))
      .then((w) => {
        setWork(w)
        const site = settings.site_name_en
          ? settings.site_name + ' ' + settings.site_name_en
          : settings.site_name
        const title = w.title + ' - ' + site
        document.title = title
        // 动态 og（对执行 JS 的分享/爬虫生效；静态兜底在 index.html）
        const setMeta = (prop: string, content: string) => {
          let el = document.querySelector('meta[property="' + prop + '"]')
          if (!el) {
            el = document.createElement('meta')
            el.setAttribute('property', prop)
            document.head.appendChild(el)
          }
          el.setAttribute('content', content)
        }
        setMeta('og:title', title)
        const firstText = w.content.find((b) => b.type === 'text' && b.text.trim())
        setMeta(
          'og:description',
          firstText && firstText.type === 'text'
            ? firstText.text.trim().slice(0, 60)
            : (w.categories || []).join(' / '),
        )
        const img = coverOf(w)
        if (img) setMeta('og:image', new URL(img, window.location.origin).href)
      })
      .catch(() => setNotFound(true))
    window.scrollTo(0, 0)
  }, [slug])

  useEffect(() => {
    if (!work) return
    const sp = new URLSearchParams()
    if (selCat !== '__featured') sp.set('category', selCat)
    else sp.set('featured', '1')
    api<Work[]>('/api/works?' + sp.toString())
      .then(setMore)
      .catch(() => setMore([]))
  }, [work, selCat])

  const scrollToMore = () => {
    moreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const pickCat = (name: string) => {
    setSelCat(name)
    scrollToMore()
    // 正文图片/视频加载会撑高页面、中断平滑滚动：延迟校正 + 图片全部加载完后最终对齐
    setTimeout(scrollToMore, 350)
    Promise.all(
      Array.from(document.images).map((img) =>
        img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r() })
      )
    )
      .then(scrollToMore)
      .catch(() => {})
  }

  const dark = work?.bg_theme === 'dark'

  // 导航栏始终保持白底（黑色主题只作用于作品内容区），与站酷一致
  const navCls = (on: boolean) =>
    'h-8 px-3.5 rounded-full text-sm transition flex items-center gap-1.5 shrink-0 ' +
    (on
      ? 'bg-neutral-900 text-white font-medium'
      : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100')

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 backdrop-blur border-b border-neutral-100 bg-white/90">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            {settings.logo && (
              <img src={settings.logo} alt="logo" className="h-8 w-auto object-contain" />
            )}
            <span className="text-xl font-bold tracking-tight">
              <span className="md:hidden">{settings.site_name_en || settings.site_name}</span>
              <span className="hidden md:inline">{settings.site_name}</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <button onClick={() => pickCat('__featured')} className={navCls(selCat === '__featured')}>
              <CategoryIcon name="精选" className="w-4 h-4 shrink-0" />
              精选
            </button>
            {cats.map((c) => (
              <button key={c} onClick={() => pickCat(c)} className={navCls(selCat === c)}>
                <CategoryIcon name={c} className="w-4 h-4 shrink-0" />
                {c}
              </button>
            ))}
          </nav>
          <Link
            to="/"
            className="md:hidden text-sm text-neutral-500 hover:text-neutral-900 transition shrink-0"
          >
            ← 返回
          </Link>
        </div>
        {/* 手机端分类切换 */}
        <div className="md:hidden flex gap-5 overflow-x-auto [scrollbar-width:none] border-t border-neutral-100 px-4">
          {['__featured', ...cats].map((c) => {
            const on = selCat === c
            return (
              <button
                key={c}
                onClick={() => pickCat(c)}
                className={
                  'shrink-0 h-10 text-sm transition relative ' +
                  (on ? 'text-neutral-900 font-bold' : 'text-neutral-400')
                }
              >
                {c === '__featured' ? '精选' : c}
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

      {notFound ? (
        <div className="py-40 text-center">
          <p className="text-5xl font-bold text-neutral-200">404</p>
          <p className="text-neutral-400 mt-4">作品不存在或未发布</p>
        </div>
      ) : !work ? (
        <div className="py-40 text-center text-neutral-300">加载中……</div>
      ) : (
        <article className="pb-32">
          <div className={COL + ' pt-16 pb-10'}>
            <div className="flex flex-wrap gap-2">
              {(work.categories && work.categories.length > 0 ? work.categories : [work.category]).map((c) => (
                <span
                  key={c}
                  className="inline-block px-3 py-1 rounded-full bg-neutral-100 text-xs text-neutral-500"
                >
                  {c}
                </span>
              ))}
              {work.tags && work.tags.length > 0 && (
                <button
                  onClick={() => navigate('/?q=' + encodeURIComponent(work.tags.join(' ')))}
                  className="inline-block px-3 py-1 rounded-full border border-neutral-200 text-xs text-neutral-400 hover:border-neutral-900 hover:text-neutral-900 transition"
                  title={'搜索标签：' + work.tags.join('、')}
                >
                  {work.tags.join(' / ')}
                </button>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-5 leading-snug">
              {work.title}
            </h1>
            <p className="text-sm text-neutral-400 mt-4">{formatDate(work.updated_at)}</p>
          </div>
          {/* 黑色主题：仅作品内容区为黑色通栏，导航/标题/底部保持白底 */}
          <div className={dark ? 'bg-neutral-950 py-14' : 'py-0'}>
            {mainCover && !coverInBody && (
              <div className={COL + (mainCover ? ' mb-14' : '')}>
                <img
                  src={mainCover}
                  alt={work.title}
                  onClick={() => setLightbox(0)}
                  className="w-full rounded-2xl cursor-zoom-in"
                />
              </div>
            )}
            <div className="space-y-12">
              {work.content.map((block, i) => (
                <BlockView
                  key={i}
                  block={block}
                  index={i}
                  blocks={work.content}
                  dark={dark}
                  onImage={(url) =>
                    setLightbox(lightboxImages.indexOf(url) === -1 ? 0 : lightboxImages.indexOf(url))
                  }
                />
              ))}
            </div>
          </div>
          {/* 相关推荐：站酷式通栏网格 */}
          <section
            ref={moreRef}
            className="w-full bg-neutral-50 mt-20 py-12 px-5 sm:px-10 scroll-mt-20"
          >
            <h2 className="text-xl font-bold tracking-tight">
              {selCat === '__featured' ? '相关推荐' : selCat + ' · 更多作品'}
            </h2>
            {more.filter((w) => w.slug !== slug).length === 0 ? (
              <p className="text-sm text-neutral-300 mt-6">该分类下暂无其他作品</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 mt-6">
                {more
                  .filter((w) => w.slug !== slug)
                  .map((w) => (
                    <Link
                      key={w.id}
                      to={'/work/' + w.slug}
                      className="card-in block group"
                    >
                      <div className="rounded-xl overflow-hidden bg-neutral-100">
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
                            <span className="text-neutral-300 text-3xl font-bold tracking-widest">
                              {w.title.slice(0, 1)}
                            </span>
                          </div>
                        )}
                      </div>
                      <h3 className="mt-2.5 text-sm font-medium text-neutral-900 group-hover:underline underline-offset-4 decoration-neutral-300 line-clamp-1">
                        {w.title}
                      </h3>
                      <p className="text-[13px] text-neutral-400 mt-0.5">
                        {w.category} · {formatDate(w.updated_at)}
                      </p>
                    </Link>
                  ))}
              </div>
            )}
          </section>
          {/* 底部留白：保证「更多作品」区能滚动到视口顶部对齐 */}
          <div className="h-[65vh]" aria-hidden="true" />
        </article>
      )}

      {/* 图片灯箱：点击放大，可切换上一张 / 下一张 */}
      {lightbox !== null && lightboxImages.length > 0 && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightboxImages[lightbox]}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-w-[92vw] max-h-[88vh] object-contain select-none"
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white text-lg transition"
            title="关闭 (Esc)"
          >
            ✕
          </button>
          {lightboxImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setLightbox((lightbox - 1 + lightboxImages.length) % lightboxImages.length)
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white text-xl transition"
                title="上一张 (←)"
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setLightbox((lightbox + 1) % lightboxImages.length)
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white text-xl transition"
                title="下一张 (→)"
              >
                ›
              </button>
            </>
          )}
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm text-white/60">
            {lightbox + 1} / {lightboxImages.length}
          </span>
        </div>
      )}
    </div>
  )
}
