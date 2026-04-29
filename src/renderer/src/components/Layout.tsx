import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { ROLE_LABELS } from '../lib/api'

export default function Layout() {
  const { user, logout, isAdmin, isManager } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2 rounded-md text-sm font-medium ${
      isActive ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="text-lg font-semibold text-brand-700">Документооборот</div>
          <div className="text-xs text-slate-500">Industrial Doc Flow</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/" end className={navClass}>
            Дашборд
          </NavLink>
          <NavLink to="/documents" className={navClass}>
            Документы
          </NavLink>
          <NavLink to="/documents/new" className={navClass}>
            Новый документ
          </NavLink>
          {isManager() && (
            <NavLink to="/approvals" className={navClass}>
              На согласовании
            </NavLink>
          )}
          {isAdmin() && (
            <>
              <NavLink to="/users" className={navClass}>
                Пользователи
              </NavLink>
              <NavLink to="/audit" className={navClass}>
                Журнал аудита
              </NavLink>
            </>
          )}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <div className="text-sm font-medium text-slate-800">{user.full_name}</div>
          <div className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</div>
          {user.department && (
            <div className="text-xs text-slate-500 mt-0.5">{user.department}</div>
          )}
          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="mt-3 w-full btn-secondary"
          >
            Выйти
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
