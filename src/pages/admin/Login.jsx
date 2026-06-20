import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, Mail, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function AdminLogin() {
  const { login, isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && isAdmin) navigate('/admin', { replace: true })
  }, [loading, isAdmin, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(mapError(err.code))
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-50 via-white to-brand-100 p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex flex-col items-center">
          <img src="/w2w-fitness-rehab-logo.webp" alt="W2W Fitness & Rehab logo" className="h-20 w-20 rounded-full bg-white object-contain shadow-soft" />
          <p className="mt-3 font-display text-xl font-bold text-brand-700">W2W Admin</p>
        </Link>
        <div className="card p-7 md:p-8">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage appointments, clients and enquiries.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
                <input className="input pl-10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@w2wfitnessandrehab.in" required />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
                <input className="input pl-10" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
            </div>
            {error && (
              <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                <AlertCircle size={16} /> {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
        <Link to="/" className="mt-6 flex items-center justify-center gap-1.5 text-center text-sm text-slate-500 hover:text-brand-600"><ArrowLeft size={15} /> Back to website</Link>
      </div>
    </div>
  )
}

function mapError(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    default:
      return 'Could not sign in. Check your connection and try again.'
  }
}
