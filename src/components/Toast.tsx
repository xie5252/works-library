import { useCallback, useState } from 'react'

export interface ToastItem {
  id: number
  message: string
  kind: 'success' | 'error'
}

let nextId = 1

// 全局 Toast：顶部居中，1.5 秒后淡出
export function useToasts() {
  const [items, setItems] = useState<ToastItem[]>([])

  // 稳定引用：避免依赖 show 的 effect 反复触发
  const show = useCallback((message: string, kind: ToastItem['kind'] = 'success') => {
    const id = nextId++
    setItems((prev) => [...prev, { id, message, kind }])
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 1500)
  }, [])

  return { items, show }
}

export function ToastContainer({ items }: { items: ToastItem[] }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={
            'toast-item px-4 py-2.5 rounded-lg text-sm shadow-lg ' +
            (t.kind === 'success' ? 'bg-neutral-900 text-white' : 'bg-red-600 text-white')
          }
        >
          {t.message}
        </div>
      ))}
      <style>{TOAST_CSS}</style>
    </div>
  )
}

const TOAST_CSS = `
.toast-item { animation: toast-in .2s ease both; }
@keyframes toast-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
`
