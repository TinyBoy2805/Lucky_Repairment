import 'dotenv/config'

const parseList = (value = '') =>
  value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

export const env = {
  port: Number(process.env.PORT ?? 3001),
  clientUrls: parseList(process.env.CLIENT_URL ?? 'http://localhost:5173'),

  // Danh sách email được gán vai trò admin
  adminEmails: parseList(process.env.ADMIN_EMAILS),

  projectId: process.env.FIREBASE_PROJECT_ID ?? 'lucky-repairment',
  databaseURL:
    process.env.FIREBASE_DATABASE_URL ??
    'https://lucky-repairment-default-rtdb.firebaseio.com',
  serviceAccountFile: process.env.SERVICE_ACCOUNT_FILE ?? './serviceAccountKey.json',
  serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT,

  assistantUrl: process.env.ASSISTANT_URL ?? 'http://127.0.0.1:8000',
  assistantToken: process.env.ASSISTANT_TOKEN ?? '',
  assistantAllowReindex: process.env.ASSISTANT_ALLOW_REINDEX === 'true',
}
