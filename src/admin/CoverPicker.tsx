import { useEffect, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { uploadFile } from '../api'

interface Props {
  open: boolean
  images: string[]
  title: string
  date: string
  onCancel: () => void
  onConfirm: (url: string, sourceUrl: string | null) => void
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => resolve(im)
    im.onerror = reject
    im.src = src
  })
}

export default function CoverPicker({ open, images, title, date, onCancel, onConfirm }: Props) {
  const [img, setImg] = useState<string | null>(null)
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const first = images[0] ?? null
      setImg(first)
      setNat(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setErr('')
      if (first) loadImage(first).then((im) => setNat({ w: im.naturalWidth, h: im.naturalHeight })).catch(() => {})
    }
  }, [open, images])

  if (!open) return null

  const pick = (url: string) => {
    setImg(url)
    setNat(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    loadImage(url).then((im) => setNat({ w: im.naturalWidth, h: im.naturalHeight })).catch(() => {})
  }

  const confirm = async () => {
    if (!img || !area) return
    setBusy(true)
    setErr('')
    try {
      const im = await loadImage(img)
      const w = Math.min(Math.round(area.width), im.naturalWidth, 1600)
      const h = Math.round((w * 3) / 4)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('裁剪失败')
      ctx.drawImage(im, area.x, area.y, area.width, area.height, 0, 0, w, h)
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.92))
      if (!blob) throw new Error('裁剪失败')
      const url = await uploadFile('cover', new File([blob], 'cover.jpg', { type: 'image/jpeg' }))
      // 若源图来自文章正文，告知父组件以便从正文中移除（避免封面与正文重复）
      onConfirm(url, img && images.includes(img) ? img : null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  // 左侧预览：按裁剪区域模拟最终 4:3 效果
  const previewStyle: React.CSSProperties | undefined =
    img && nat && area
      ? {
          position: 'absolute',
          width: (nat.w / area.width) * 100 + '%',
          left: -(area.x / area.width) * 100 + '%',
          top: -(area.y / area.height) * 100 + '%',
        }
      : undefined

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-lg font-bold">上传封面</h3>
          <button onClick={onCancel} className="text-neutral-400 hover:text-neutral-900 text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-[38%_1fr] gap-6">
            {/* 左：封面预览 */}
            <div>
              <p className="text-sm text-neutral-500 mb-3">封面预览</p>
              <div className="relative w-full aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100">
                {img && area ? (
                  <img src={img} alt="" style={previewStyle} className="max-w-none select-none" draggable={false} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300 text-sm">
                    选择右侧图片开始裁剪
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm text-neutral-800 font-medium line-clamp-1">{title}</p>
              <p className="text-xs text-neutral-400 mt-1">{date}</p>
            </div>

            {/* 右：裁剪框 */}
            <div>
              <div className="relative w-full aspect-[4/3] bg-neutral-100 rounded-xl overflow-hidden">
                {img ? (
                  <Cropper
                    image={img}
                    crop={crop}
                    zoom={zoom}
                    aspect={4 / 3}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(_a, px) => setArea(px)}
                    showGrid
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-400">
                    <span className="text-3xl">+</span>
                    <span className="text-sm">从下方选择图片或重新上传</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                  className="w-8 h-8 rounded-full border border-neutral-200 text-neutral-500 hover:border-neutral-400 transition"
                  title="缩小"
                >−</button>
                <button
                  onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                  className="w-8 h-8 rounded-full border border-neutral-200 text-neutral-500 hover:border-neutral-400 transition"
                  title="放大"
                >+</button>
                <button
                  onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1) }}
                  className="w-8 h-8 rounded-full border border-neutral-200 text-neutral-500 hover:border-neutral-400 transition"
                  title="重置"
                >⟳</button>
              </div>
            </div>
          </div>

          {/* 下方：文章图片选择 + 重新上传 */}
          <div className="mt-5 flex items-center gap-2.5 overflow-x-auto pb-1">
            <button
              onClick={() => fileRef.current?.click()}
              className="shrink-0 w-20 h-16 rounded-lg border border-dashed border-neutral-300 flex flex-col items-center justify-center text-neutral-400 hover:border-neutral-500 hover:text-neutral-600 transition"
            >
              <span className="text-lg leading-none">+</span>
              <span className="text-[11px] mt-1">重新上传</span>
            </button>
            {images.map((url, k) => (
              <button
                key={k}
                onClick={() => pick(url)}
                className={
                  'shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition ' +
                  (img === url ? 'border-orange-500' : 'border-transparent hover:border-neutral-300')
                }
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
        </div>

        <div className="flex justify-center gap-3 px-6 py-4">
          <button
            onClick={onCancel}
            className="h-11 px-10 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:border-neutral-900 transition"
          >
            取消
          </button>
          <button
            onClick={confirm}
            disabled={!img || busy}
            className="h-11 px-10 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 disabled:opacity-40 transition"
          >
            {busy ? '生成中…' : '确定'}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) pick(URL.createObjectURL(f))
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
