import { useEffect, useState } from 'react'
import { api, jsonRequest } from '../api'
import type { AboutData } from '../types'
import { DEFAULT_ABOUT } from '../types'
import { ToastContainer, useToasts } from '../components/Toast'

// 合并默认值：老数据（v1 简版结构）直接换新默认值；缺字段补齐
function normalize(raw: unknown): AboutData {
  const d = DEFAULT_ABOUT
  if (!raw || typeof raw !== 'object') return d
  const o = raw as Partial<AboutData>
  if (!('strengths' in o) || !('jobs' in o)) return d
  return {
    name: o.name ?? d.name,
    title: o.title ?? d.title,
    lead: o.lead ?? d.lead,
    pdf_url: o.pdf_url ?? d.pdf_url,
    contact_email: o.contact_email ?? d.contact_email,
    contact_wechat: o.contact_wechat ?? d.contact_wechat,
    personal: Array.isArray(o.personal) ? o.personal : d.personal,
    strengths: Array.isArray(o.strengths) ? o.strengths : d.strengths,
    jobs: Array.isArray(o.jobs) ? o.jobs : d.jobs,
    featured: o.featured ?? d.featured,
    results: Array.isArray(o.results) ? o.results : d.results,
    products: Array.isArray(o.products) ? o.products : d.products,
    skill_groups: Array.isArray(o.skill_groups) ? o.skill_groups : d.skill_groups,
    skills: Array.isArray(o.skills) ? o.skills : d.skills,
    field: o.field ?? d.field,
    end: o.end ?? d.end,
  }
}

const inputCls =
  'w-full h-10 px-3 rounded-lg border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition bg-white'
const areaCls =
  'w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition bg-white leading-relaxed'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-neutral-500 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function ItemOps({
  index,
  total,
  onMove,
  onRemove,
}: {
  index: number
  total: number
  onMove: (from: number, to: number) => void
  onRemove: () => void
}) {
  const btn =
    'w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition text-sm disabled:opacity-30 disabled:pointer-events-none shrink-0'
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(index, index - 1)} title="上移">
        ↑
      </button>
      <button type="button" className={btn} disabled={index === total - 1} onClick={() => onMove(index, index + 1)} title="下移">
        ↓
      </button>
      <button type="button" className={btn + ' hover:!text-red-600 hover:!bg-red-50'} onClick={onRemove} title="删除">
        ✕
      </button>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6">
      <h2 className="text-sm font-bold tracking-tight">{title}</h2>
      {hint && <p className="text-xs text-neutral-400 mt-1">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

// 按钮样式复用
const addBtn =
  'h-8 px-3 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-500 hover:border-neutral-500 hover:text-neutral-900 transition'

export default function AboutEdit() {
  const { items, show } = useToasts()
  const [enabled, setEnabled] = useState(false)
  const [data, setData] = useState<AboutData>(DEFAULT_ABOUT)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<{ about?: string; about_enabled?: string }>('/api/admin/settings')
      .then((s) => {
        setEnabled(s.about_enabled === '1')
        if (s.about) {
          try {
            setData(normalize(JSON.parse(s.about)))
          } catch {
            // JSON 损坏则用默认值
          }
        }
      })
      .catch(() => {})
  }, [])

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      await api(
        '/api/admin/settings',
        jsonRequest('PUT', {
          about: JSON.stringify(data),
          about_enabled: enabled ? '1' : '0',
        }),
      )
      show(enabled ? '已保存，前台已显示「关于我」' : '已保存，「关于我」已隐藏')
    } catch (err) {
      show(err instanceof Error ? err.message : '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const set = <K extends keyof AboutData>(key: K, value: AboutData[K]) => setData((p) => ({ ...p, [key]: value }))
  const move = <T,>(arr: T[], from: number, to: number): T[] => {
    const next = [...arr]
    const [x] = next.splice(from, 1)
    next.splice(to, 0, x)
    return next
  }

  return (
    <>
      <ToastContainer items={items} />
      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">关于我</h1>
            <p className="text-sm text-neutral-400 mt-2">
              简历页（与参考站同款版式与动效）。开启后前台侧边栏出现「关于我」入口，关闭即恢复纯作品集
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="h-10 px-5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition disabled:opacity-50 shrink-0"
          >
            {saving ? '保存中……' : '保存'}
          </button>
        </div>

        {/* 开关 */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">前台显示「关于我」</p>
            <p className="text-xs text-neutral-400 mt-1">找工作时打开，平时关闭（入口完全隐藏，内容不下发）</p>
          </div>
          <button
            onClick={() => setEnabled((v) => !v)}
            className={'relative w-12 h-7 rounded-full transition shrink-0 ' + (enabled ? 'bg-neutral-900' : 'bg-neutral-200')}
            aria-label="开关"
          >
            <span
              className={'absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ' + (enabled ? 'translate-x-5' : '')}
            />
          </button>
        </div>

        <Section title="首屏" hint="姓名大字 + 一句话简介；PDF 填 /xie-ke-resume.pdf 显示下载按钮，留空隐藏">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="姓名">
              <input value={data.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
            </Field>
            <Field label="头衔 / 定位">
              <input value={data.title} onChange={(e) => set('title', e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="简介（首屏一段话）">
            <textarea value={data.lead} rows={3} onChange={(e) => set('lead', e.target.value)} className={areaCls} />
          </Field>
          <Field label="简历 PDF 地址（留空隐藏下载按钮）">
            <input value={data.pdf_url} onChange={(e) => set('pdf_url', e.target.value)} className={inputCls} placeholder="/xie-ke-resume.pdf" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="邮箱">
              <input value={data.contact_email} onChange={(e) => set('contact_email', e.target.value)} className={inputCls} />
            </Field>
            <Field label="微信">
              <input value={data.contact_wechat} onChange={(e) => set('contact_wechat', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Section>

        <Section title="01 个人信息" hint="两列信息格，label 在上 value 在下">
          <div className="space-y-2">
            {data.personal.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={p.label}
                  onChange={(e) => set('personal', data.personal.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  className={inputCls + ' sm:w-32 shrink-0'}
                  placeholder="项目"
                />
                <input
                  value={p.value}
                  onChange={(e) => set('personal', data.personal.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                  className={inputCls}
                  placeholder="内容"
                />
                <ItemOps
                  index={i}
                  total={data.personal.length}
                  onMove={(from, to) => set('personal', move(data.personal, from, to))}
                  onRemove={() => set('personal', data.personal.filter((_, j) => j !== i))}
                />
              </div>
            ))}
            <button type="button" onClick={() => set('personal', [...data.personal, { label: '', value: '' }])} className={addBtn}>
              + 添加一条
            </button>
          </div>
        </Section>

        <Section title="02 个人优势" hint="六张卡片（图标按序号自动对应），悬停有浮起动效">
          <div className="space-y-4">
            {data.strengths.map((s, i) => (
              <div key={i} className="rounded-xl border border-neutral-100 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <input
                    value={s.title}
                    onChange={(e) => set('strengths', data.strengths.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                    className={inputCls + ' flex-1 font-medium'}
                    placeholder="标题"
                  />
                  <input
                    value={s.highlight}
                    onChange={(e) => set('strengths', data.strengths.map((x, j) => (j === i ? { ...x, highlight: e.target.value } : x)))}
                    className={inputCls + ' sm:w-44 shrink-0'}
                    placeholder="标签（如：实体业务）"
                  />
                  <ItemOps
                    index={i}
                    total={data.strengths.length}
                    onMove={(from, to) => set('strengths', move(data.strengths, from, to))}
                    onRemove={() => set('strengths', data.strengths.filter((_, j) => j !== i))}
                  />
                </div>
                <textarea
                  value={s.body}
                  rows={2}
                  onChange={(e) => set('strengths', data.strengths.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))}
                  className={areaCls}
                  placeholder="说明"
                />
              </div>
            ))}
            <button type="button" onClick={() => set('strengths', [...data.strengths, { highlight: '', title: '', body: '' }])} className={addBtn}>
              + 添加优势
            </button>
          </div>
        </Section>

        <Section title="03 工作经历" hint="每段经历展开显示要点列表；浏览时自动展开当前段">
          <div className="space-y-4">
            {data.jobs.map((job, i) => (
              <div key={i} className="rounded-xl border border-neutral-100 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                    <input
                      value={job.year}
                      onChange={(e) => set('jobs', data.jobs.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)))}
                      className={inputCls}
                      placeholder="时间"
                    />
                    <input
                      value={job.company}
                      onChange={(e) => set('jobs', data.jobs.map((x, j) => (j === i ? { ...x, company: e.target.value } : x)))}
                      className={inputCls}
                      placeholder="公司"
                    />
                    <input
                      value={job.role}
                      onChange={(e) => set('jobs', data.jobs.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
                      className={inputCls}
                      placeholder="岗位"
                    />
                    <input
                      value={job.city}
                      onChange={(e) => set('jobs', data.jobs.map((x, j) => (j === i ? { ...x, city: e.target.value } : x)))}
                      className={inputCls}
                      placeholder="城市"
                    />
                  </div>
                  <ItemOps
                    index={i}
                    total={data.jobs.length}
                    onMove={(from, to) => set('jobs', move(data.jobs, from, to))}
                    onRemove={() => set('jobs', data.jobs.filter((_, j) => j !== i))}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-neutral-400">工作要点</p>
                  {job.bullets.map((b, k) => (
                    <div key={k} className="flex items-start gap-2">
                      <textarea
                        value={b}
                        rows={2}
                        onChange={(e) =>
                          set('jobs', data.jobs.map((x, j) => (j === i ? { ...x, bullets: x.bullets.map((y, l) => (l === k ? e.target.value : y)) } : x)))
                        }
                        className={areaCls}
                      />
                      <ItemOps
                        index={k}
                        total={job.bullets.length}
                        onMove={(from, to) => set('jobs', data.jobs.map((x, j) => (j === i ? { ...x, bullets: move(x.bullets, from, to) } : x)))}
                        onRemove={() => set('jobs', data.jobs.map((x, j) => (j === i ? { ...x, bullets: x.bullets.filter((_, l) => l !== k) } : x)))}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => set('jobs', data.jobs.map((x, j) => (j === i ? { ...x, bullets: [...x.bullets, ''] } : x)))}
                    className={addBtn}
                  >
                    + 添加要点
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set('jobs', [...data.jobs, { year: '', company: '', role: '', city: '', bullets: [''] }])}
              className={addBtn}
            >
              + 添加经历
            </button>
          </div>
        </Section>

        <Section title="04 核心成果 · 焦点卡">
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3">
            <Field label="卡片标题">
              <input
                value={data.featured.title}
                onChange={(e) => set('featured', { ...data.featured, title: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="说明">
              <input
                value={data.featured.body}
                onChange={(e) => set('featured', { ...data.featured, body: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <p className="text-xs text-neutral-400">卡片右侧按钮固定为「查看作品 ↗」，跳回作品首页</p>
        </Section>

        <Section title="04 核心成果 · 数据格" hint="三列大数字卡片">
          <div className="space-y-2">
            {data.results.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={r.value}
                  onChange={(e) => set('results', data.results.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                  className={inputCls + ' sm:w-36 shrink-0 font-bold'}
                  placeholder="数字"
                />
                <input
                  value={r.label}
                  onChange={(e) => set('results', data.results.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  className={inputCls + ' sm:w-44 shrink-0'}
                  placeholder="指标名"
                />
                <input
                  value={r.note}
                  onChange={(e) => set('results', data.results.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))}
                  className={inputCls}
                  placeholder="补充说明"
                />
                <ItemOps
                  index={i}
                  total={data.results.length}
                  onMove={(from, to) => set('results', move(data.results, from, to))}
                  onRemove={() => set('results', data.results.filter((_, j) => j !== i))}
                />
              </div>
            ))}
            <button type="button" onClick={() => set('results', [...data.results, { value: '', label: '', note: '' }])} className={addBtn}>
              + 添加数据
            </button>
          </div>
        </Section>

        <Section title="04 个人产品 / 独立开发" hint="三张卡片；图片填站点内地址，如 /app-bookkeeping.svg（已内置三张默认图）">
          <div className="space-y-2">
            {data.products.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={p.title}
                  onChange={(e) => set('products', data.products.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  className={inputCls + ' sm:w-40 shrink-0 font-medium'}
                  placeholder="名称"
                />
                <input
                  value={p.year}
                  onChange={(e) => set('products', data.products.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)))}
                  className={inputCls + ' sm:w-24 shrink-0'}
                  placeholder="年份"
                />
                <input
                  value={p.role}
                  onChange={(e) => set('products', data.products.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
                  className={inputCls + ' sm:w-32 shrink-0'}
                  placeholder="角色"
                />
                <input
                  value={p.metric}
                  onChange={(e) => set('products', data.products.map((x, j) => (j === i ? { ...x, metric: e.target.value } : x)))}
                  className={inputCls}
                  placeholder="亮点"
                />
                <input
                  value={p.image}
                  onChange={(e) => set('products', data.products.map((x, j) => (j === i ? { ...x, image: e.target.value } : x)))}
                  className={inputCls + ' sm:w-44 shrink-0'}
                  placeholder="图片地址"
                />
                <ItemOps
                  index={i}
                  total={data.products.length}
                  onMove={(from, to) => set('products', move(data.products, from, to))}
                  onRemove={() => set('products', data.products.filter((_, j) => j !== i))}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => set('products', [...data.products, { year: '', role: '', title: '', metric: '', image: '' }])}
              className={addBtn}
            >
              + 添加产品
            </button>
          </div>
        </Section>

        <Section title="05 专业技能 · 分组标签">
          <div className="space-y-4">
            {data.skill_groups.map((g, i) => (
              <div key={i} className="rounded-xl border border-neutral-100 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    value={g.title}
                    onChange={(e) => set('skill_groups', data.skill_groups.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                    className={inputCls + ' flex-1 font-medium'}
                    placeholder="分组名"
                  />
                  <ItemOps
                    index={i}
                    total={data.skill_groups.length}
                    onMove={(from, to) => set('skill_groups', move(data.skill_groups, from, to))}
                    onRemove={() => set('skill_groups', data.skill_groups.filter((_, j) => j !== i))}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((item, k) => (
                    <span key={k} className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full border border-neutral-200 text-xs">
                      <input
                        value={item}
                        onChange={(e) =>
                          set('skill_groups', data.skill_groups.map((x, j) => (j === i ? { ...x, items: x.items.map((y, l) => (l === k ? e.target.value : y)) } : x)))
                        }
                        className="w-28 bg-transparent outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => set('skill_groups', data.skill_groups.map((x, j) => (j === i ? { ...x, items: x.items.filter((_, l) => l !== k) } : x)))}
                        className="w-5 h-5 rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50 transition text-[10px]"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => set('skill_groups', data.skill_groups.map((x, j) => (j === i ? { ...x, items: [...x.items, ''] } : x)))}
                    className={addBtn}
                  >
                    + 标签
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => set('skill_groups', [...data.skill_groups, { title: '', items: [''] }])} className={addBtn}>
              + 添加分组
            </button>
          </div>
        </Section>

        <Section title="05 专业技能 · 熟练度" hint="0–100 分，黑色面板内渲染为进度条">
          <div className="space-y-2">
            {data.skills.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={s.name}
                  onChange={(e) => set('skills', data.skills.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  className={inputCls + ' sm:w-48 shrink-0'}
                  placeholder="技能"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={s.level}
                  onChange={(e) =>
                    set('skills', data.skills.map((x, j) => (j === i ? { ...x, level: Math.max(0, Math.min(100, Number(e.target.value) || 0)) } : x)))
                  }
                  className={inputCls + ' sm:w-24 shrink-0'}
                />
                <ItemOps
                  index={i}
                  total={data.skills.length}
                  onMove={(from, to) => set('skills', move(data.skills, from, to))}
                  onRemove={() => set('skills', data.skills.filter((_, j) => j !== i))}
                />
              </div>
            ))}
            <button type="button" onClick={() => set('skills', [...data.skills, { name: '', level: 80 }])} className={addBtn}>
              + 添加技能
            </button>
          </div>
        </Section>

        <Section title="06 底层经历" hint="黑色大块：左侧标题+正文，右侧经历标签">
          <Field label="标题">
            <input value={data.field.title} onChange={(e) => set('field', { ...data.field, title: e.target.value })} className={inputCls} />
          </Field>
          <Field label="正文">
            <textarea value={data.field.body} rows={3} onChange={(e) => set('field', { ...data.field, body: e.target.value })} className={areaCls} />
          </Field>
          <div className="space-y-2">
            <p className="text-xs text-neutral-400">经历标签</p>
            {data.field.tags.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={t}
                  onChange={(e) => set('field', { ...data.field, tags: data.field.tags.map((x, j) => (j === i ? e.target.value : x)) })}
                  className={inputCls}
                />
                <ItemOps
                  index={i}
                  total={data.field.tags.length}
                  onMove={(from, to) => set('field', { ...data.field, tags: move(data.field.tags, from, to) })}
                  onRemove={() => set('field', { ...data.field, tags: data.field.tags.filter((_, j) => j !== i) })}
                />
              </div>
            ))}
            <button type="button" onClick={() => set('field', { ...data.field, tags: [...data.field.tags, ''] })} className={addBtn}>
              + 添加标签
            </button>
          </div>
        </Section>

        <Section title="结尾">
          <Field label="主标题">
            <input value={data.end.title} onChange={(e) => set('end', { ...data.end, title: e.target.value })} className={inputCls} />
          </Field>
          <Field label="副标题（灰色斜体行）">
            <input value={data.end.sub} onChange={(e) => set('end', { ...data.end, sub: e.target.value })} className={inputCls} />
          </Field>
        </Section>

        {/* 底部保存 */}
        <div className="flex justify-end pb-8">
          <button
            onClick={save}
            disabled={saving}
            className="h-10 px-8 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition disabled:opacity-50"
          >
            {saving ? '保存中……' : '保存'}
          </button>
        </div>
      </main>
    </>
  )
}
