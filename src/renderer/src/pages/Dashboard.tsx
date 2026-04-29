import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { unwrap } from '../lib/api'
import type { DashboardStats, DocumentRecord } from '@shared/types'
import StatusBadge from '../components/StatusBadge'

export default function Dashboard() {
  const user = useAuth((s) => s.user)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<DocumentRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      unwrap(window.api.documents.stats(user.id)),
      unwrap(window.api.documents.list({})),
    ])
      .then(([s, list]) => {
        setStats(s)
        setRecent(list.slice(0, 8))
      })
      .catch((e) => setError((e as Error).message))
  }, [user])

  if (error) return <div className="text-red-600">{error}</div>
  if (!stats || !user) return <div className="text-slate-500">Загрузка…</div>

  const cards: Array<{ label: string; value: number; tone: string }> = [
    { label: 'Всего документов', value: stats.total, tone: 'bg-slate-100 text-slate-800' },
    { label: 'Черновиков', value: stats.draft, tone: 'bg-slate-100 text-slate-700' },
    { label: 'На согласовании', value: stats.on_review, tone: 'bg-amber-100 text-amber-800' },
    { label: 'Утверждённых', value: stats.approved, tone: 'bg-emerald-100 text-emerald-800' },
    { label: 'Отклонённых', value: stats.rejected, tone: 'bg-red-100 text-red-800' },
    { label: 'Исполненных', value: stats.executed, tone: 'bg-blue-100 text-blue-800' },
    { label: 'Ждут моего согласования', value: stats.pending_for_me, tone: 'bg-brand-100 text-brand-800' },
    { label: 'Просрочено', value: stats.overdue, tone: 'bg-red-50 text-red-700' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Здравствуйте, {user.full_name.split(' ')[1] || user.full_name}!</h1>
        <p className="text-slate-500">Сводка по документообороту</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`card p-4 ${c.tone}`}>
            <div className="text-xs uppercase tracking-wide font-medium opacity-80">{c.label}</div>
            <div className="text-3xl font-bold mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Последние документы</h2>
          <Link to="/documents" className="text-sm text-brand-600 hover:underline">
            Все →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="text-slate-500 text-sm py-4">Документов пока нет</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500 uppercase border-b">
              <tr>
                <th className="py-2">№</th>
                <th>Тема</th>
                <th>Тип</th>
                <th>Автор</th>
                <th>Статус</th>
                <th>Создан</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((d) => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="py-2">
                    <Link to={`/documents/${d.id}`} className="text-brand-600 hover:underline">
                      {d.number}
                    </Link>
                  </td>
                  <td>{d.title}</td>
                  <td>{d.template_title}</td>
                  <td>{d.author_name}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="text-slate-500">{d.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
