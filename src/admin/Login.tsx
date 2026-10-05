import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [defaultPwd, setDefaultPwd] = useState(false)
  const navigate = useNavigate()

  // 仅当还在用初始密码时显示提示（改密后不再暴露 admin123 字样）
  useEffect(() => {
    api<{ must_change_password?: boolean }>('/api/admin/session')
      .then((s) => setDefaultPwd(!!s.must_change_password))
      .catch(() => {})
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await api<{ must_change_password?: boolean }>('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      navigate(res.must_change_password ? '/admin/change-password' : '/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-5">
      <meta name="robots" content="noindex, nofollow" />
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-2xl border border-neutral-200 p-8"
      >
        <h1 className="text-2xl font-bold tracking-tight">管理后台</h1>
        <p className="text-sm text-neutral-400 mt-2">输入管理员密码登录</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="管理员密码"
          autoFocus
          className="w-full h-11 mt-6 px-4 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
        />
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full h-11 mt-5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? '登录中……' : '登录'}
        </button>
        {defaultPwd && (
          <p className="text-xs text-neutral-300 mt-5 text-center">初始密码 admin123</p>
        )}
      </form>
    </div>
  )
}
