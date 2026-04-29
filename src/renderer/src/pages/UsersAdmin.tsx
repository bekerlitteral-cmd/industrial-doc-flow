import { FormEvent, useEffect, useState } from 'react'
import { useAuth } from '../store/auth'
import { ROLE_LABELS, unwrap } from '../lib/api'
import type { Role, User } from '@shared/types'

export default function UsersAdmin() {
  const me = useAuth((s) => s.user)
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'employee' as Role,
    department: '',
    position: '',
  })
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      setUsers(await unwrap(window.api.users.list()))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!me) return
    setBusy(true)
    setError(null)
    try {
      await unwrap(window.api.users.create(me.id, form))
      setForm({ username: '', password: '', full_name: '', role: 'employee', department: '', position: '' })
      setShowForm(false)
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(u: User) {
    if (!me) return
    await unwrap(window.api.users.setActive(me.id, u.id, !u.is_active))
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Пользователи</h1>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Скрыть форму' : '+ Добавить'}
        </button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={onCreate} className="card p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="label">Логин</label>
            <input
              className="input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Пароль</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <div className="col-span-2">
            <label className="label">ФИО</label>
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Роль</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              <option value="employee">Сотрудник</option>
              <option value="manager">Руководитель</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
          <div>
            <label className="label">Подразделение</label>
            <input
              className="input"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Должность</label>
            <input
              className="input"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Создание…' : 'Создать пользователя'}
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500 bg-slate-50">
            <tr>
              <th className="px-4 py-2">Логин</th>
              <th className="px-4 py-2">ФИО</th>
              <th className="px-4 py-2">Роль</th>
              <th className="px-4 py-2">Подразделение</th>
              <th className="px-4 py-2">Должность</th>
              <th className="px-4 py-2">Статус</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-2 font-mono">{u.username}</td>
                <td className="px-4 py-2">{u.full_name}</td>
                <td className="px-4 py-2">{ROLE_LABELS[u.role]}</td>
                <td className="px-4 py-2">{u.department}</td>
                <td className="px-4 py-2">{u.position}</td>
                <td className="px-4 py-2">
                  {u.is_active ? (
                    <span className="text-emerald-700 text-xs font-medium">Активен</span>
                  ) : (
                    <span className="text-slate-500 text-xs">Отключён</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {u.id !== me?.id && (
                    <button onClick={() => toggleActive(u)} className="text-xs text-brand-600 hover:underline">
                      {u.is_active ? 'Отключить' : 'Активировать'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
