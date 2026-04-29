import { getDb } from '../db'
import { getTemplate } from './templates'
import { getUser } from './users'
import { logAudit } from './audit'
import type {
  ApprovalStep,
  CreateDocumentInput,
  DashboardStats,
  DocumentRecord,
  DocumentStatus,
} from '../../shared/types'

function pad(n: number, width: number): string {
  return n.toString().padStart(width, '0')
}

function generateNumber(templateCode: string): string {
  const db = getDb()
  const year = new Date().getFullYear()
  const row = db
    .prepare(
      `SELECT COUNT(*) as c FROM documents
       WHERE strftime('%Y', created_at) = ?`,
    )
    .get(String(year)) as { c: number }
  const seq = row.c + 1
  return `${templateCode}-${year}-${pad(seq, 4)}`
}

function renderBody(template: string, vars: Record<string, string | number>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => {
    const v = vars[key]
    return v === undefined || v === null ? '' : String(v)
  })
}

export function createDocument(authorId: number, input: CreateDocumentInput): DocumentRecord {
  const db = getDb()
  const template = getTemplate(input.template_id)
  const author = getUser(authorId)
  const number = generateNumber(template.code)
  const now = new Date()
  const created_date = now.toLocaleDateString('ru-RU')

  const vars: Record<string, string | number> = {
    ...input.data,
    number,
    created_date,
    author_name: author.full_name,
    author_position: author.position ?? '',
    author_department: author.department ?? '',
  }
  const body = renderBody(template.body_template, vars)

  const tx = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO documents (number, template_id, title, status, author_id, data_json, body_rendered)
         VALUES (?, ?, ?, 'draft', ?, ?, ?)`,
      )
      .run(number, template.id, input.title, authorId, JSON.stringify(input.data), body)
    const docId = info.lastInsertRowid as number

    const stepStmt = db.prepare(
      `INSERT INTO approval_steps (document_id, approver_id, step_order, status)
       VALUES (?, ?, ?, 'pending')`,
    )
    input.approver_ids.forEach((approverId, idx) => {
      stepStmt.run(docId, approverId, idx + 1)
    })

    logAudit(authorId, 'create_document', 'document', docId, `Создан документ ${number}`)
    return docId
  })

  const id = tx()
  return getDocument(id)
}

export function getDocument(id: number): DocumentRecord {
  const db = getDb()
  const d = db
    .prepare(
      `SELECT d.*, t.title as template_title, u.full_name as author_name
       FROM documents d
       JOIN templates t ON t.id = d.template_id
       JOIN users u ON u.id = d.author_id
       WHERE d.id = ?`,
    )
    .get(id) as DocumentRecord | undefined
  if (!d) throw new Error('Документ не найден')
  return d
}

export function listDocuments(filter: {
  authorId?: number
  status?: DocumentStatus
  search?: string
}): DocumentRecord[] {
  const db = getDb()
  const where: string[] = []
  const params: (string | number)[] = []
  if (filter.authorId !== undefined) {
    where.push('d.author_id = ?')
    params.push(filter.authorId)
  }
  if (filter.status) {
    where.push('d.status = ?')
    params.push(filter.status)
  }
  if (filter.search) {
    where.push('(d.title LIKE ? OR d.number LIKE ? OR d.body_rendered LIKE ?)')
    const q = `%${filter.search}%`
    params.push(q, q, q)
  }
  const sql = `
    SELECT d.*, t.title as template_title, u.full_name as author_name
    FROM documents d
    JOIN templates t ON t.id = d.template_id
    JOIN users u ON u.id = d.author_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY d.id DESC`
  return db.prepare(sql).all(...params) as DocumentRecord[]
}

export function listSteps(documentId: number): ApprovalStep[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT s.*, u.full_name as approver_name
       FROM approval_steps s
       JOIN users u ON u.id = s.approver_id
       WHERE s.document_id = ?
       ORDER BY s.step_order`,
    )
    .all(documentId) as ApprovalStep[]
}

export function listPendingForUser(userId: number): DocumentRecord[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT d.*, t.title as template_title, u.full_name as author_name
       FROM documents d
       JOIN templates t ON t.id = d.template_id
       JOIN users u ON u.id = d.author_id
       WHERE d.status = 'on_review'
         AND EXISTS (
           SELECT 1 FROM approval_steps s
           WHERE s.document_id = d.id AND s.approver_id = ? AND s.status = 'pending'
             AND s.step_order = (
               SELECT MIN(step_order) FROM approval_steps WHERE document_id = d.id AND status = 'pending'
             )
         )
       ORDER BY d.id DESC`,
    )
    .all(userId) as DocumentRecord[]
}

export function submitForReview(actorId: number, documentId: number): void {
  const db = getDb()
  const doc = getDocument(documentId)
  if (doc.author_id !== actorId) throw new Error('Только автор может отправить документ')
  if (doc.status !== 'draft') throw new Error('Документ уже не в статусе черновика')
  const stepCount = db
    .prepare('SELECT COUNT(*) as c FROM approval_steps WHERE document_id = ?')
    .get(documentId) as { c: number }
  if (stepCount.c === 0) throw new Error('Не назначены согласующие')
  db.prepare(`UPDATE documents SET status = 'on_review', updated_at = datetime('now') WHERE id = ?`).run(
    documentId,
  )
  logAudit(actorId, 'submit_for_review', 'document', documentId, `${doc.number}: на согласование`)
}

export function approveStep(actorId: number, documentId: number, comment?: string): void {
  const db = getDb()
  const doc = getDocument(documentId)
  if (doc.status !== 'on_review') throw new Error('Документ не на согласовании')
  const step = db
    .prepare(
      `SELECT * FROM approval_steps
       WHERE document_id = ? AND approver_id = ? AND status = 'pending'
       ORDER BY step_order LIMIT 1`,
    )
    .get(documentId, actorId) as ApprovalStep | undefined
  if (!step) throw new Error('Нет ожидающих шагов согласования для текущего пользователя')

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE approval_steps SET status = 'approved', comment = ?, acted_at = datetime('now') WHERE id = ?`,
    ).run(comment ?? null, step.id)

    const remaining = db
      .prepare(
        `SELECT COUNT(*) as c FROM approval_steps WHERE document_id = ? AND status = 'pending'`,
      )
      .get(documentId) as { c: number }
    if (remaining.c === 0) {
      db.prepare(
        `UPDATE documents SET status = 'approved', updated_at = datetime('now') WHERE id = ?`,
      ).run(documentId)
    }
    logAudit(
      actorId,
      'approve_step',
      'document',
      documentId,
      `${doc.number}: согласовано${comment ? ' — ' + comment : ''}`,
    )
  })
  tx()
}

export function rejectStep(actorId: number, documentId: number, comment: string): void {
  const db = getDb()
  const doc = getDocument(documentId)
  if (doc.status !== 'on_review') throw new Error('Документ не на согласовании')
  if (!comment || !comment.trim()) throw new Error('При отклонении необходимо указать причину')

  const step = db
    .prepare(
      `SELECT * FROM approval_steps
       WHERE document_id = ? AND approver_id = ? AND status = 'pending'
       ORDER BY step_order LIMIT 1`,
    )
    .get(documentId, actorId) as ApprovalStep | undefined
  if (!step) throw new Error('Нет ожидающих шагов согласования')

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE approval_steps SET status = 'rejected', comment = ?, acted_at = datetime('now') WHERE id = ?`,
    ).run(comment, step.id)
    db.prepare(
      `UPDATE documents SET status = 'rejected', updated_at = datetime('now') WHERE id = ?`,
    ).run(documentId)
    db.prepare(
      `UPDATE approval_steps SET status = 'skipped' WHERE document_id = ? AND status = 'pending'`,
    ).run(documentId)
    logAudit(actorId, 'reject_step', 'document', documentId, `${doc.number}: отклонено — ${comment}`)
  })
  tx()
}

export function markExecuted(actorId: number, documentId: number): void {
  const db = getDb()
  const doc = getDocument(documentId)
  if (doc.status !== 'approved') throw new Error('Только утверждённые документы можно исполнить')
  db.prepare(
    `UPDATE documents SET status = 'executed', updated_at = datetime('now') WHERE id = ?`,
  ).run(documentId)
  logAudit(actorId, 'mark_executed', 'document', documentId, `${doc.number}: исполнено`)
}

export function archiveDocument(actorId: number, documentId: number): void {
  const db = getDb()
  const doc = getDocument(documentId)
  if (!['executed', 'rejected', 'approved'].includes(doc.status))
    throw new Error('Архивировать можно только завершённые документы')
  db.prepare(
    `UPDATE documents SET status = 'archived', updated_at = datetime('now') WHERE id = ?`,
  ).run(documentId)
  logAudit(actorId, 'archive', 'document', documentId, `${doc.number}: в архив`)
}

export function deleteDraft(actorId: number, documentId: number): void {
  const db = getDb()
  const doc = getDocument(documentId)
  if (doc.status !== 'draft') throw new Error('Удалить можно только черновик')
  if (doc.author_id !== actorId) throw new Error('Удалить может только автор')
  db.prepare('DELETE FROM documents WHERE id = ?').run(documentId)
  logAudit(actorId, 'delete_draft', 'document', documentId, `Удалён черновик ${doc.number}`)
}

export function getStats(userId: number): DashboardStats {
  const db = getDb()
  const counts = db
    .prepare(
      `SELECT status, COUNT(*) as c FROM documents GROUP BY status`,
    )
    .all() as { status: DocumentStatus; c: number }[]
  const stats: DashboardStats = {
    total: 0,
    draft: 0,
    on_review: 0,
    approved: 0,
    rejected: 0,
    executed: 0,
    archived: 0,
    pending_for_me: 0,
    overdue: 0,
  }
  for (const r of counts) {
    stats.total += r.c
    stats[r.status] = r.c
  }
  const pending = db
    .prepare(
      `SELECT COUNT(DISTINCT d.id) as c
       FROM documents d
       JOIN approval_steps s ON s.document_id = d.id
       WHERE d.status = 'on_review' AND s.approver_id = ? AND s.status = 'pending'`,
    )
    .get(userId) as { c: number }
  stats.pending_for_me = pending.c

  const overdue = db
    .prepare(
      `SELECT COUNT(*) as c FROM documents
       WHERE status = 'on_review'
         AND julianday('now') - julianday(updated_at) > 3`,
    )
    .get() as { c: number }
  stats.overdue = overdue.c
  return stats
}
