import { contextBridge, ipcRenderer } from 'electron'
import type {
  ApprovalStep,
  AuditEntry,
  CreateDocumentInput,
  DashboardStats,
  DocumentRecord,
  DocumentStatus,
  IpcResult,
  Role,
  Template,
  User,
} from '../shared/types'

const invoke = <T>(channel: string, ...args: unknown[]): Promise<IpcResult<T>> =>
  ipcRenderer.invoke(channel, ...args)

export const api = {
  auth: {
    login: (username: string, password: string) =>
      invoke<{ user: User }>('auth:login', username, password),
    changePassword: (userId: number, oldPwd: string, newPwd: string) =>
      invoke<boolean>('auth:changePassword', userId, oldPwd, newPwd),
  },
  templates: {
    list: () => invoke<Template[]>('templates:list'),
    get: (id: number) => invoke<Template>('templates:get', id),
  },
  users: {
    list: () => invoke<User[]>('users:list'),
    listManagers: () => invoke<User[]>('users:listManagers'),
    create: (
      actorId: number,
      input: {
        username: string
        password: string
        full_name: string
        role: Role
        department?: string
        position?: string
      },
    ) => invoke<User>('users:create', actorId, input),
    setActive: (actorId: number, id: number, active: boolean) =>
      invoke<boolean>('users:setActive', actorId, id, active),
  },
  documents: {
    create: (authorId: number, input: CreateDocumentInput) =>
      invoke<DocumentRecord>('docs:create', authorId, input),
    get: (id: number) => invoke<DocumentRecord>('docs:get', id),
    list: (filter: { authorId?: number; status?: DocumentStatus; search?: string }) =>
      invoke<DocumentRecord[]>('docs:list', filter),
    steps: (id: number) => invoke<ApprovalStep[]>('docs:steps', id),
    pending: (userId: number) => invoke<DocumentRecord[]>('docs:pending', userId),
    submit: (actorId: number, id: number) => invoke<boolean>('docs:submit', actorId, id),
    approve: (actorId: number, id: number, comment?: string) =>
      invoke<boolean>('docs:approve', actorId, id, comment),
    reject: (actorId: number, id: number, comment: string) =>
      invoke<boolean>('docs:reject', actorId, id, comment),
    execute: (actorId: number, id: number) => invoke<boolean>('docs:execute', actorId, id),
    archive: (actorId: number, id: number) => invoke<boolean>('docs:archive', actorId, id),
    deleteDraft: (actorId: number, id: number) => invoke<boolean>('docs:deleteDraft', actorId, id),
    stats: (userId: number) => invoke<DashboardStats>('docs:stats', userId),
    exportPdf: (id: number) => invoke<string | null>('docs:exportPdf', id),
  },
  audit: {
    list: (limit?: number) => invoke<AuditEntry[]>('audit:list', limit),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
