import { useCallback, useEffect, useState } from 'react'
import { api, jsonRequest } from '../api'
import type { Category } from '../types'
import CategoryIcon from './CategoryIcon'

interface Props {
  onToast: (message: string, kind?: 'success' | 'error') => void
}

// 分类管理：添加 / 删除 / 上下移动排序（即时生效）
export default function CategoryManager({ onToast }: Props) {
  const [cats, setCats] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api<Category[]>('/api/categories')
      .then(setCats)
      .catch(() => onToast('分类加载失败', 'error'))
  }, [onToast])

  useEffect(() => {
    load()
  }, [load])

  const add = async () => {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    try {
      await api('/api/admin/categories', jsonRequest('POST', { name: trimmed }))
      setName('')
      load()
      onToast('分类「' + trimmed + '」已添加')
    } catch (err) {
      onToast(err instanceof Error ? err.message : '添加失败', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (cat: Category) => {
    if (!window.confirm('删除分类「' + cat.name + '」？已有作品不受影响，仅从选项中移除。')) return
    try {
      await api('/api/admin/categories/' + cat.id, { method: 'DELETE' })
      load()
      onToast('已删除')
    } catch (err) {
      onToast(err instanceof Error ? err.message : '删除失败', 'error')
    }
  }

  const move = async (cat: Category, direction: 'up' | 'down') => {
    try {
      await api('/api/admin/categories/' + cat.id, jsonRequest('PUT', { direction }))
      load()
    } catch (err) {
      onToast(err instanceof Error ? err.message : '操作失败', 'error')
    }
  }

  const iconBtn =
    'w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition disabled:opacity-20 text-sm'

  return (
    <section>
      <h3 className="text-sm font-medium text-neutral-700 mb-3">作品分类</h3>
      <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 overflow-hidden">
        {cats.map((c, i) => (
          <li key={c.id} className="flex items-center gap-3 px-4 h-12 bg-white">
            <CategoryIcon name={c.name} className="w-4 h-4 text-neutral-400 shrink-0" />
            <span className="text-sm text-neutral-700 flex-1 truncate">{c.name}</span>
            <button
              onClick={() => move(c, 'up')}
              disabled={i === 0}
              className={iconBtn}
              title="上移"
            >
              ↑
            </button>
            <button
              onClick={() => move(c, 'down')}
              disabled={i === cats.length - 1}
              className={iconBtn}
              title="下移"
            >
              ↓
            </button>
            <button
              onClick={() => remove(c)}
              className={iconBtn + ' hover:!text-red-600'}
              title="删除"
            >
              ✕
            </button>
          </li>
        ))}
        {cats.length === 0 && (
          <li className="px-4 h-12 flex items-center text-sm text-neutral-300 bg-white">
            还没有分类，添加一个吧
          </li>
        )}
      </ul>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
          placeholder="新分类名称（最多 12 字）"
          maxLength={12}
          className="flex-1 h-10 px-4 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
        />
        <button
          onClick={add}
          disabled={busy || !name.trim()}
          className="h-10 px-5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
        >
          添加
        </button>
      </div>
      <p className="text-xs text-neutral-400 mt-2">
        分类在前台侧边栏和编辑器中即时生效；删除分类不影响已有作品
      </p>
    </section>
  )
}
