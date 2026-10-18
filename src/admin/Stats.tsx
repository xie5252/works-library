import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { ToastContainer, useToasts } from '../components/Toast'

interface StatsData {
  total_views: number
  today_views: number
  today_uv: number
  total_uv: number
  works_count: number
  avg_views: number
  trend: { date: string; views: number; uv: number }[]
  top: { slug: string; title: string; views: number }[]
  geo: { region: string; views: number }[]
  recent: { ts: string; region: string; slug: string; title: string }[]
}

const fmt = (n: number) => n.toLocaleString('zh-CN')

export default function AdminStats() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const { items, show } = useToasts()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef = useRef<{ destroy: () => void } | null>(null)

  useEffect(() => {
    api<StatsData>('/api/admin/stats')
      .then(setData)
      .catch(() => show('统计数据加载失败', 'error'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 趋势图（动态加载 chart.js，独立 chunk 不拖慢后台其他页面）
  useEffect(() => {
    if (!data || !canvasRef.current) return
    let disposed = false
    import('chart.js').then(({ Chart, registerables }) => {
      if (disposed || !canvasRef.current) return
      Chart.register(...registerables)
      chartRef.current?.destroy()
      const labels = data.trend.map((t) => t.date.slice(5)) // MM-DD
      chartRef.current = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: '浏览量 PV',
              data: data.trend.map((t) => t.views),
              borderColor: '#111111',
              backgroundColor: 'rgba(17,17,17,0.06)',
              fill: true,
              tension: 0.35,
              pointRadius: 2,
              pointHoverRadius: 4,
              borderWidth: 2,
            },
            {
              label: '访客数 UV',
              data: data.trend.map((t) => t.uv),
              borderColor: '#a3a3a3',
              backgroundColor: 'transparent',
              fill: false,
              tension: 0.35,
              pointRadius: 2,
              pointHoverRadius: 4,
              borderWidth: 1.5,
              borderDash: [5, 4],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { labels: { color: '#525252', boxWidth: 16, font: { size: 12 } } },
            tooltip: { backgroundColor: '#111111', padding: 10, cornerRadius: 8 },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#a3a3a3', font: { size: 11 }, maxTicksLimit: 10 } },
            y: { beginAtZero: true, grid: { color: '#f0f0f0' }, ticks: { color: '#a3a3a3', font: { size: 11 }, precision: 0 } },
          },
        },
      })
    })
    return () => {
      disposed = true
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [data])

  const cards = data
    ? [
        { label: '总浏览量（PV）', value: fmt(data.total_views), sub: `累计独立访客 ${fmt(data.total_uv)}` },
        { label: '今日浏览', value: fmt(data.today_views), sub: `今日访客 ${fmt(data.today_uv)}` },
        { label: '已发布作品', value: fmt(data.works_count), sub: '不含草稿与回收站' },
        { label: '平均单篇浏览', value: fmt(data.avg_views), sub: '总浏览 ÷ 已发布数' },
      ]
    : []
  const topMax = data && data.top.length > 0 ? Math.max(...data.top.map((t) => t.views), 1) : 1
  const geoMax = data && data.geo.length > 0 ? Math.max(...data.geo.map((g) => g.views), 1) : 1
  const fmtTime = (ts: string) => {
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  return (
    <div className="max-w-5xl mx-auto">
      <ToastContainer items={items} />
      <h1 className="text-2xl font-bold tracking-tight">数据面板</h1>
      <p className="text-xs text-neutral-400 mt-1">浏览量 PV = 详情页访问次数；访客数 UV = 按浏览器去重（cookie，一年有效）</p>

      {loading ? (
        <div className="mt-16 text-sm text-neutral-300">加载中……</div>
      ) : !data ? (
        <div className="mt-16 text-sm text-neutral-300">暂无数据</div>
      ) : (
        <>
          {/* 汇总卡 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            {cards.map((c) => (
              <div key={c.label} className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="text-xs text-neutral-400">{c.label}</p>
                <p className="text-3xl font-bold tracking-tight mt-2 tabular-nums">{c.value}</p>
                <p className="text-xs text-neutral-400 mt-2">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* 趋势图 */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 mt-4">
            <p className="text-sm font-semibold">近 30 天趋势</p>
            <div className="h-72 mt-3">
              <canvas ref={canvasRef} />
            </div>
          </div>

          {/* TOP10 排行 */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 mt-4">
            <p className="text-sm font-semibold">作品浏览 TOP 10</p>
            {data.top.length === 0 ? (
              <p className="text-xs text-neutral-400 mt-4">还没有浏览数据</p>
            ) : (
              <ol className="mt-3 space-y-2.5">
                {data.top.map((t, i) => (
                  <li key={t.slug} className="flex items-center gap-3">
                    <span className={'w-6 text-center text-sm font-bold ' + (i < 3 ? 'text-neutral-900' : 'text-neutral-300')}>
                      {i + 1}
                    </span>
                    <a href={`/work/${t.slug}`} target="_blank" rel="noreferrer" className="w-56 shrink-0 truncate text-sm text-neutral-700 hover:text-neutral-900 hover:underline">
                      {t.title}
                    </a>
                    <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                      <div className="h-full rounded-full bg-neutral-900" style={{ width: `${Math.max((t.views / topMax) * 100, 2)}%` }} />
                    </div>
                    <span className="w-14 text-right text-sm tabular-nums text-neutral-500">{fmt(t.views)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* 地区分布 + 最近访问 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 items-start">
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-sm font-semibold">访客地区分布</p>
              {data.geo.length === 0 ? (
                <p className="text-xs text-neutral-400 mt-4">还没有地区数据（上线后开始记录）</p>
              ) : (
                <ol className="mt-3 space-y-2.5">
                  {data.geo.map((g, i) => (
                    <li key={g.region} className="flex items-center gap-3">
                      <span className={'w-6 text-center text-sm font-bold ' + (i < 3 ? 'text-neutral-900' : 'text-neutral-300')}>{i + 1}</span>
                      <span className="w-28 shrink-0 truncate text-sm text-neutral-700">{g.region}</span>
                      <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                        <div className="h-full rounded-full bg-neutral-900" style={{ width: `${Math.max((g.views / geoMax) * 100, 2)}%` }} />
                      </div>
                      <span className="w-14 text-right text-sm tabular-nums text-neutral-500">{fmt(g.views)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-sm font-semibold">最近访问</p>
              {data.recent.length === 0 ? (
                <p className="text-xs text-neutral-400 mt-4">还没有访问记录（上线后开始记录）</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.recent.map((r, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-neutral-400 tabular-nums shrink-0">{fmtTime(r.ts)}</span>
                      <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-xs text-neutral-600 shrink-0">{r.region}</span>
                      <span className="truncate text-neutral-700">看了「{r.title}」</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
