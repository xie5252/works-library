import { useRef, useState } from 'react'
import type { ContentBlock, TextFmt } from '../types'
import { uploadFile } from '../api'

interface Props {
  blocks: ContentBlock[]
  onChange: (blocks: ContentBlock[]) => void
  onToast: (message: string, kind?: 'success' | 'error') => void
}

type MenuState = { kind: 'plus' | 'media'; at: number } | null

// 站酷式连续编辑器：左侧 ⊕ 菜单（排版/上传）、媒体排序弹窗
export default function BlockList({ blocks, onChange, onToast }: Props) {
  const [menu, setMenu] = useState<MenuState>(null)
  const [sortOpen, setSortOpen] = useState(false)
  const [sortSeq, setSortSeq] = useState<number[]>([]) // 媒体块的 blocks 索引顺序
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const imgRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const uploadAtRef = useRef(0)

  const patch = (i: number, p: Partial<ContentBlock>) =>
    onChange(blocks.map((b, idx) => (idx === i ? ({ ...b, ...p } as ContentBlock) : b)))

  const setFmt = (i: number, p: Partial<TextFmt>) => {
    const b = blocks[i]
    if (b.type !== 'text') return
    patch(i, { fmt: { ...(b.fmt || {}), ...p } } as Partial<ContentBlock>)
  }

  const remove = (i: number) => {
    onChange(blocks.filter((_, idx) => idx !== i))
    setMenu(null)
  }

  const insertAfter = (i: number, b: ContentBlock) => {
    const next = [...blocks]
    next.splice(i + 1, 0, b)
    onChange(next)
  }

  const pick = (kind: 'image' | 'video' | 'pdf', at: number) => {
    uploadAtRef.current = at
    setMenu(null)
    if (kind === 'image') imgRef.current?.click()
    else if (kind === 'video') videoRef.current?.click()
    else pdfRef.current?.click()
  }

  const upload = async (kind: 'image' | 'video' | 'pdf', file: File) => {
    setUploading(true)
    try {
      const url = await uploadFile(kind, file)
      const b: ContentBlock =
        kind === 'image'
          ? { type: 'image', url }
          : kind === 'video'
            ? { type: 'video', url }
            : { type: 'pdf', url, title: file.name }
      insertAfter(uploadAtRef.current, b)
    } catch (err) {
      onToast(err instanceof Error ? err.message : '上传失败', 'error')
    } finally {
      setUploading(false)
    }
  }

  // 多图依次上传：按选择顺序逐张插入到插入点之后
  // （本地累积插入结果再提交，避免连续 onChange 基于过期 blocks 互相覆盖）
  const uploadManyImages = async (files: File[], at: number) => {
    setUploading(true)
    let base = [...blocks]
    let insertAt = at
    for (const file of files) {
      try {
        const url = await uploadFile('image', file)
        base = [...base]
        base.splice(insertAt + 1, 0, { type: 'image', url } as ContentBlock)
        insertAt += 1
        onChange(base)
      } catch (err) {
        onToast(
          (err instanceof Error ? err.message : '上传失败') + '：' + file.name,
          'error',
        )
      }
    }
    setUploading(false)
  }

  // ---------- 排序弹窗（全部块：文字/图片/视频/PDF） ----------
  const openSort = () => {
    setSortSeq(blocks.map((_, i) => i))
    setMenu(null)
    setSortOpen(true)
  }

  const sortMove = (from: number, to: number) => {
    if (from === to) return
    setSortSeq((prev) => {
      const next = [...prev]
      const [t] = next.splice(from, 1)
      next.splice(to, 0, t)
      return next
    })
  }

  const applySort = () => {
    onChange(sortSeq.map((origIdx) => blocks[origIdx]))
    setSortOpen(false)
  }

  // 列表序号：前面连续同名列表的数量
  const listNum = (i: number) => {
    let n = 1
    for (let k = i - 1; k >= 0; k--) {
      const b = blocks[k]
      if (b.type === 'text' && b.fmt?.list === 'ol') n++
      else break
    }
    return n
  }

  const textCls = (b: Extract<ContentBlock, { type: 'text' }>) => {
    const f = b.fmt || {}
    const size = f.h === 1 ? 'text-2xl ' : f.h === 2 ? 'text-xl ' : f.h === 3 ? 'text-lg ' : 'text-[15px] '
    const weight = f.h || f.bold ? 'font-bold ' : ''
    const style = (f.italic ? 'italic ' : '') + (f.underline ? 'underline ' : '')
    const align = f.align === 'center' ? 'text-center ' : f.align === 'right' ? 'text-right ' : ''
    return size + weight + style + align + 'leading-7 w-full bg-transparent outline-none resize-y placeholder:text-neutral-300'
  }

  const rows = blocks.map((b, i) => {
    const f = b.type === 'text' ? b.fmt || {} : {}
    const wrap =
      'group relative flex gap-1 rounded-lg transition ' +
      (f.quote ? 'border-l-4 border-neutral-200 pl-3 ' : '')
    return (
      <div key={i} className="relative">
        <div className={wrap}>
          {/* 左侧 ⊕ */}
          <button
            onClick={() => setMenu(menu && menu.at === i && menu.kind === 'plus' ? null : { kind: 'plus', at: i })}
            className="absolute -left-7 top-1 w-5 h-5 rounded-full border border-neutral-300 text-neutral-400 hover:border-orange-500 hover:text-orange-500 text-xs flex items-center justify-center opacity-60 hover:opacity-100 transition shrink-0"
            title="插入"
          >
            ＋
          </button>
          <div className="flex-1 min-w-0 py-1.5">
            {b.type === 'text' && (
              <div className="flex gap-1.5">
                {f.list === 'ul' && <span className="leading-7 text-neutral-400 select-none">•</span>}
                {f.list === 'ol' && <span className="leading-7 text-neutral-400 select-none">{listNum(i)}.</span>}
                <textarea
                  value={b.text}
                  onChange={(e) => patch(i, { text: e.target.value })}
                  placeholder={i === 0 ? '可以直接输入文字，在这里介绍你的作品……' : '输入文字……'}
                  rows={Math.max(1, Math.ceil((b.text.length || 1) / 40) + b.text.split('\n').length - 1)}
                  className={textCls(b)}
                />
              </div>
            )}
            {b.type === 'image' && (
              <div className="relative">
                <img src={b.url} alt="" className="max-h-[420px] w-auto max-w-full rounded-lg mx-auto" />
                <button
                  onClick={() => remove(i)}
                  className="absolute right-2 top-2 w-7 h-7 rounded-full bg-white/95 border border-neutral-200 text-neutral-500 hover:text-red-600 hover:border-red-200 text-sm leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm"
                  title="删除此图"
                >
                  ✕
                </button>
                <input
                  value={b.caption || ''}
                  onChange={(e) => patch(i, { caption: e.target.value })}
                  placeholder="图片说明（可选）"
                  className="w-full mt-1 px-3 h-7 text-xs text-neutral-400 outline-none bg-transparent placeholder:text-neutral-300"
                />
                <MediaBtn menu={menu} i={i} setMenu={setMenu} />
              </div>
            )}
            {b.type === 'video' && (
              <div className="relative">
                <video src={b.url} controls className="w-full max-h-[460px] rounded-lg bg-black" />
                <button
                  onClick={() => remove(i)}
                  className="absolute right-2 top-2 w-7 h-7 rounded-full bg-white/95 border border-neutral-200 text-neutral-500 hover:text-red-600 hover:border-red-200 text-sm leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm"
                  title="删除此视频"
                >
                  ✕
                </button>
                <MediaBtn menu={menu} i={i} setMenu={setMenu} />
              </div>
            )}
            {b.type === 'pdf' && (
              <div className="relative flex items-center gap-3 border border-neutral-200 rounded-xl px-4 py-3">
                <span className="w-9 h-9 rounded-lg bg-red-50 text-red-600 text-[10px] font-bold flex items-center justify-center">PDF</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-700 truncate">{b.title || 'PDF 文件'}</p>
                  <a href={b.url} target="_blank" rel="noreferrer" className="text-xs text-neutral-400 hover:text-neutral-900">
                    查看文件 ↗
                  </a>
                </div>
                <button
                  onClick={() => remove(i)}
                  className="w-6 h-6 text-xs text-neutral-300 hover:text-red-600 transition shrink-0"
                  title="删除此文件"
                >
                  ✕
                </button>
                <MediaBtn menu={menu} i={i} setMenu={setMenu} />
              </div>
            )}
          </div>
          {/* 文字块操作：排序 / 删除 */}
          {b.type === 'text' && (
            <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={openSort}
                className="w-6 h-6 text-xs text-neutral-300 hover:text-neutral-900 transition"
                title="调整顺序"
              >
                ⇅
              </button>
              <button
                onClick={() => remove(i)}
                className="w-6 h-6 text-xs text-neutral-300 hover:text-red-600 transition"
                title="删除此段"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        {menu && menu.kind === 'plus' && menu.at === i && (
          <PlusMenu
            b={blocks[i]}
            onFmt={(p) => setFmt(i, p)}
            onPick={(k) => pick(k, i)}
            onClose={() => setMenu(null)}
            uploading={uploading}
          />
        )}
        {menu && menu.kind === 'media' && menu.at === i && (
          <MiniMenu onSort={openSort} onDel={() => remove(i)} onClose={() => setMenu(null)} />
        )}
      </div>
    )
  })

  return (
    <div>
      {rows}
      {/* 末尾追加文字 */}
      <button
        onClick={() => insertAfter(blocks.length - 1, { type: 'text', text: '' })}
        className="mt-2 text-sm text-neutral-300 hover:text-neutral-500 transition"
      >
        ＋ 继续输入
      </button>

      <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
        onChange={(e) => {
          const fs = e.target.files
          if (fs && fs.length === 1) upload('image', fs[0])
          else if (fs && fs.length > 1) uploadManyImages(Array.from(fs), uploadAtRef.current)
          e.target.value = ''
        }} />
      <input ref={videoRef} type="file" accept="video/mp4,video/webm" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload('video', f); e.target.value = '' }} />
      <input ref={pdfRef} type="file" accept="application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload('pdf', f); e.target.value = '' }} />

      {/* 排序弹窗 */}
      {sortOpen && (
        <div className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4" onClick={() => setSortOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <h3 className="font-bold">重新排序</h3>
              <button onClick={() => setSortOpen(false)} className="text-neutral-400 hover:text-neutral-900">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {sortSeq.length === 0 && (
                <p className="text-sm text-neutral-400 text-center py-8">还没有内容</p>
              )}
              {sortSeq.map((origIdx, pos) => {
                const b = blocks[origIdx]
                const thumb = b.type === 'image' ? b.url : null
                const label =
                  b.type === 'image'
                    ? '图片' + (b.caption ? '：' + b.caption : '')
                    : b.type === 'video'
                      ? '视频'
                      : b.type === 'pdf'
                        ? 'PDF' + (b.title ? '：' + b.title : '')
                        : b.text.trim()
                          ? '文字：' + b.text.trim().slice(0, 24) + (b.text.trim().length > 24 ? '…' : '')
                          : '（空段落）'
                return (
                  <div
                    key={origIdx}
                    draggable
                    onDragStart={() => setDragFrom(pos)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); if (dragFrom !== null) sortMove(dragFrom, pos); setDragFrom(null) }}
                    className={'flex items-center gap-3 bg-neutral-50 rounded-xl px-3 py-2.5 cursor-grab active:cursor-grabbing ' + (dragFrom === pos ? 'opacity-40' : '')}
                  >
                    <span className="text-neutral-400 select-none">≡</span>
                    <div className="w-12 h-12 rounded-lg bg-white overflow-hidden shrink-0 flex items-center justify-center border border-neutral-100">
                      {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                        : b.type === 'video' ? (
                          <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M10.5 9.5l4.5 2.5-4.5 2.5z" /></svg>
                        )
                        : b.type === 'pdf' ? <span className="text-[10px] text-red-500 font-bold">PDF</span>
                        : <span className="text-[10px] text-neutral-400">文字</span>}
                    </div>
                    <span className="text-sm text-neutral-600 truncate">{label}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-center gap-3 px-5 py-4 border-t border-neutral-100">
              <button onClick={() => setSortOpen(false)} className="h-10 px-8 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:border-neutral-900 transition">取消</button>
              <button onClick={applySort} className="h-10 px-8 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition">确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 媒体块左上角 ⊖ 按钮
function MediaBtn({ menu, i, setMenu }: { menu: MenuState; i: number; setMenu: (m: MenuState) => void }) {
  return (
    <button
      onClick={() => setMenu(menu && menu.at === i && menu.kind === 'media' ? null : { kind: 'media', at: i })}
      className="absolute left-2 top-2 w-6 h-6 rounded-full bg-white/90 border border-neutral-200 text-neutral-500 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
      title="操作"
    >
      ⊖
    </button>
  )
}

// ⊕ 弹出菜单：排版 + 上传
function PlusMenu({
  b,
  onFmt,
  onPick,
  onClose,
  uploading,
}: {
  b: ContentBlock
  onFmt: (p: Partial<TextFmt>) => void
  onPick: (kind: 'image' | 'video' | 'pdf') => void
  onClose: () => void
  uploading: boolean
}) {
  const f = b.type === 'text' ? b.fmt || {} : {}
  const it = (label: React.ReactNode, on: boolean, act: () => void) => (
    <button
      onClick={act}
      className={
        'h-8 min-w-8 px-1.5 rounded-md text-sm flex items-center justify-center transition ' +
        (on ? 'bg-orange-50 text-orange-600 font-bold' : 'text-neutral-600 hover:bg-neutral-100')
      }
    >
      {label}
    </button>
  )
  // 简化线性图标（与当前文字颜色一致）
  const icon = (paths: React.ReactNode) => (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      {paths}
    </svg>
  )
  const icons = {
    left: icon(<><line x1="2.5" y1="4" x2="13.5" y2="4" /><line x1="2.5" y1="8" x2="10" y2="8" /><line x1="2.5" y1="12" x2="12" y2="12" /></>),
    center: icon(<><line x1="2.5" y1="4" x2="13.5" y2="4" /><line x1="4.5" y1="8" x2="11.5" y2="8" /><line x1="3.5" y1="12" x2="12.5" y2="12" /></>),
    right: icon(<><line x1="2.5" y1="4" x2="13.5" y2="4" /><line x1="6" y1="8" x2="13.5" y2="8" /><line x1="4" y1="12" x2="13.5" y2="12" /></>),
    quote: icon(<path d="M3.5 12V8.5c0-2 1-3.3 2.8-3.9l.4 1.1c-1 .4-1.6 1-1.7 1.8h1.5V12h-3zm6 0V8.5c0-2 1-3.3 2.8-3.9l.4 1.1c-1 .4-1.6 1-1.7 1.8h1.5V12h-3z" fill="currentColor" stroke="none" />),
    ul: icon(<><circle cx="3" cy="4.5" r="1" fill="currentColor" stroke="none" /><circle cx="3" cy="11.5" r="1" fill="currentColor" stroke="none" /><line x1="6.5" y1="4.5" x2="13.5" y2="4.5" /><line x1="6.5" y1="11.5" x2="13.5" y2="11.5" /></>),
    ol: icon(<><text x="1.5" y="6.2" fontSize="5.5" fill="currentColor" stroke="none" fontWeight="600">1</text><text x="1.5" y="13.2" fontSize="5.5" fill="currentColor" stroke="none" fontWeight="600">2</text><line x1="6.5" y1="4.5" x2="13.5" y2="4.5" /><line x1="6.5" y1="11.5" x2="13.5" y2="11.5" /></>),
  }
  const isText = b.type === 'text'
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute left-0 top-2 z-30 w-64 bg-white rounded-xl shadow-xl border border-neutral-100 p-3">
        <div className="flex flex-wrap gap-0.5">
          {it('H', isText && !f.h, () => isText && onFmt({ h: undefined }))}
          {it('H1', isText && f.h === 1, () => onFmt({ h: 1 }))}
          {it('H2', isText && f.h === 2, () => onFmt({ h: 2 }))}
          {it('H3', isText && f.h === 3, () => onFmt({ h: 3 }))}
          {it('B', isText && !!f.bold, () => onFmt({ bold: !f.bold }))}
          {it('I', isText && !!f.italic, () => onFmt({ italic: !f.italic }))}
          {it('U', isText && !!f.underline, () => onFmt({ underline: !f.underline }))}
        </div>
        <div className="flex flex-wrap gap-0.5 mt-1">
          {it(icons.left, isText && (!f.align || f.align === 'left'), () => onFmt({ align: 'left' }))}
          {it(icons.center, isText && f.align === 'center', () => onFmt({ align: 'center' }))}
          {it(icons.right, isText && f.align === 'right', () => onFmt({ align: 'right' }))}
          {it(icons.quote, isText && !!f.quote, () => onFmt({ quote: !f.quote }))}
          {it(icons.ul, isText && f.list === 'ul', () => onFmt({ list: f.list === 'ul' ? undefined : 'ul' }))}
          {it(icons.ol, isText && f.list === 'ol', () => onFmt({ list: f.list === 'ol' ? undefined : 'ol' }))}
        </div>
        <div className="h-px bg-neutral-100 my-2.5" />
        <div className="space-y-0.5">
          <button onClick={() => onPick('image')} disabled={uploading} className="w-full flex items-center gap-2.5 h-9 px-2 rounded-lg text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 transition">
            <span className="w-6 h-6 flex items-center justify-center text-neutral-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M3 17l5-4 4 3 4-4 5 5" /></svg>
            </span> 上传图片（可多选）
          </button>
          <button onClick={() => onPick('video')} disabled={uploading} className="w-full flex items-center gap-2.5 h-9 px-2 rounded-lg text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 transition">
            <span className="w-6 h-6 flex items-center justify-center text-neutral-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M10.5 9.5l4.5 2.5-4.5 2.5z" /></svg>
            </span> 视频
          </button>
          <button onClick={() => onPick('pdf')} disabled={uploading} className="w-full flex items-center gap-2.5 h-9 px-2 rounded-lg text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 transition">
            <span className="w-6 h-6 flex items-center justify-center text-neutral-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" /><path d="M13 3v6h6" /><path d="M9.5 14.5h5" /><path d="M9.5 17h3.5" /></svg>
            </span> PDF 上传（&lt; 50M）
          </button>
        </div>
      </div>
    </>
  )
}

// 媒体块 ⊖ 小菜单：排序 / 删除
function MiniMenu({
  onSort,
  onDel,
  onClose,
}: {
  onSort: () => void
  onDel: () => void
  onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute left-2 top-9 z-30 w-24 bg-white rounded-xl shadow-xl border border-neutral-100 py-1.5">
        <button onClick={onSort} className="w-full flex items-center gap-2 px-3 h-8 text-sm text-neutral-700 hover:bg-neutral-100 transition">
          ⇅ 排序
        </button>
        <button onClick={onDel} className="w-full flex items-center gap-2 px-3 h-8 text-sm text-neutral-700 hover:bg-red-50 hover:text-red-600 transition">
          🗑 删除
        </button>
      </div>
    </>
  )
}
