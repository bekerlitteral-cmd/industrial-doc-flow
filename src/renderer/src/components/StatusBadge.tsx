import { STATUS_LABELS } from '../lib/api'
import type { DocumentStatus } from '@shared/types'

export default function StatusBadge({ status }: { status: DocumentStatus }) {
  return <span className={`badge-${status}`}>{STATUS_LABELS[status] ?? status}</span>
}
