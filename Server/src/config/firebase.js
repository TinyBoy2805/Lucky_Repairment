import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'
import { getFirestore } from 'firebase-admin/firestore'
import { env } from './env.js'

/**
 * Nạp credentials cho firebase-admin, theo thứ tự:
 * 1. FIREBASE_SERVICE_ACCOUNT  — JSON.stringify nội dung file key
 * 2. SERVICE_ACCOUNT_FILE      — đường dẫn file JSON (mặc định ./serviceAccountKey.json)
 * 3. GOOGLE_APPLICATION_CREDENTIALS — chuẩn của Google Cloud
 */
function loadServiceAccount() {
  if (env.serviceAccountJson) {
    return JSON.parse(env.serviceAccountJson)
  }

  const candidates = [
    path.resolve(process.cwd(), env.serviceAccountFile),
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean)

  for (const file of candidates) {
    if (existsSync(file)) {
      return JSON.parse(readFileSync(file, 'utf8'))
    }
  }

  throw new Error(
    `Không tìm thấy service account key. Đã thử: ${candidates.join(', ')}.\n` +
      '   → Firebase Console → Project settings → Service accounts → Generate new private key,\n' +
      '   → đặt file vào Server/ và khai báo SERVICE_ACCOUNT_FILE trong .env',
  )
}

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert(loadServiceAccount()),
    databaseURL: env.databaseURL,
    projectId: env.projectId,
  })

export const auth = getAuth(app)
export const db = getDatabase(app)
export const firestore = getFirestore(app)
export { env }
