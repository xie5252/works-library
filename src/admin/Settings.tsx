import { useEffect, useState } from 'react'
import CategoryManager from '../components/CategoryManager'
import { api, jsonRequest, uploadFile } from '../api'
import { ToastContainer, useToasts } from '../components/Toast'

export default function AdminSettings() {
  const { items, show } = useToasts()
  const [logo, setLogo] = useState<string | null>(null)
  const [siteName, setSiteName] = useState('作品库')
  const [siteNameEn, setSiteNameEn] = useState('')
  const [footerText, setFooterText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<{ logo: string | null; site_name: string; site_name_en?: string; footer_text?: string }>(
      '/api/admin/settings',
    )
      .then((s) => {
        setLogo(s.logo)
        setSiteName(s.site_name)
        setSiteNameEn(s.site_name_en || '')
        setFooterText(s.footer_text || '')
      })
      .catch(() => {})
  }, [])

  const changeLogo = async (file: File) => {
    try {
      const url = await uploadFile('logo', file)
      setLogo(url)
      show('Logo 已上传，点击保存生效')
    } catch (err) {
      show(err instanceof Error ? err.message : 'Logo 上传失败', 'error')
    }
  }

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      await api(
        '/api/admin/settings',
        jsonRequest('PUT', {
          logo,
          site_name: siteName.trim() || '作品库',
          site_name_en: siteNameEn.trim(),
          footer_text: footerText.trim(),
        }),
      )
      show('设置已保存，前台已生效')
    } catch (err) {
      show(err instanceof Error ? err.message : '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <ToastContainer items={items} />
      <main className="max-w-2xl mx-auto px-5 sm:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">网站设置</h1>
          <p className="text-sm text-neutral-400 mt-2">保存后前台立即生效，无需修改代码</p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 space-y-8">
          <section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Logo</h3>
            <label className="inline-block w-28 h-28 rounded-xl border-2 border-dashed border-neutral-200 hover:border-neutral-400 transition cursor-pointer overflow-hidden bg-neutral-50 relative group">
              {logo ? (
                <>
                  <img src={logo} alt="logo" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs">
                    更换
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-neutral-300 group-hover:text-neutral-500 transition">
                  <span className="text-2xl leading-none">+</span>
                  <span className="text-xs">上传 Logo</span>
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) changeLogo(f)
                  e.target.value = ''
                }}
              />
            </label>
            <p className="text-xs text-neutral-400 mt-3">
              支持 PNG / JPG / WebP / SVG，显示在前台侧边栏顶部
              {logo && (
                <>
                  {' · '}
                  <button
                    onClick={() => setLogo(null)}
                    className="text-neutral-400 hover:text-red-600 transition"
                  >
                    移除（保存后生效）
                  </button>
                </>
              )}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">网站名称</h3>
            <input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="作品库"
              maxLength={20}
              className="w-full sm:w-80 h-11 px-4 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
            />
            <p className="text-xs text-neutral-400 mt-2">显示在前台侧边栏与详情页</p>
          </section>

          <section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">英文副标题</h3>
            <input
              value={siteNameEn}
              onChange={(e) => setSiteNameEn(e.target.value)}
              placeholder="Works Collection"
              maxLength={30}
              className="w-full sm:w-80 h-11 px-4 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
            />
            <p className="text-xs text-neutral-400 mt-2">
              以浅色小字显示在侧边栏站名下方，留空则不显示
            </p>
          </section>

          <section>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">版权署名</h3>
            <input
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder={'© 2026 ' + (siteName.trim() || '作品库')}
              maxLength={40}
              className="w-full sm:w-80 h-11 px-4 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
            />
            <p className="text-xs text-neutral-400 mt-2">
              显示在前台侧边栏底部，如「© 2026 Designed by 谢某某」；留空则显示 © 年份 + 站名
            </p>
          </section>

          <button
            onClick={save}
            disabled={saving}
            className="h-11 px-8 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {saving ? '保存中……' : '保存设置'}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8">
          <CategoryManager onToast={(m, k) => show(m, k)} />
        </div>
      </main>
    </>
  )
}
