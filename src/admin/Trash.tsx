import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout, { checkSession } from '../components/AdminLayout'
import { api, jsonRequest } from '../api'
import type { Work } from '../types'
import { formatDateTime, coverOf } from '../components/format'
import { ToastContainer, useToasts } from '../components/Toast'

// 回收站：已删除作品列表，可恢复或彻底删除
export default function AdminTrash() {
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()
  const { items, show } = useToasts()

  useEffect(() => {
    checkSession().then((ok) => {
      if (!ok) navigate('/admin/login', { replace: true })
      else setChecking(false)
    })
  }, [navigate])

  const load = useCallback(() => {
    setLoading(true)
    api<Work[]>('/api/admin/works-deleted')
      .then(setWorks)
      .catch(() => setWorks([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!checking) load()
  }, [checking, load])

  const restore = async (w: Work) => {
    try {
      await api('/api/admin/works/' + w.id + '/restore', jsonRequest('PUT', {}))
      show('已恢复「' + w.title + '」')
      setWorks((prev) => prev.filter((x) => x.id !== w.id))
    } catch (err) {
      show(err instanceof Error ? err.message : '恢复失败', 'error')
    }
  }

  const purge = async (w: Work) => {
    if (!window.confirm('彻底删除「' + w.title + '」？此操作不可恢复（图片文件会保留在服务器）。')) return
    try {
      await api('/api/admin/works/' + w.id + '/purge', { method: 'DELETE' })
      show('已彻底删除')
      setWorks((prev) => prev.filter((x) => x.id !== w.id))
    } catch (err) {
      show(err instanceof Error ? err.message : '删除失败', 'error')
    }
  }

  if (checking) return null

  return (
    <AdminLayout active="trash">
      <ToastContainer items={items} />
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        <h1 className="text-2xl font-bold tracking-tight">回收站</h1>
        <p className="text-sm text-neutral-400 mt-2">
          删除的作品会保留在这里，可随时恢复；彻底删除后不可恢复。
        </p>
        <div className="mt-6 bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          {loading ? (
            <div className="py-24 text-center text-neutral-300 text-sm">加载中……</div>
          ) : works.length === 0 ? (
            <div className="py-24 text-center text-sm text-neutral-400">回收站是空的</div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {works.map((w) => (
                <li key={w.id} className="flex items-center gap-4 px-4 sm:px-6 py-4">
                  <div className="w-16 h-12 rounded-lg bg-neutral-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {coverOf(w) ? (
                      <img src={coverOf(w) || undefined} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-neutral-300 text-lg font-bold">{w.title.slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm truncate">{w.title}</h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      删除于 {w.deleted_at ? formatDateTime(w.deleted_at) : '-'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => restore(w)}
                      className="text-xs text-neutral-600 hover:text-neutral-900 h-8 px-3 rounded-lg border border-neutral-200 hover:border-neutral-900 transition"
                    >
                      恢复
                    </button>
                    <button
                      onClick={() => purge(w)}
                      className="text-xs text-neutral-400 hover:text-red-600 h-8 px-3 rounded-lg hover:bg-red-50 transition"
                    >
                      彻底删除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </AdminLayout>
  )
}
