export type Role = 'employee' | 'manager' | 'admin'

export type DocumentStatus =
  | 'draft'
  | 'on_review'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'archived'

export interface User {
  id: number
  username: string
  full_name: string
  role: Role
  department: string | null
  position: string | null
  is_active: number
  created_at: string
}

export interface Template {
  id: number
  code: string
  title: string
  description: string | null
  fields_json: string
  body_template: string
  created_at: string
}

export interface TemplateField {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'textarea' | 'select'
  required?: boolean
  options?: string[]
  placeholder?: string
}

export interface DocumentRecord {
  id: number
  number: string
  template_id: number
  template_title?: string
  title: string
  status: DocumentStatus
  author_id: number
  author_name?: string
  data_json: string
  body_rendered: string
  created_at: string
  updated_at: string
}

export interface ApprovalStep {
  id: number
  document_id: number
  approver_id: number
  approver_name?: string
  step_order: number
  status: 'pending' | 'approved' | 'rejected' | 'skipped'
  comment: string | null
  acted_at: string | null
}

export interface AuditEntry {
  id: number
  user_id: number | null
  user_name?: string
  action: string
  entity_type: string
  entity_id: number | null
  details: string | null
  created_at: string
}

export interface AuthSession {
  user: User
  loggedInAt: string
}

export interface DashboardStats {
  total: number
  draft: number
  on_review: number
  approved: number
  rejected: number
  executed: number
  archived: number
  pending_for_me: number
  overdue: number
}

export interface CreateDocumentInput {
  template_id: number
  title: string
  data: Record<string, string | number>
  approver_ids: number[]
}

export interface IpcResult<T> {
  ok: boolean
  data?: T
  error?: string
}
