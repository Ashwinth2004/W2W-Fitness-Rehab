import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../firebase'

const AuthContext = createContext(null)

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase().trim()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  // Only the configured admin email counts as admin. If VITE_ADMIN_EMAIL is
  // left blank, any successfully authenticated Firebase user is treated as the
  // admin (single-user setup).
  const isAdmin = Boolean(user) && (!ADMIN_EMAIL || user.email?.toLowerCase() === ADMIN_EMAIL)

  const value = {
    user,
    isAdmin,
    loading,
    login: (email, password) => signInWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
