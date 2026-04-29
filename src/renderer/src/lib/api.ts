import type { IpcResult } from '@shared/types'

export async function unwrap<T>(p: Promise<IpcResult<T>>): Promise<T> {
  const r = await p
  if (!r.ok) throw new Error(r.error || 'Ошибка операции')
  return r.data as T
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  on_review: 'На согласовании',
  approved: 'Утверждён',
  rejected: 'Отклонён',
  executed: 'Исполнен',
  archived: 'В архиве',
}

export const ROLE_LABELS: Record<string, string> = {
  employee: 'Сотрудник',
  manager: 'Руководитель',
  admin: 'Администратор',
}
