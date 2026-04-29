import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DocumentsList from './pages/DocumentsList'
import DocumentNew from './pages/DocumentNew'
import DocumentView from './pages/DocumentView'
import MyApprovals from './pages/MyApprovals'
import UsersAdmin from './pages/UsersAdmin'
import AuditPage from './pages/AuditPage'
import { useAuth } from './store/auth'

function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="documents" element={<DocumentsList />} />
        <Route path="documents/new" element={<DocumentNew />} />
        <Route path="documents/:id" element={<DocumentView />} />
        <Route path="approvals" element={<MyApprovals />} />
        <Route path="users" element={<UsersAdmin />} />
        <Route path="audit" element={<AuditPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
