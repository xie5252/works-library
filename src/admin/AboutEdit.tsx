import { useEffect, useState } from 'react'
import { api, jsonRequest } from '../api'
import type { AboutData } from '../types'
import { DEFAULT_ABOUT } from '../types'
import { ToastContainer, useToasts } from '../components/Toast'

// 合并默认值：老数据缺字段时补齐，避免渲染崩溃
function normalize(raw: unknown): AboutData {
  const d = DEFAULT_ABOUT
  if (!raw || typeof raw !== 'object') return d
  const o = raw as Partial<AboutData>
  return {
    name: o.name ?? d.name,
    name_en: o.name_en ?? d.name_en,
    title: o.title ?? d.title,
    tagline: o.tagline ?? d.tagline,
    contact_email: o.contact_email ?? d.contact_email,
    contact_phone: o.contact_phone ?? d.contact_phone,
    contact_wechat: o.contact_wechat ?? d.contact_wechat,
    stats: Array.isArray(o.stats) ? o.stats : d.stats,
    timeline: Array.isArray(o.timeline) ? o.timeline : d.timeline,
    achievements: Array.isArray(o.achievements) ? o.achievements : d.achievements,
    projects: Array.isArray(o.projects) ? o.projects : d.projects,
    abilities: Array.isArray(o.abilities) ? o.abilities : d.abilities,
    skills: Array.isArray(o.skills) ? o.skills : d.skills,
    differentiators: Array.isArray(o.differentiators) ? o.differentiators : d.differentiators,
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

// 条目操作（上移 / 下移 / 删除）
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
    'w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition text-sm disabled:opacity-30 disabled:pointer-events-none'
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

// 字符串列表（战绩 / 差异化）
function StringList({
  items,
  onChange,
  placeholder,
  area,
}: {
  items: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  area?: boolean
}) {
  const move = (from: number, to: number) => {
    const next = [...items]
    const [x] = next.splice(from, 1)
    next.splice(to, 0, x)
    onChange(next)
  }
  return (
    <div className="space-y-2">
      {items.map((s, i) => (
        <div key={i} className="flex items-start gap-2">
          {area ? (
            <textarea
              value={s}
              rows={2}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              className={areaCls}
              placeholder={placeholder}
            />
          ) : (
            <input
              value={s}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              className={inputCls}
              placeholder={placeholder}
            />
          )}
          <ItemOps index={i} total={items.length} onMove={move} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="h-8 px-3 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-500 hover:border-neutral-500 hover:text-neutral-900 transition"
      >
        + 添加一条
      </button>
    </div>
  )
}

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
              简历式个人页。开启后前台侧边栏出现「关于我」入口，关闭即恢复纯作品集
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
            className={
              'relative w-12 h-7 rounded-full transition shrink-0 ' + (enabled ? 'bg-neutral-900' : 'bg-neutral-200')
            }
            aria-label="开关"
          >
            <span
              className={
                'absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ' +
                (enabled ? 'translate-x-5' : '')
              }
            />
          </button>
        </div>

        <Section title="基本信息">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="姓名">
              <input value={data.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
            </Field>
            <Field label="英文名 / 拼音">
              <input value={data.name_en} onChange={(e) => set('name_en', e.target.value)} className={inputCls} />
            </Field>
            <Field label="目标岗位 / 头衔">
              <input value={data.title} onChange={(e) => set('title', e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="一句话定位（首屏简介）">
            <textarea value={data.tagline} rows={4} onChange={(e) => set('tagline', e.target.value)} className={areaCls} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="邮箱">
              <input value={data.contact_email} onChange={(e) => set('contact_email', e.target.value)} className={inputCls} />
            </Field>
            <Field label="电话">
              <input value={data.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} className={inputCls} />
            </Field>
            <Field label="微信">
              <input value={data.contact_wechat} onChange={(e) => set('contact_wechat', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Section>

        <Section title="数据墙" hint="最硬的几个数字，横排大字展示">
          <div className="space-y-2">
            {data.stats.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={s.num}
                  onChange={(e) => set('stats', data.stats.map((x, j) => (j === i ? { ...x, num: e.target.value } : x)))}
                  className={inputCls + ' sm:w-32 shrink-0 font-bold'}
                  placeholder="数字"
                />
                <input
                  value={s.label}
                  onChange={(e) => set('stats', data.stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  className={inputCls}
                  placeholder="说明"
                />
                <ItemOps
                  index={i}
                  total={data.stats.length}
                  onMove={(from, to) => set('stats', move(data.stats, from, to))}
                  onRemove={() => set('stats', data.stats.filter((_, j) => j !== i))}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => set('stats', [...data.stats, { num: '', label: '' }])}
              className="h-8 px-3 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-500 hover:border-neutral-500 hover:text-neutral-900 transition"
            >
              + 添加数据
            </button>
          </div>
        </Section>

        <Section title="经历时间线">
          <div className="space-y-4">
            {data.timeline.map((t, i) => (
              <div key={i} className="rounded-xl border border-neutral-100 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                    <input
                      value={t.period}
                      onChange={(e) => set('timeline', data.timeline.map((x, j) => (j === i ? { ...x, period: e.target.value } : x)))}
                      className={inputCls}
                      placeholder="时间（如 2023.10 – 至今）"
                    />
                    <input
                      value={t.company}
                      onChange={(e) => set('timeline', data.timeline.map((x, j) => (j === i ? { ...x, company: e.target.value } : x)))}
                      className={inputCls}
                      placeholder="公司"
                    />
                    <input
                      value={t.role}
                      onChange={(e) => set('timeline', data.timeline.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
                      className={inputCls}
                      placeholder="岗位"
                    />
                  </div>
                  <ItemOps
                    index={i}
                    total={data.timeline.length}
                    onMove={(from, to) => set('timeline', move(data.timeline, from, to))}
                    onRemove={() => set('timeline', data.timeline.filter((_, j) => j !== i))}
                  />
                </div>
                <textarea
                  value={t.desc}
                  rows={2}
                  onChange={(e) => set('timeline', data.timeline.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))}
                  className={areaCls}
                  placeholder="职责与成果"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => set('timeline', [...data.timeline, { period: '', company: '', role: '', desc: '' }])}
              className="h-8 px-3 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-500 hover:border-neutral-500 hover:text-neutral-900 transition"
            >
              + 添加经历
            </button>
          </div>
        </Section>

        <Section title="核心战绩">
          <StringList
            items={data.achievements}
            onChange={(v) => set('achievements', v)}
            placeholder="一条战绩"
            area
          />
        </Section>

        <Section title="项目矩阵">
          <div className="space-y-4">
            {data.projects.map((p, i) => (
              <div key={i} className="rounded-xl border border-neutral-100 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                    <input
                      value={p.name}
                      onChange={(e) => set('projects', data.projects.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      className={inputCls}
                      placeholder="项目名"
                    />
                    <input
                      value={p.year}
                      onChange={(e) => set('projects', data.projects.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)))}
                      className={inputCls}
                      placeholder="年份"
                    />
                    <input
                      value={p.role}
                      onChange={(e) => set('projects', data.projects.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
                      className={inputCls}
                      placeholder="角色"
                    />
                  </div>
                  <ItemOps
                    index={i}
                    total={data.projects.length}
                    onMove={(from, to) => set('projects', move(data.projects, from, to))}
                    onRemove={() => set('projects', data.projects.filter((_, j) => j !== i))}
                  />
                </div>
                <input
                  value={p.result}
                  onChange={(e) => set('projects', data.projects.map((x, j) => (j === i ? { ...x, result: e.target.value } : x)))}
                  className={inputCls}
                  placeholder="关键结果"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => set('projects', [...data.projects, { name: '', year: '', role: '', result: '' }])}
              className="h-8 px-3 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-500 hover:border-neutral-500 hover:text-neutral-900 transition"
            >
              + 添加项目
            </button>
          </div>
        </Section>

        <Section title="能力四象限">
          <div className="space-y-2">
            {data.abilities.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={a.dim}
                  onChange={(e) => set('abilities', data.abilities.map((x, j) => (j === i ? { ...x, dim: e.target.value } : x)))}
                  className={inputCls + ' sm:w-44 shrink-0 font-medium'}
                  placeholder="维度"
                />
                <input
                  value={a.points}
                  onChange={(e) => set('abilities', data.abilities.map((x, j) => (j === i ? { ...x, points: e.target.value } : x)))}
                  className={inputCls}
                  placeholder="要点"
                />
                <ItemOps
                  index={i}
                  total={data.abilities.length}
                  onMove={(from, to) => set('abilities', move(data.abilities, from, to))}
                  onRemove={() => set('abilities', data.abilities.filter((_, j) => j !== i))}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => set('abilities', [...data.abilities, { dim: '', points: '' }])}
              className="h-8 px-3 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-500 hover:border-neutral-500 hover:text-neutral-900 transition"
            >
              + 添加维度
            </button>
          </div>
        </Section>

        <Section title="技能自评" hint="0–100 分，前台渲染为进度条">
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
                    set(
                      'skills',
                      data.skills.map((x, j) =>
                        j === i ? { ...x, level: Math.max(0, Math.min(100, Number(e.target.value) || 0)) } : x,
                      ),
                    )
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
            <button
              type="button"
              onClick={() => set('skills', [...data.skills, { name: '', level: 80 }])}
              className="h-8 px-3 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-500 hover:border-neutral-500 hover:text-neutral-900 transition"
            >
              + 添加技能
            </button>
          </div>
        </Section>

        <Section title="差异化">
          <StringList
            items={data.differentiators}
            onChange={(v) => set('differentiators', v)}
            placeholder="一条差异化优势"
            area
          />
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
