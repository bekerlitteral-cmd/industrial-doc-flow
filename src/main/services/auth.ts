import bcrypt from 'bcryptjs'
import { getDb } from '../db'
import type { User } from '../../shared/types'
import { logAudit } from './audit'

export interface LoginResult {
  user: User
}

export function login(username: string, password: string): LoginResult {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT id, username, password_hash, full_name, role, department, position, is_active, created_at
       FROM users WHERE username = ?`,
    )
    .get(username) as
    | (User & { password_hash: string })
    | undefined

  if (!row) throw new Error('Пользователь не найден')
  if (!row.is_active) throw new Error('Учётная запись отключена')
  if (!bcrypt.compareSync(password, row.password_hash)) {
    throw new Error('Неверный пароль')
  }

  const { password_hash: _ph, ...user } = row
  logAudit(user.id, 'login', 'user', user.id, `Вход в систему: ${user.username}`)
  return { user }
}

export function changePassword(userId: number, oldPassword: string, newPassword: string): void {
  const db = getDb()
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as
    | { password_hash: string }
    | undefined
  if (!row) throw new Error('Пользователь не найден')
  if (!bcrypt.compareSync(oldPassword, row.password_hash)) {
    throw new Error('Старый пароль неверен')
  }
  if (newPassword.length < 6) throw new Error('Новый пароль должен содержать минимум 6 символов')
  const hash = bcrypt.hashSync(newPassword, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId)
  logAudit(userId, 'change_password', 'user', userId, 'Смена пароля')
}
