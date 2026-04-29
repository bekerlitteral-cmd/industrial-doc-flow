import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { unwrap } from '../lib/api'
import type { Template, TemplateField, User } from '@shared/types'

export default function DocumentNew() {
  const user = useAuth((s) => s.user)
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<Template[]>([])
  const [managers, setManagers] = useState<User[]>([])
  const [templateId, setTemplateId] = useState<number | ''>('')
  const [title, setTitle] = useState('')
  const [data, setData] = useState<Record<string, string>>({})
  const [approverIds, setApproverIds] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([unwrap(window.api.templates.list()), unwrap(window.api.users.listManagers())])
      .then(([t, m]) => {
        setTemplates(t)
        setManagers(m)
      })
      .catch((e) => setError((e as Error).message))
  }, [])

  const tpl = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId],
  )
  const fields: TemplateField[] = useMemo(() => {
    if (!tpl) return []
    try {
      return JSON.parse(tpl.fields_json) as TemplateField[]
    } catch {
      return []
    }
  }, [tpl])

  function setField(key: string, val: string) {
    setData((prev) => ({ ...prev, [key]: val }))
  }

  function toggleApprover(id: number) {
    setApproverIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !tpl) return
    if (approverIds.length === 0) {
      setError('Выберите хотя бы одного согласующего')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const result = await unwrap(
        window.api.documents.create(user.id, {
          template_id: tpl.id,
          title: title || tpl.title,
          data,
          approver_ids: approverIds,
        }),
      )
      navigate(`/documents/${result.id}`, { replace: true })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">Новый документ</h1>

      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">Тип документа</label>
          <select
            className="input"
            value={templateId}
            onChange={(e) => {
              const v = e.target.value
              setTemplateId(v === '' ? '' : Number(v))
              setData({})
            }}
            required
          >
            <option value="">— выберите шаблон —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          {tpl?.description && <p className="text-xs text-slate-500 mt-1">{tpl.description}</p>}
        </div>

        {tpl && (
          <>
            <div>
              <label className="label">Тема / краткое название</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={tpl.title}
                required
              />
            </div>

            {fields.map((f) => (
              <div key={f.key}>
                <label className="label">
                  {f.label}
                  {f.required && <span className="text-red-500"> *</span>}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    className="input min-h-[100px]"
                    value={data[f.key] ?? ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                    required={f.required}
                  />
                ) : f.type === 'select' ? (
                  <select
                    className="input"
                    value={data[f.key] ?? ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                    required={f.required}
                  >
                    <option value="">—</option>
                    {f.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="input"
                    type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                    value={data[f.key] ?? ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    required={f.required}
                  />
                )}
              </div>
            ))}

            <div>
              <label className="label">Маршрут согласования (по порядку)</label>
              <div className="border border-slate-300 rounded-md divide-y max-h-64 overflow-auto">
                {managers
                  .filter((m) => m.id !== user?.id)
                  .map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={approverIds.includes(m.id)}
                        onChange={() => toggleApprover(m.id)}
                      />
                      <div className="flex-1 text-sm">
                        <div className="font-medium">{m.full_name}</div>
                        <div className="text-xs text-slate-500">
                          {m.position} · {m.department}
                        </div>
                      </div>
                      {approverIds.includes(m.id) && (
                        <span className="text-xs text-brand-600 font-semibold">
                          № {approverIds.indexOf(m.id) + 1}
                        </span>
                      )}
                    </label>
                  ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Согласующие будут проверять документ в порядке выбора.
              </p>
            </div>
          </>
        )}

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting || !tpl} className="btn-primary">
            {submitting ? 'Сохранение…' : 'Создать черновик'}
          </button>
          <button type="button" onClick={() => navigate('/documents')} className="btn-secondary">
            Отмена
          </button>
        </div>
      </form>
    </div>
  )
}
