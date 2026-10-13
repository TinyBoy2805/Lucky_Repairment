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
  FacebookAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
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
      emailVerified: Boolean(fbUser.emailVerified),
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
      emailVerified: Boolean(credential.user.emailVerified),
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
      emailVerified: Boolean(credential.user.emailVerified),
    }
    setUser(next)
    return next
  }, [])

  const loginWithFacebook = useCallback(async () => {
    const provider = new FacebookAuthProvider()

    const credential = await signInWithPopup(auth, provider)
    const token = await credential.user.getIdToken()
    const { user: profile } = await api.post('/api/auth/login', {}, token)

    const next = {
      ...profile,
      uid: profile.uid ?? credential.user.uid,
      email: profile.email ?? credential.user.email,
      emailVerified: Boolean(credential.user.emailVerified),
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

      // Gửi email xác nhận đăng ký (không chặn luồng nếu gửi thất bại)
      let emailSent = true
      try {
        await sendEmailVerification(credential.user)
      } catch (error) {
        emailSent = false
        console.warn('[auth] Không gửi được email xác nhận:', error)
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
        emailVerified: Boolean(credential.user.emailVerified),
        verificationEmailSent: emailSent,
      }
      setUser(next)
      return next
    },
    [],
  )

  /** Gửi lại email xác nhận cho tài khoản đang đăng nhập */
  const resendVerificationEmail = useCallback(async () => {
    const fbUser = auth.currentUser
    if (!fbUser) throw new Error('Bạn cần đăng nhập để gửi lại email xác nhận.')
    await sendEmailVerification(fbUser)
    return true
  }, [])

  /** Kiểm tra lại trạng thái xác nhận email (sau khi người dùng bấm link trong mail) */
  const refreshEmailVerification = useCallback(async () => {
    const fbUser = auth.currentUser
    if (!fbUser) return false
    await reload(fbUser)
    setUser((prev) =>
      prev ? { ...prev, emailVerified: Boolean(fbUser.emailVerified) } : prev,
    )
    return Boolean(fbUser.emailVerified)
  }, [])

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

  // Cập nhật cục bộ profile sau khi người dùng sửa thông tin
  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      loginWithGoogle,
      loginWithFacebook,
      register,
      logout,
      resetPassword,
      updateUser,
      resendVerificationEmail,
      refreshEmailVerification,
    }),
    [
      user,
      loading,
      login,
      loginWithGoogle,
      loginWithFacebook,
      register,
      logout,
      resetPassword,
      updateUser,
      resendVerificationEmail,
      refreshEmailVerification,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
