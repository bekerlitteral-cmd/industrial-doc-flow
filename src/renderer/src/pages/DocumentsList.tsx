import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { unwrap, STATUS_LABELS } from '../lib/api'
import type { DocumentRecord, DocumentStatus } from '@shared/types'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../store/auth'

export default function DocumentsList() {
  const user = useAuth((s) => s.user)
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<DocumentStatus | ''>('')
  const [mine, setMine] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const list = await unwrap(
        window.api.documents.list({
          search: search || undefined,
          status: status || undefined,
          authorId: mine ? user.id : undefined,
        }),
      )
      setDocs(list)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mine])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Документы</h1>
        <Link to="/documents/new" className="btn-primary">
          + Новый документ
        </Link>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Поиск</label>
          <input
            className="input"
            placeholder="Номер, тема или содержимое…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </div>
        <div>
          <label className="label">Статус</label>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as DocumentStatus | '')}
          >
            <option value="">Все</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          Только мои
        </label>
        <button onClick={load} className="btn-secondary">
          Найти
        </button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500 bg-slate-50">
            <tr>
              <th className="px-4 py-2">№</th>
              <th className="px-4 py-2">Тема</th>
              <th className="px-4 py-2">Тип</th>
              <th className="px-4 py-2">Автор</th>
              <th className="px-4 py-2">Статус</th>
              <th className="px-4 py-2">Создан</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Загрузка…
                </td>
              </tr>
            ) : docs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Документы не найдены
                </td>
              </tr>
            ) : (
              docs.map((d) => (
                <tr key={d.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link to={`/documents/${d.id}`} className="text-brand-600 hover:underline">
                      {d.number}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{d.title}</td>
                  <td className="px-4 py-2">{d.template_title}</td>
                  <td className="px-4 py-2">{d.author_name}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-2 text-slate-500">{d.created_at}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
