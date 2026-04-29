import { getDb } from '../db'
import type { Template } from '../../shared/types'

export function listTemplates(): Template[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT id, code, title, description, fields_json, body_template, created_at
       FROM templates ORDER BY title`,
    )
    .all() as Template[]
}

export function getTemplate(id: number): Template {
  const db = getDb()
  const t = db
    .prepare(
      `SELECT id, code, title, description, fields_json, body_template, created_at
       FROM templates WHERE id = ?`,
    )
    .get(id) as Template | undefined
  if (!t) throw new Error('Шаблон не найден')
  return t
}
