import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { unwrap } from '../lib/api'
import type { DocumentRecord } from '@shared/types'
import StatusBadge from '../components/StatusBadge'

export default function MyApprovals() {
  const user = useAuth((s) => s.user)
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    unwrap(window.api.documents.pending(user.id))
      .then(setDocs)
      .catch((e) => setError((e as Error).message))
  }, [user])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">На моём согласовании</h1>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="card overflow-hidden">
        {docs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            На вашем согласовании сейчас нет документов
          </div>
        ) : (
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
              {docs.map((d) => (
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
