// 工作经历手风琴（移植自 xie-ke-1 项目 ResumeExperience：点击展开 + 滚动自动定位当前段）
import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { AboutJob } from '../types'

export default function ResumeJobs({ jobs }: { jobs: AboutJob[] }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-resume-job]'))
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(Number((visible[0].target as HTMLElement).dataset.resumeJob || 0))
      },
      { rootMargin: '-18% 0px -58% 0px', threshold: 0.01 },
    )
    items.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="resume-jobs">
      {jobs.map((job, i) => (
        <article data-resume-job={i} className={`resume-job ${active === i ? 'is-active' : ''}`} key={`${job.company}-${job.year}`}>
          <button
            className="resume-job-trigger"
            onClick={() => setActive(i)}
            aria-expanded={active === i}
          >
            <div className="resume-job-time">{job.year}</div>
            <div className="resume-job-head">
              <div>
                <h2>{job.company}</h2>
                <p>{job.role}</p>
              </div>
              <span>{job.city}</span>
            </div>
            <ChevronDown size={17} />
          </button>
          <div className={`resume-job-detail ${active === i ? 'open' : ''}`}>
            <ul>
              {job.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        </article>
      ))}
    </div>
  )
}
