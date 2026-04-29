import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const login = useAuth((s) => s.login)
  const navigate = useNavigate()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const r = await window.api.auth.login(username, password)
      if (!r.ok || !r.data) throw new Error(r.error || 'Ошибка входа')
      login(r.data.user)
      navigate('/', { replace: true })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-brand-700 mb-1">Документооборот</h1>
        <p className="text-sm text-slate-500 mb-6">
          Автоматизация документооборота промышленного предприятия
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="username">
              Логин
            </label>
            <input
              id="username"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>
        <div className="mt-6 text-xs text-slate-500 border-t pt-4">
          <div className="font-semibold mb-1">Тестовые учётные записи:</div>
          <ul className="space-y-0.5">
            <li>
              <code>admin / admin123</code> — администратор
            </li>
            <li>
              <code>director / director123</code> — директор
            </li>
            <li>
              <code>manager / manager123</code> — начальник цеха
            </li>
            <li>
              <code>employee / employee123</code> — сотрудник
            </li>
            <li>
              <code>storekeeper / store123</code> — кладовщик
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
