import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { SiteSettings } from '../types'
import { ToastContainer, useToasts } from './Toast'
import AdminNoindex from './AdminNoindex'

export async function checkSession(): Promise<boolean> {
  try {
    const res = await api<{ logged_in: boolean }>('/api/admin/session')
    return res.logged_in
  } catch {
    return false
  }
}

interface Props {
  children: ReactNode
  active?: 'works' | 'settings' | 'trash'
}

export default function AdminLayout({ children, active }: Props) {
  const [settings, setSettings] = useState<SiteSettings>({ logo: null, site_name: '作品库', site_name_en: '', footer_text: '' })
  const navigate = useNavigate()
  const { items, show } = useToasts()

  useEffect(() => {
    api<SiteSettings>('/api/admin/settings').then(setSettings).catch(() => {})
    api<{ logged_in: boolean; must_change_password: boolean }>('/api/admin/session')
      .then((s) => {
        if (!s.logged_in) navigate('/admin/login', { replace: true })
        else if (s.must_change_password) navigate('/admin/change-password', { replace: true })
      })
      .catch(() => {})
  }, [])

  const logout = async () => {
    try {
      await api('/api/admin/logout', { method: 'POST' })
      show('已退出登录')
      setTimeout(() => navigate('/admin/login'), 600)
    } catch {
      show('退出失败', 'error')
    }
  }

  const navCls = (on: boolean) =>
    'px-3 h-8 leading-8 rounded-lg text-sm transition whitespace-nowrap shrink-0 ' +
    (on ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-600 hover:bg-neutral-100')

  return (
    <div className="min-h-screen bg-neutral-50">
      <AdminNoindex />
      <ToastContainer items={items} />
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center gap-4 sm:gap-6">
          <Link to="/admin" className="flex items-center gap-2.5 shrink-0 whitespace-nowrap">
            {settings.logo && (
              <img src={settings.logo} alt="logo" className="h-7 w-auto object-contain" />
            )}
            <span className="text-base font-bold tracking-tight">{settings.site_name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-white font-medium">
              后台
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm shrink-0">
            <Link to="/admin" className={navCls(active === 'works')}>
              作品管理
            </Link>
            <Link to="/admin/trash" className={navCls(active === 'trash')}>
              回收站
            </Link>
            <Link to="/admin/settings" className={navCls(active === 'settings')}>
              设置
            </Link>
          </nav>
          <div className="flex-1" />
          <Link
            to="/"
            target="_blank"
            className="text-sm text-neutral-500 hover:text-neutral-900 transition whitespace-nowrap shrink-0"
          >
            查看前台 ↗
          </Link>
          <button
            onClick={logout}
            className="text-sm text-neutral-400 hover:text-red-600 transition whitespace-nowrap shrink-0"
          >
            退出
          </button>
        </div>
      </header>
      {children}
    </div>
  )
}
