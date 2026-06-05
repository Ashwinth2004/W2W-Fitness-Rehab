import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAdmin, loading } = useAuth()

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-brand-600">Checking access…</div>
  }
  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />
  }
  return children
}
