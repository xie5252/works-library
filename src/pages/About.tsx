import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../api'
import type { SiteSettings, AboutData } from '../types'
import { DEFAULT_ABOUT } from '../types'

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

function SectionTitle({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 mb-6 sm:mb-8">
      <span className="text-[11px] font-medium tracking-[0.25em] text-neutral-300 tabular-nums">{index}</span>
      <h2 className="text-lg sm:text-xl font-bold tracking-tight">{children}</h2>
    </div>
  )
}

export default function About() {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [about, setAbout] = useState<AboutData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<SiteSettings & { about?: string }>('/api/admin/settings')
      .then((s) => {
        setSettings(s)
        if (s.about_enabled === '1' && s.about) {
          try {
            setAbout(normalize(JSON.parse(s.about)))
          } catch {
            setAbout(DEFAULT_ABOUT)
          }
        }
        document.title = '关于我'
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // 关闭状态：直接回首页（入口隐藏 + 内容不下发）
  if (!loading && settings && settings.about_enabled !== '1') {
    return <Navigate to="/" replace />
  }

  if (loading) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-neutral-300 text-sm">加载中……</div>
  }
  if (!about) return <Navigate to="/" replace />

  const a = about

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* 顶栏 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-neutral-100">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 h-14 flex items-center gap-4">
          <Link to="/" className="text-sm text-neutral-400 hover:text-neutral-900 transition">
            ← 返回作品
          </Link>
          <div className="flex-1" />
          <span className="text-sm font-bold tracking-tight">{settings?.site_name || a.name}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-8 pb-24">
        {/* 首屏 */}
        <section className="pt-16 sm:pt-24 pb-12 sm:pb-16">
          <p className="text-[11px] font-medium tracking-[0.3em] text-neutral-300 uppercase">{a.name_en}</p>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mt-3">{a.name}</h1>
          <p className="text-base sm:text-lg text-neutral-500 mt-4">{a.title}</p>
          <p className="text-sm sm:text-[15px] leading-relaxed text-neutral-600 mt-8 max-w-2xl">{a.tagline}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-8 text-sm text-neutral-500">
            {a.contact_email && <span>邮箱 {a.contact_email}</span>}
            {a.contact_phone && <span>电话 {a.contact_phone}</span>}
            {a.contact_wechat && <span>微信 {a.contact_wechat}</span>}
          </div>
        </section>

        <div className="border-t border-neutral-100" />

        {/* 数据墙 */}
        {a.stats.length > 0 && (
          <section className="py-12 sm:py-16">
            <SectionTitle index="01">数据墙</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
              {a.stats.map((s, i) => (
                <div key={i}>
                  <p className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">{s.num}</p>
                  <p className="text-sm text-neutral-500 mt-2 leading-relaxed">{s.label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="border-t border-neutral-100" />

        {/* 经历时间线 */}
        {a.timeline.length > 0 && (
          <section className="py-12 sm:py-16">
            <SectionTitle index="02">经历</SectionTitle>
            <div className="space-y-10">
              {a.timeline.map((t, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 sm:gap-8">
                  <p className="text-xs text-neutral-400 tabular-nums pt-1">{t.period}</p>
                  <div>
                    <h3 className="font-bold text-[15px]">
                      {t.company}
                      <span className="text-neutral-400 font-normal"> · {t.role}</span>
                    </h3>
                    <p className="text-sm text-neutral-500 leading-relaxed mt-2">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="border-t border-neutral-100" />

        {/* 核心战绩 */}
        {a.achievements.length > 0 && (
          <section className="py-12 sm:py-16">
            <SectionTitle index="03">核心战绩</SectionTitle>
            <ol className="space-y-5">
              {a.achievements.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="text-xs font-bold text-neutral-300 tabular-nums pt-1 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-sm leading-relaxed text-neutral-600">{s}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="border-t border-neutral-100" />

        {/* 项目矩阵 */}
        {a.projects.length > 0 && (
          <section className="py-12 sm:py-16">
            <SectionTitle index="04">项目</SectionTitle>
            <div className="space-y-7">
              {a.projects.map((p, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 sm:gap-8">
                  <p className="text-xs text-neutral-400 tabular-nums pt-1">{p.year}</p>
                  <div>
                    <h3 className="font-bold text-[15px]">
                      {p.name}
                      <span className="text-neutral-400 font-normal"> · {p.role}</span>
                    </h3>
                    <p className="text-sm text-neutral-500 leading-relaxed mt-1.5">{p.result}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="border-t border-neutral-100" />

        {/* 能力四象限 */}
        {a.abilities.length > 0 && (
          <section className="py-12 sm:py-16">
            <SectionTitle index="05">能力</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {a.abilities.map((ab, i) => (
                <div key={i}>
                  <h3 className="font-bold text-sm">{ab.dim}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed mt-2">{ab.points}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="border-t border-neutral-100" />

        {/* 技能自评 */}
        {a.skills.length > 0 && (
          <section className="py-12 sm:py-16">
            <SectionTitle index="06">技能</SectionTitle>
            <div className="space-y-4 max-w-xl">
              {a.skills.map((s, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="w-36 shrink-0 text-sm text-neutral-600 truncate">{s.name}</span>
                  <div className="flex-1 h-1 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-neutral-900"
                      style={{ width: Math.max(0, Math.min(100, s.level)) + '%' }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-neutral-400 tabular-nums">{s.level}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="border-t border-neutral-100" />

        {/* 差异化 */}
        {a.differentiators.length > 0 && (
          <section className="py-12 sm:py-16">
            <SectionTitle index="07">为什么是我</SectionTitle>
            <div className="space-y-5">
              {a.differentiators.map((s, i) => (
                <div key={i} className="flex gap-4">
                  <span className="w-1 rounded-full bg-neutral-900 shrink-0 self-stretch" />
                  <p className="text-sm leading-relaxed text-neutral-600">{s}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 联系方式 */}
        <section className="py-12 sm:py-16 border-t border-neutral-100">
          <SectionTitle index="08">联系我</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {a.contact_email && (
              <div className="rounded-xl border border-neutral-200 p-5">
                <p className="text-[11px] font-medium tracking-widest text-neutral-300">EMAIL</p>
                <p className="text-sm mt-2 break-all">{a.contact_email}</p>
              </div>
            )}
            {a.contact_phone && (
              <div className="rounded-xl border border-neutral-200 p-5">
                <p className="text-[11px] font-medium tracking-widest text-neutral-300">PHONE</p>
                <p className="text-sm mt-2 tabular-nums">{a.contact_phone}</p>
              </div>
            )}
            {a.contact_wechat && (
              <div className="rounded-xl border border-neutral-200 p-5">
                <p className="text-[11px] font-medium tracking-widest text-neutral-300">WECHAT</p>
                <p className="text-sm mt-2">{a.contact_wechat}</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-100 py-8 text-center text-xs text-neutral-300">
        {settings?.footer_credit || 'Design · Product · Digital · Ai'}
        {settings?.beian_no && (
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
  )
}
