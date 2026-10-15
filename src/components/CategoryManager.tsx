import { useCallback, useEffect, useRef, useState } from 'react'
import { api, jsonRequest } from '../api'
import type { Category } from '../types'
import CategoryIcon from './CategoryIcon'

interface Props {
  onToast: (message: string, kind?: 'success' | 'error') => void
}

// 分类管理：添加 / 删除 / 拖拽排序 / 行内改名（即时生效）
export default function CategoryManager({ onToast }: Props) {
  const [cats, setCats] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const dragIndex = useRef<number | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

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

  const saveName = async (cat: Category) => {
    const trimmed = editName.trim()
    setEditingId(null)
    if (!trimmed || trimmed === cat.name) return
    try {
      await api('/api/admin/categories/' + cat.id, jsonRequest('PUT', { name: trimmed }))
      load()
      onToast('已改名「' + cat.name + '」→「' + trimmed + '」，相关作品已同步更新')
    } catch (err) {
      onToast(err instanceof Error ? err.message : '改名失败', 'error')
    }
  }

  // 拖拽：拖动过程中实时交换本地顺序，松手后一次性提交新顺序
  const commitOrder = async (list: Category[]) => {
    try {
      await api(
        '/api/admin/categories/reorder',
        jsonRequest('PUT', { ids: list.map((c) => c.id) }),
      )
      load()
    } catch (err) {
      load()
      onToast(err instanceof Error ? err.message : '排序保存失败', 'error')
    }
  }

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    const from = dragIndex.current
    if (from === null || from === index) return
    const list = [...cats]
    const [moved] = list.splice(from, 1)
    list.splice(index, 0, moved)
    dragIndex.current = index
    setCats(list)
  }

  const onDragEnd = () => {
    setDraggingId(null)
    dragIndex.current = null
    commitOrder(cats)
  }

  const iconBtn =
    'w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition disabled:opacity-20 text-sm'

  return (
    <section>
      <h3 className="text-sm font-medium text-neutral-700 mb-3">作品分类</h3>
      <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 overflow-hidden">
        {cats.map((c) => (
          <li
            key={c.id}
            draggable={editingId !== c.id}
            onDragStart={(e) => {
              dragIndex.current = cats.findIndex((x) => x.id === c.id)
              setDraggingId(c.id)
              if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', String(c.id))
              }
            }}
            onDragOver={(e) => onDragOver(e, cats.findIndex((x) => x.id === c.id))}
            onDragEnd={onDragEnd}
            className={
              'flex items-center gap-3 px-4 h-12 bg-white transition ' +
              (draggingId === c.id ? 'opacity-40' : '')
            }
          >
            <span
              className="text-neutral-300 hover:text-neutral-500 cursor-grab active:cursor-grabbing select-none text-base leading-none shrink-0"
              title="拖动调整顺序"
            >
              ⠿
            </span>
            <CategoryIcon name={c.name} className="w-4 h-4 text-neutral-400 shrink-0" />
            {editingId === c.id ? (
              <input
                autoFocus
                value={editName}
                maxLength={12}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => saveName(c)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName(c)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="flex-1 h-8 px-2 rounded-lg border border-neutral-300 text-sm outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              />
            ) : (
              <span className="text-sm text-neutral-700 flex-1 truncate">{c.name}</span>
            )}
            <button
              onClick={() => {
                setEditingId(c.id)
                setEditName(c.name)
              }}
              className={iconBtn}
              title="重命名"
            >
              ✎
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
        分类在前台侧边栏和编辑器中即时生效；拖动 ⠿ 调整顺序；改名会同步更新已有作品的分类；
        删除分类不影响已有作品
      </p>
    </section>
  )
}
