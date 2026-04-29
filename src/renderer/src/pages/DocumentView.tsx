import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { unwrap } from '../lib/api'
import { useAuth } from '../store/auth'
import StatusBadge from '../components/StatusBadge'
import type { ApprovalStep, DocumentRecord } from '@shared/types'

export default function DocumentView() {
  const { id } = useParams<{ id: string }>()
  const user = useAuth((s) => s.user)
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DocumentRecord | null>(null)
  const [steps, setSteps] = useState<ApprovalStep[]>([])
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const docId = Number(id)
      const [d, s] = await Promise.all([
        unwrap(window.api.documents.get(docId)),
        unwrap(window.api.documents.steps(docId)),
      ])
      setDoc(d)
      setSteps(s)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (error) return <div className="text-red-600">{error}</div>
  if (!doc || !user) return <div className="text-slate-500">Загрузка…</div>

  const isAuthor = doc.author_id === user.id
  const myPendingStep = steps.find(
    (s) =>
      s.approver_id === user.id &&
      s.status === 'pending' &&
      s.step_order ===
        Math.min(...steps.filter((x) => x.status === 'pending').map((x) => x.step_order)),
  )
  const canSubmit = isAuthor && doc.status === 'draft'
  const canExecute = doc.status === 'approved' && (isAuthor || user.role === 'admin')
  const canArchive = ['executed', 'rejected', 'approved'].includes(doc.status)
  const canDelete = isAuthor && doc.status === 'draft'

  async function action(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const STEP_LABELS: Record<string, string> = {
    pending: 'Ожидает',
    approved: 'Согласовано',
    rejected: 'Отклонено',
    skipped: 'Пропущено',
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{doc.template_title}</div>
          <h1 className="text-2xl font-bold">
            {doc.number} — {doc.title}
          </h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-slate-500">
            <StatusBadge status={doc.status} />
            <span>Автор: {doc.author_name}</span>
            <span>Создан: {doc.created_at}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => action(async () => {
              const r = await window.api.documents.exportPdf(doc.id)
              if (!r.ok) throw new Error(r.error)
            })}
            disabled={busy}
          >
            Экспорт в PDF
          </button>
          <button className="btn-ghost" onClick={() => window.print()} disabled={busy}>
            Печать
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="text-xs uppercase text-slate-500 mb-2">Содержание документа</div>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
          {doc.body_rendered}
        </pre>
      </div>

      <div className="card p-6">
        <div className="text-xs uppercase text-slate-500 mb-3">Маршрут согласования</div>
        {steps.length === 0 ? (
          <div className="text-sm text-slate-500">Маршрут не настроен</div>
        ) : (
          <ol className="space-y-2">
            {steps.map((s) => (
              <li key={s.id} className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-semibold">
                  {s.step_order}
                </span>
                <div className="flex-1">
                  <div className="font-medium">{s.approver_name}</div>
                  <div className="text-xs text-slate-500">
                    {STEP_LABELS[s.status]}
                    {s.acted_at && ` · ${s.acted_at}`}
                    {s.comment && ` · «${s.comment}»`}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="card p-6 space-y-3">
        <div className="text-xs uppercase text-slate-500">Действия</div>
        {error && <div className="text-red-600 text-sm">{error}</div>}

        {canSubmit && (
          <button
            className="btn-primary"
            disabled={busy}
            onClick={() =>
              action(async () => {
                const r = await window.api.documents.submit(user.id, doc.id)
                if (!r.ok) throw new Error(r.error)
              })
            }
          >
            Отправить на согласование
          </button>
        )}

        {myPendingStep && (
          <div className="space-y-2 border-t pt-3">
            <label className="label">Комментарий</label>
            <textarea
              className="input min-h-[80px]"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Комментарий (обязательно при отклонении)"
            />
            <div className="flex gap-2">
              <button
                className="btn-primary"
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    const r = await window.api.documents.approve(user.id, doc.id, comment)
                    if (!r.ok) throw new Error(r.error)
                    setComment('')
                  })
                }
              >
                Согласовать
              </button>
              <button
                className="btn-danger"
                disabled={busy || !comment.trim()}
                onClick={() =>
                  action(async () => {
                    const r = await window.api.documents.reject(user.id, doc.id, comment)
                    if (!r.ok) throw new Error(r.error)
                    setComment('')
                  })
                }
              >
                Отклонить
              </button>
            </div>
          </div>
        )}

        {canExecute && (
          <button
            className="btn-secondary"
            disabled={busy}
            onClick={() =>
              action(async () => {
                const r = await window.api.documents.execute(user.id, doc.id)
                if (!r.ok) throw new Error(r.error)
              })
            }
          >
            Отметить как исполнено
          </button>
        )}

        {canArchive && (
          <button
            className="btn-ghost"
            disabled={busy}
            onClick={() =>
              action(async () => {
                const r = await window.api.documents.archive(user.id, doc.id)
                if (!r.ok) throw new Error(r.error)
              })
            }
          >
            В архив
          </button>
        )}

        {canDelete && (
          <button
            className="btn-danger"
            disabled={busy}
            onClick={() =>
              action(async () => {
                if (!confirm('Удалить черновик?')) return
                const r = await window.api.documents.deleteDraft(user.id, doc.id)
                if (!r.ok) throw new Error(r.error)
                navigate('/documents')
              })
            }
          >
            Удалить черновик
          </button>
        )}
      </div>
    </div>
  )
}
