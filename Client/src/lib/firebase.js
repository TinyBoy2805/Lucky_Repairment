import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyBsPElVRTgXh0BEP1Z0XiBQ8kzrtoRLnyA',
  authDomain: 'lucky-repairment.firebaseapp.com',
  databaseURL: 'https://lucky-repairment-default-rtdb.firebaseio.com',
  projectId: 'lucky-repairment',
  storageBucket: 'lucky-repairment.firebasestorage.app',
  messagingSenderId: '759419713971',
  appId: '1:759419713971:web:eec394f2405bc2118c33c6',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

/** Lấy ID token của user đang đăng nhập để gọi API (trả về null nếu chưa đăng nhập). */
export async function getToken() {
  return auth.currentUser ? await auth.currentUser.getIdToken() : null
}
