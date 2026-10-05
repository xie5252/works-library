import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AdminLayout, { checkSession } from '../components/AdminLayout'
import BlockList from '../components/BlockList'
import { api, jsonRequest, uploadFile } from '../api'
import type { Work, WorkStatus, Category } from '../types'
import { FALLBACK_CATEGORIES } from '../types'
import { ToastContainer, useToasts } from '../components/Toast'
import CoverPicker from './CoverPicker'
import { formatDate } from '../components/format'

interface FormState {
  title: string
  categories: string[]
  tags: string[]
  cover: string | null
  cover_source: string | null
  content: Work['content']
  status: WorkStatus
  bg_theme: 'light' | 'dark'
}

const EMPTY: FormState = {
  title: '',
  categories: ['其他'],
  tags: [],
  cover: null,
  cover_source: null,
  content: [],
  status: 'draft',
  bg_theme: 'light',
}

export default function AdminWorkEdit() {
  const params = useParams<{ id?: string }>()
  const workId = params.id ? Number(params.id) : null
  const navigate = useNavigate()
  const { items, show } = useToasts()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [cats, setCats] = useState<string[]>(FALLBACK_CATEGORIES)
  const [slug, setSlug] = useState<string | null>(null)
  const slugRef = useRef<string | null>(null)
  const [ready, setReady] = useState(workId === null)
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [pubOk, setPubOk] = useState<{ slug: string | null; title: string } | null>(null)
  const [coverBusy, setCoverBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const coverRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    checkSession().then((ok) => {
      if (!ok) navigate('/admin/login', { replace: true })
    })
  }, [navigate])

  useEffect(() => {
    api<Category[]>('/api/categories')
      .then((rows) => setCats(rows.map((r) => r.name)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (workId === null) return
    api<Work>('/api/admin/works/' + workId)
      .then((w) => {
        setForm({
          title: w.title,
          categories: w.categories && w.categories.length > 0 ? w.categories : [w.category],
          tags: w.tags ?? [],
          cover: w.cover,
          cover_source: w.cover_source ?? null,
          content: w.content,
          status: w.status,
          bg_theme: w.bg_theme === 'dark' ? 'dark' : 'light',
        })
        setSlug(w.slug)
        slugRef.current = w.slug
      })
      .catch(() => show('作品加载失败', 'error'))
      .finally(() => setReady(true))
  }, [workId, show])

  const patch = useCallback((p: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...p }))
    setDirty(true)
  }, [])

  const doSave = useCallback(
    async (overrides?: Partial<FormState>): Promise<boolean> => {
      const payload = { ...form, ...overrides }
      if (!payload.title.trim()) payload.title = '未命名作品'
      setSaveState('saving')
      try {
        if (workId === null) {
          const created = await api<Work>('/api/admin/works', jsonRequest('POST', payload))
          setSlug(created.slug)
          slugRef.current = created.slug
          navigate('/admin/works/' + created.id + '/edit', { replace: true })
        } else {
          const saved = await api<Work>('/api/admin/works/' + workId, jsonRequest('PUT', payload))
          setSlug(saved.slug)
          slugRef.current = saved.slug
        }
        setDirty(false)
        setSaveState('saved')
        return true
      } catch (err) {
        setSaveState('error')
        show(err instanceof Error ? err.message : '保存失败', 'error')
        return false
      }
    },
    [form, workId, navigate, show],
  )

  // 自动保存：内容变更 2 秒后
  useEffect(() => {
    if (!dirty) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSave(), 2000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [form, dirty, doSave])

  const publish = async () => {
    const ok = await doSave({ status: 'published' })
    if (ok) setPubOk({ slug: slugRef.current, title: form.title.trim() || '未命名作品' })
  }

  const saveDraft = async () => {
    const ok = await doSave({ status: 'draft' })
    if (ok) show('已存为草稿')
  }

  const setCover = async (file: File) => {
    setCoverBusy(true)
    try {
      const url = await uploadFile('cover', file)
      patch({ cover: url, cover_source: null })
    } catch (err) {
      show(err instanceof Error ? err.message : '封面上传失败', 'error')
    } finally {
      setCoverBusy(false)
    }
  }

  // 文章中的全部图片 URL（供封面选取）
  const articleImages = form.content
    .filter((b): b is Extract<typeof b, { type: 'image' }> => b.type === 'image')
    .map((b) => b.url)
  // 封面：手动选择优先，否则默认第一张图
  const effectiveCover = form.cover ?? articleImages[0] ?? null

  if (!ready) {
    return (
      <AdminLayout active="works">
        <div className="py-40 text-center text-neutral-300 text-sm">加载中……</div>
      </AdminLayout>
    )
  }

  const saveLabel =
    saveState === 'saving'
      ? '正在保存…'
      : saveState === 'error'
        ? '保存失败'
        : saveState === 'saved'
          ? '已保存'
          : ''

  return (
    <AdminLayout active="works">
      <ToastContainer items={items} />
      <div className="sticky top-14 z-30 bg-white/95 backdrop-blur border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center gap-3">
          <Link to="/admin" className="text-sm text-neutral-400 hover:text-neutral-900 transition">
            ← 返回列表
          </Link>
          <span
            className={
              'text-xs transition-opacity duration-300 ' +
              (saveLabel ? 'opacity-100 ' : 'opacity-0 ') +
              (saveState === 'error' ? 'text-red-600' : 'text-neutral-400')
            }
          >
            {saveLabel}
          </span>
          <div className="flex-1" />
          {slug && (
            <a
              href={'/work/' + slug}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-neutral-500 hover:text-neutral-900 transition"
            >
              预览 ↗
            </a>
          )}
          <button
            onClick={saveDraft}
            className="h-9 px-4 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 transition"
          >
            存草稿
          </button>
          <button
            onClick={publish}
            className="h-9 px-5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition"
          >
            {form.status === 'published' ? '更新发布' : '发布'}
          </button>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 min-w-0 w-full">
          <input
            value={form.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="输入作品名称"
            maxLength={50}
            className="w-full text-3xl font-bold tracking-tight outline-none placeholder:text-neutral-300 bg-transparent"
          />
          <div className="h-px bg-neutral-100 mt-5" />
          <div className="mt-6">
            <BlockList
              blocks={form.content}
              onChange={(blocks) => patch({ content: blocks })}
              onToast={(m, k) => show(m, k)}
            />
          </div>
        </div>
        <aside className="w-full lg:w-72 shrink-0 space-y-8 lg:sticky lg:top-32">
          <section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">
              封面 <span className="text-red-500">*</span>
            </h3>
            <button
              onClick={() => setPickerOpen(true)}
              className="block w-full aspect-[4/3] rounded-xl overflow-hidden bg-neutral-50 relative group border border-neutral-200"
              title="修改封面"
            >
              {effectiveCover ? (
                <>
                  <img src={effectiveCover} alt="封面" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 text-white">
                    <span className="w-10 h-10 rounded-full bg-white text-neutral-800 flex items-center justify-center text-base">✎</span>
                    <span className="text-sm">{coverBusy ? '上传中…' : '修改封面'}</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-300 group-hover:text-neutral-500 transition border-2 border-dashed border-neutral-200 rounded-xl">
                  <span className="text-3xl leading-none">+</span>
                  <span className="text-xs">{coverBusy ? '上传中…' : '设置封面'}</span>
                </div>
              )}
            </button>
            <p className="mt-2 text-xs text-neutral-400">
              {form.cover ? '已手动选择封面' : '默认使用文章第一张图'} · 建议尺寸 800×600
              {form.cover && (
                <button
                  onClick={() => {
                    patch({ cover: null, cover_source: null })
                    show('已恢复默认封面（第一张图）')
                  }}
                  className="ml-2 text-neutral-400 hover:text-red-600 underline underline-offset-2 transition"
                >
                  恢复默认
                </button>
              )}
            </p>
            <input
              ref={coverRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setCover(f)
                e.target.value = ''
              }}
            />
          </section>

          {/* 页面背景主题 */}
          <section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">页面背景</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {([
                { v: 'light', label: '典雅白', cls: 'bg-white border-neutral-200' },
                { v: 'dark', label: '高端黑', cls: 'bg-neutral-950 border-neutral-950' },
              ] as const).map((o) => {
                const on = (form.bg_theme ?? 'light') === o.v
                return (
                  <button
                    key={o.v}
                    onClick={() => patch({ bg_theme: o.v })}
                    className={
                      'rounded-xl overflow-hidden border-2 transition ' +
                      (on ? 'border-neutral-900' : 'border-transparent hover:border-neutral-300')
                    }
                  >
                    <span className={'block h-14 ' + o.cls} />
                    <span
                      className={
                        'block py-1.5 text-xs text-center ' +
                        (on ? 'text-neutral-900 font-medium' : 'text-neutral-400')
                      }
                    >
                      {o.label}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-neutral-400">作品查看页的两侧背景颜色</p>
          </section>

          {/* 标签：自由输入，回车添加，点 × 删除 */}
          <section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">标签</h3>
            <div className="flex flex-wrap gap-2">
              {form.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-neutral-100 text-xs text-neutral-600"
                >
                  {t}
                  <button
                    onClick={() => patch({ tags: form.tags.filter((x) => x !== t) })}
                    className="text-neutral-400 hover:text-neutral-900"
                    title="删除标签"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <input
              placeholder="输入标签后回车添加"
              className="mt-2 w-full h-9 px-3 rounded-lg border border-neutral-200 text-sm outline-none focus:border-neutral-900 transition placeholder:text-neutral-300"
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                const v = e.currentTarget.value.trim()
                if (v && !form.tags.includes(v)) patch({ tags: [...form.tags, v] })
                e.currentTarget.value = ''
              }}
            />
            <p className="mt-2 text-xs text-neutral-400">用于前台展示和搜索，如：茶饼、包装、国风</p>
          </section>

          {/* 封面裁剪弹窗：站酷式——左预览 / 右裁剪 / 下方选图+上传 */}
          <CoverPicker
            open={pickerOpen}
            images={articleImages}
            title={form.title || '未命名作品'}
            date={formatDate(new Date().toISOString())}
            onCancel={() => setPickerOpen(false)}
            onConfirm={(url, sourceUrl) => {
              // 记录封面来源图（若来自正文），详情页据此避免重复展示；正文内容不动
              patch({ cover: url, cover_source: sourceUrl })
              setPickerOpen(false)
              show('封面已更新')
            }}
          />

          <section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">
              分类 <span className="text-red-500">*</span>
              <span className="ml-2 text-xs text-neutral-400 font-normal">可多选</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => {
                const on = form.categories.includes(c)
                return (
                  <button
                    key={c}
                    onClick={() =>
                      patch({
                        categories: on
                          ? form.categories.filter((x) => x !== c)
                          : [...form.categories, c],
                      })
                    }
                    className={
                      'px-3 h-8 rounded-lg text-sm transition ' +
                      (on
                        ? 'bg-neutral-900 text-white font-medium'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200')
                    }
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </section>
        </aside>
      </div>

      {/* 发布成功弹窗 */}
      {pubOk && (
        <div className="fixed inset-0 z-[95] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xs px-8 py-9 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-neutral-900 flex items-center justify-center mb-5">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3 className="font-bold text-lg tracking-tight">作品发布成功！</h3>
            <p className="text-xs text-neutral-400 mt-2">《{pubOk.title}》已发布，前台可见</p>
            {pubOk.slug && (
              <a
                href={'/work/' + pubOk.slug}
                target="_blank"
                rel="noreferrer"
                className="mt-3 text-xs text-neutral-500 hover:text-neutral-900 underline underline-offset-4 decoration-neutral-300 transition"
              >
                查看作品 ↗
              </a>
            )}
            <div className="flex items-center gap-3 mt-7 w-full">
              <button
                onClick={() => navigate('/admin/works/new')}
                className="flex-1 h-10 rounded-full border border-neutral-300 text-sm font-medium text-neutral-900 hover:border-neutral-900 transition"
              >
                再写一篇
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="flex-1 h-10 rounded-full bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-700 transition"
              >
                返回作品管理
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
