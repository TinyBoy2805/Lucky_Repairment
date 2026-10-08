import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../lib/firebase.js'
import { api } from '../lib/api.js'
import { AuthContext } from './auth-context.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Đồng bộ trạng thái với Firebase + lấy profile (chứa role) từ server
  const syncProfile = useCallback(async (fbUser) => {
    const token = await fbUser.getIdToken()
    const { user: profile } = await api.post('/api/auth/login', {}, token)

    setUser({
      ...profile,
      uid: profile.uid ?? fbUser.uid,
      email: profile.email ?? fbUser.email,
    })
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        setUser(null)
        setLoading(false)
        return
      }

      syncProfile(fbUser)
        .catch((error) => {
          // Không lấy được role (server chết, token lỗi...) → coi như chưa đăng nhập
          console.error('[auth] Không thể tải profile:', error)
          setUser(null)
        })
        .finally(() => setLoading(false))
    })

    return unsubscribe
  }, [syncProfile])

  const login = useCallback(async (email, password, remember = true) => {
    await setPersistence(
      auth,
      remember ? browserLocalPersistence : browserSessionPersistence,
    )

    const credential = await signInWithEmailAndPassword(auth, email, password)
    const token = await credential.user.getIdToken()
    const { user: profile } = await api.post('/api/auth/login', {}, token)

    const next = {
      ...profile,
      uid: profile.uid ?? credential.user.uid,
      email: profile.email ?? credential.user.email,
    }
    setUser(next)
    return next
  }, [])

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider()

    // Popup yêu cầu thao tác trực tiếp từ người dùng nên gọi trong handler click
    const credential = await signInWithPopup(auth, provider)
    const token = await credential.user.getIdToken()
    const { user: profile } = await api.post('/api/auth/login', {}, token)

    const next = {
      ...profile,
      uid: profile.uid ?? credential.user.uid,
      email: profile.email ?? credential.user.email,
    }
    setUser(next)
    return next
  }, [])

  const register = useCallback(
    async ({ fullName, email, phone, password, role }) => {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      )

      if (fullName) {
        await updateProfile(credential.user, { displayName: fullName })
      }

      const token = await credential.user.getIdToken()
      const { user: profile } = await api.post(
        '/api/auth/register',
        { displayName: fullName, phone, role },
        token,
      )

      const next = {
        ...profile,
        uid: profile.uid ?? credential.user.uid,
        email: profile.email ?? credential.user.email,
      }
      setUser(next)
      return next
    },
    [],
  )

  const resetPassword = useCallback(
    async (email) => sendPasswordResetEmail(auth, email),
    [],
  )

  const logout = useCallback(async () => {
    const fbUser = auth.currentUser

    if (fbUser) {
      try {
        const token = await fbUser.getIdToken()
        await api.post('/api/auth/logout', {}, token)
      } catch (error) {
        console.warn('[auth] Bỏ qua lỗi logout:', error)
      }
    }

    await signOut(auth)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, loginWithGoogle, register, logout, resetPassword }),
    [user, loading, login, loginWithGoogle, register, logout, resetPassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
