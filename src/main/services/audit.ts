import { getDb } from '../db'
import type { AuditEntry } from '../../shared/types'

export function logAudit(
  userId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  details?: string,
): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(userId, action, entityType, entityId, details ?? null)
}

export function listAudit(limit = 200): AuditEntry[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT a.*, u.full_name as user_name
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.id DESC LIMIT ?`,
    )
    .all(limit) as AuditEntry[]
}
