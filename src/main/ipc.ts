import { dialog, ipcMain, shell } from 'electron'
import { login, changePassword } from './services/auth'
import {
  approveStep,
  archiveDocument,
  createDocument,
  deleteDraft,
  getDocument,
  getStats,
  listDocuments,
  listPendingForUser,
  listSteps,
  markExecuted,
  rejectStep,
  submitForReview,
} from './services/documents'
import { listAudit } from './services/audit'
import { getTemplate, listTemplates } from './services/templates'
import { createUser, listManagers, listUsers, setUserActive } from './services/users'
import { exportDocumentPdf } from './services/pdf'
import type { CreateDocumentInput, DocumentStatus, Role } from '../shared/types'

type Handler<T> = () => Promise<T> | T

function wrap<T>(fn: Handler<T>) {
  return async () => {
    try {
      const data = await fn()
      return { ok: true, data }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  }
}

export function registerIpc(): void {
  ipcMain.handle('auth:login', (_e, username: string, password: string) =>
    wrap(() => login(username, password))(),
  )
  ipcMain.handle('auth:changePassword', (_e, userId: number, oldPwd: string, newPwd: string) =>
    wrap(() => {
      changePassword(userId, oldPwd, newPwd)
      return true
    })(),
  )

  ipcMain.handle('templates:list', () => wrap(() => listTemplates())())
  ipcMain.handle('templates:get', (_e, id: number) => wrap(() => getTemplate(id))())

  ipcMain.handle('users:list', () => wrap(() => listUsers())())
  ipcMain.handle('users:listManagers', () => wrap(() => listManagers())())
  ipcMain.handle(
    'users:create',
    (
      _e,
      actorId: number,
      input: {
        username: string
        password: string
        full_name: string
        role: Role
        department?: string
        position?: string
      },
    ) => wrap(() => createUser(actorId, input))(),
  )
  ipcMain.handle('users:setActive', (_e, actorId: number, id: number, active: boolean) =>
    wrap(() => {
      setUserActive(actorId, id, active)
      return true
    })(),
  )

  ipcMain.handle('docs:create', (_e, authorId: number, input: CreateDocumentInput) =>
    wrap(() => createDocument(authorId, input))(),
  )
  ipcMain.handle('docs:get', (_e, id: number) => wrap(() => getDocument(id))())
  ipcMain.handle(
    'docs:list',
    (_e, filter: { authorId?: number; status?: DocumentStatus; search?: string }) =>
      wrap(() => listDocuments(filter ?? {}))(),
  )
  ipcMain.handle('docs:steps', (_e, id: number) => wrap(() => listSteps(id))())
  ipcMain.handle('docs:pending', (_e, userId: number) => wrap(() => listPendingForUser(userId))())
  ipcMain.handle('docs:submit', (_e, actorId: number, id: number) =>
    wrap(() => {
      submitForReview(actorId, id)
      return true
    })(),
  )
  ipcMain.handle('docs:approve', (_e, actorId: number, id: number, comment?: string) =>
    wrap(() => {
      approveStep(actorId, id, comment)
      return true
    })(),
  )
  ipcMain.handle('docs:reject', (_e, actorId: number, id: number, comment: string) =>
    wrap(() => {
      rejectStep(actorId, id, comment)
      return true
    })(),
  )
  ipcMain.handle('docs:execute', (_e, actorId: number, id: number) =>
    wrap(() => {
      markExecuted(actorId, id)
      return true
    })(),
  )
  ipcMain.handle('docs:archive', (_e, actorId: number, id: number) =>
    wrap(() => {
      archiveDocument(actorId, id)
      return true
    })(),
  )
  ipcMain.handle('docs:deleteDraft', (_e, actorId: number, id: number) =>
    wrap(() => {
      deleteDraft(actorId, id)
      return true
    })(),
  )
  ipcMain.handle('docs:stats', (_e, userId: number) => wrap(() => getStats(userId))())
  ipcMain.handle('docs:exportPdf', async (_e, id: number) =>
    wrap(async () => {
      const result = await dialog.showSaveDialog({
        title: 'Сохранить PDF',
        defaultPath: `document_${id}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      })
      if (result.canceled || !result.filePath) return null
      const file = await exportDocumentPdf(id, result.filePath)
      shell.showItemInFolder(file)
      return file
    })(),
  )

  ipcMain.handle('audit:list', (_e, limit?: number) => wrap(() => listAudit(limit ?? 200))())
}
