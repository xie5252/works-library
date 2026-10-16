// 关于我 / 简历页 —— 1:1 移植 xie-ke-1 简历项目 /resume 页面（样式与动效一并搬运）
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Download, Mail, Sparkles, Target, Layers3, Factory, Database, Bot, BarChart3 } from 'lucide-react'
import { api } from '../api'
import type { SiteSettings, AboutData, AboutStrength } from '../types'
import { DEFAULT_ABOUT } from '../types'
import { ScrollReveal } from '../components/ScrollReveal'
import ResumeJobs from '../components/ResumeJobs'
import './About.css'

// 与原项目一致的六张优势卡图标（按序号对应）
const STRENGTH_ICONS = [Target, Layers3, Factory, Database, Bot, BarChart3]

function normalize(raw: unknown): AboutData {
  const d = DEFAULT_ABOUT
  if (!raw || typeof raw !== 'object') return d
  const o = raw as Partial<AboutData>
  // v1 旧结构（stats/timeline）直接用新默认值覆盖
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
    results: Array.isArray(o.results) ? o.results : d.results,
    skill_groups: Array.isArray(o.skill_groups) ? o.skill_groups : d.skill_groups,
    skills: Array.isArray(o.skills) ? o.skills : d.skills,
    field: o.field ?? d.field,
    end: o.end ?? d.end,
  }
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
    window.scrollTo(0, 0)
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
    <div className="about-page">
      {/* 顶栏 */}
      <header className="sticky top-0 z-40 border-b border-[#e4e4df] bg-[#f7f7f5]/85 backdrop-blur">
        <div className="about-page-header mx-auto flex h-14 max-w-[1180px] items-center justify-between px-5 sm:px-8" style={{ width: '100%' }}>
          <Link to="/" className="text-sm text-[#92928c] transition-colors hover:text-[#111]">
            ← 返回作品
          </Link>
          <span className="text-sm font-bold tracking-tight">{settings?.site_name || a.name}</span>
        </div>
      </header>

      <main className="resume-page container pb-24">
        {/* 首屏 */}
        <header className="resume-hero reveal">
          <div>
            <p className="eyebrow">RESUME / 综合简历</p>
            <h1>{a.name}</h1>
            <p className="resume-title">{a.title}</p>
            <p className="resume-lead">{a.lead}</p>
          </div>
          {a.pdf_url && (
            <a href={a.pdf_url} download className="pill-black">
              <Download size={15} /> 下载 PDF
            </a>
          )}
        </header>

        {/* 01 个人信息 */}
        {a.personal.length > 0 && (
          <ScrollReveal>
            <section className="resume-section">
              <div className="resume-section-label"><span>01</span> 个人信息</div>
              <div className="basic-grid">
                {a.personal.map((p, i) => (
                  <div className="basic-item" key={i}>
                    <span>{p.label}</span>
                    <strong>{p.value}</strong>
                  </div>
                ))}
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* 02 个人优势 */}
        {a.strengths.length > 0 && (
          <ScrollReveal>
            <section className="resume-section">
              <div className="resume-section-label"><span>02</span> 个人优势</div>
              <div className="strength-grid">
                {a.strengths.map((item: AboutStrength, i) => {
                  const Icon = STRENGTH_ICONS[i % STRENGTH_ICONS.length]
                  return (
                    <article key={i} className="strength-card">
                      <div className="strength-top">
                        <span>{String(i + 1).padStart(2, '0')}</span>
                        <i><Icon size={15} /></i>
                      </div>
                      <h2>{item.title}</h2>
                      <mark>{item.highlight}</mark>
                      <p>{item.body}</p>
                    </article>
                  )
                })}
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* 03 工作经历 */}
        {a.jobs.length > 0 && (
          <ScrollReveal>
            <section className="resume-section">
              <div className="resume-section-label"><span>03</span> 工作经历</div>
              <ResumeJobs jobs={a.jobs} />
            </section>
          </ScrollReveal>
        )}

        {/* 04 核心成果 */}
        <ScrollReveal>
          <section className="resume-section">
            <div className="resume-section-label"><span>04</span> 核心成果</div>
            <div className="resume-results">
              {a.results.map((r, i) => (
                <div key={i}>
                  <strong>{r.value}</strong>
                  <span>{r.label}</span>
                  <p>{r.note}</p>
                </div>
              ))}
            </div>
            <div className="resume-core-links">
              <Link to="/" className="pill-black">查看全部作品 ↗</Link>
            </div>
          </section>
        </ScrollReveal>

        {/* 05 专业技能 */}
        {(a.skill_groups.length > 0 || a.skills.length > 0) && (
          <ScrollReveal>
            <section className="resume-section">
              <div className="resume-section-label"><span>05</span> 专业技能</div>
              <div className="skill-panel">
                <div className="skill-groups">
                  {a.skill_groups.map((g, i) => (
                    <div className="skill-group" key={i}>
                      <h3>{g.title}</h3>
                      <div>
                        {g.items.map((item, j) => (
                          <span key={j}>{item}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="skill-scores">
                  <div className="skill-score-title"><Sparkles size={14} /> 熟练度参考</div>
                  {a.skills.map((s, i) => (
                    <div className="skill-row" key={i}>
                      <span>{s.name}</span>
                      <div><i style={{ width: `${Math.max(0, Math.min(100, s.level))}%` }} /></div>
                      <b>{s.level}</b>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* 06 底层经历 */}
        <ScrollReveal>
          <section className="resume-section">
            <div className="resume-section-label"><span>06</span> 底层经历</div>
            <div className="field-experience">
              <div className="field-exp-lead">
                <span className="eyebrow-small">REAL-WORLD / FRONTLINE</span>
                <h2>{a.field.title}</h2>
                <p>{a.field.body}</p>
              </div>
              <div className="field-exp-tags">
                {a.field.tags.map((t, i) => (
                  <span key={i}>{t}</span>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* 结尾 */}
        <ScrollReveal>
          <section className="resume-end">
            <p className="eyebrow">NEXT / 继续向前</p>
            <h2>
              {a.end.title}
              <br />
              <em>{a.end.sub}</em>
            </h2>
            <div>
              {a.contact_email && (
                <a href={`mailto:${a.contact_email}`} className="pill-black">
                  <Mail size={15} /> {a.contact_email}
                </a>
              )}
              <Link to="/" className="pill-light">查看作品</Link>
            </div>
          </section>
        </ScrollReveal>

        <footer className="pb-10 text-center text-xs text-neutral-400">
          {settings?.footer_credit || 'Design · Product · Digital · Ai'}
          {settings?.beian_no && (
            <>
              {' · '}
              <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="transition-colors hover:text-neutral-600">
                {settings.beian_no}
              </a>
            </>
          )}
        </footer>
      </main>
    </div>
  )
}
