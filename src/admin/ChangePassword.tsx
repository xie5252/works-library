import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, jsonRequest } from '../api'
import { ToastContainer, useToasts } from '../components/Toast'

export default function ChangePassword() {
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { items, show } = useToasts()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (newPwd.length < 6) {
      setError('新密码至少 6 位')
      return
    }
    if (newPwd !== confirm) {
      setError('两次输入的新密码不一致')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api('/api/admin/password', jsonRequest('PUT', { old_password: oldPwd, new_password: newPwd }))
      show('密码已修改')
      setTimeout(() => navigate('/admin', { replace: true }), 600)
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改失败')
      setLoading(false)
    }
  }

  const inputCls =
    'w-full h-11 mt-2 px-4 rounded-xl border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition'

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-5">
      <meta name="robots" content="noindex, nofollow" />
      <ToastContainer items={items} />
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-2xl border border-neutral-200 p-8"
      >
        <h1 className="text-2xl font-bold tracking-tight">修改密码</h1>
        <p className="text-sm text-neutral-400 mt-2">首次登录需修改初始密码后才能继续</p>
        <label className="block mt-6 text-xs text-neutral-500">当前密码</label>
        <input
          type="password"
          value={oldPwd}
          onChange={(e) => setOldPwd(e.target.value)}
          placeholder="输入当前密码"
          autoFocus
          className={inputCls}
        />
        <label className="block mt-4 text-xs text-neutral-500">新密码（至少 6 位）</label>
        <input
          type="password"
          value={newPwd}
          onChange={(e) => setNewPwd(e.target.value)}
          placeholder="设置新密码"
          className={inputCls}
        />
        <label className="block mt-4 text-xs text-neutral-500">确认新密码</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="再次输入新密码"
          className={inputCls}
        />
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <button
          type="submit"
          disabled={loading || !oldPwd || !newPwd || !confirm}
          className="w-full h-11 mt-6 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? '提交中……' : '确认修改'}
        </button>
      </form>
    </div>
  )
}
