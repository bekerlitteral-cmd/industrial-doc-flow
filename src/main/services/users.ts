import bcrypt from 'bcryptjs'
import { getDb } from '../db'
import type { Role, User } from '../../shared/types'
import { logAudit } from './audit'

export function listUsers(): User[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT id, username, full_name, role, department, position, is_active, created_at
       FROM users ORDER BY full_name`,
    )
    .all() as User[]
}

export function listManagers(): User[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT id, username, full_name, role, department, position, is_active, created_at
       FROM users WHERE role IN ('manager','admin') AND is_active = 1
       ORDER BY full_name`,
    )
    .all() as User[]
}

export interface CreateUserInput {
  username: string
  password: string
  full_name: string
  role: Role
  department?: string
  position?: string
}

export function createUser(actorId: number, input: CreateUserInput): User {
  const db = getDb()
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(input.username)
  if (exists) throw new Error('Пользователь с таким логином уже существует')
  if (input.password.length < 6) throw new Error('Пароль должен содержать минимум 6 символов')
  const hash = bcrypt.hashSync(input.password, 10)
  const info = db
    .prepare(
      `INSERT INTO users (username, password_hash, full_name, role, department, position)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.username,
      hash,
      input.full_name,
      input.role,
      input.department ?? null,
      input.position ?? null,
    )
  const id = info.lastInsertRowid as number
  logAudit(actorId, 'create_user', 'user', id, `Создан пользователь ${input.username}`)
  return getUser(id)
}

export function getUser(id: number): User {
  const db = getDb()
  const u = db
    .prepare(
      `SELECT id, username, full_name, role, department, position, is_active, created_at
       FROM users WHERE id = ?`,
    )
    .get(id) as User | undefined
  if (!u) throw new Error('Пользователь не найден')
  return u
}

export function setUserActive(actorId: number, id: number, active: boolean): void {
  const db = getDb()
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(active ? 1 : 0, id)
  logAudit(
    actorId,
    active ? 'activate_user' : 'deactivate_user',
    'user',
    id,
    active ? 'Активирован' : 'Деактивирован',
  )
}
