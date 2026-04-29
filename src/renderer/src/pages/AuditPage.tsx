import { useEffect, useState } from 'react'
import { unwrap } from '../lib/api'
import type { AuditEntry } from '@shared/types'

const ACTION_LABELS: Record<string, string> = {
  login: 'Вход в систему',
  change_password: 'Смена пароля',
  create_user: 'Создан пользователь',
  activate_user: 'Активирован пользователь',
  deactivate_user: 'Отключён пользователь',
  create_document: 'Создан документ',
  submit_for_review: 'На согласование',
  approve_step: 'Согласован шаг',
  reject_step: 'Отклонён шаг',
  mark_executed: 'Исполнен',
  archive: 'Архивирован',
  delete_draft: 'Удалён черновик',
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    unwrap(window.api.audit.list(500))
      .then(setEntries)
      .catch((e) => setError((e as Error).message))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Журнал аудита</h1>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500 bg-slate-50">
            <tr>
              <th className="px-4 py-2">Дата</th>
              <th className="px-4 py-2">Пользователь</th>
              <th className="px-4 py-2">Действие</th>
              <th className="px-4 py-2">Объект</th>
              <th className="px-4 py-2">Детали</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{e.created_at}</td>
                <td className="px-4 py-2">{e.user_name ?? '—'}</td>
                <td className="px-4 py-2">{ACTION_LABELS[e.action] ?? e.action}</td>
                <td className="px-4 py-2">
                  {e.entity_type}
                  {e.entity_id && ` #${e.entity_id}`}
                </td>
                <td className="px-4 py-2 text-slate-700">{e.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
