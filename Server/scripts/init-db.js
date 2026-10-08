import { db } from '../src/config/firebase.js'

// Cấu trúc các bảng (node gốc) của Realtime Database.
// Mỗi bảng được khởi tạo kèm 1 node `_schema` mô tả field để bảng tồn tại
// trong Firebase Console khi chưa có dữ liệu thật.
// Lưu ý: `users` và `requests` đã tồn tại sẵn nên không khởi tạo lại.
const TABLES = {
  categories: {
    name: 'string',
    description: 'string',
    active: 'boolean',
    createdAt: 'number (ms)',
    updatedAt: 'number (ms)',
  },
  ratings: {
    requestId: 'string',
    customerUid: 'string',
    repairmanUid: 'string | null',
    repairmanName: 'string',
    score: 'number (1-5)',
    comment: 'string',
    createdAt: 'number (ms)',
  },
  wallets: {
    uid: 'string',
    balance: 'number',
    updatedAt: 'number (ms)',
  },
  transactions: {
    uid: 'string',
    type: 'deposit | withdraw | payment | refund | commission',
    amount: 'number',
    balanceAfter: 'number',
    refId: 'string | null',
    status: 'success | pending | failed',
    createdAt: 'number (ms)',
  },
  payments: {
    requestId: 'string',
    customerUid: 'string',
    repairmanUid: 'string | null',
    amount: 'number',
    method: 'cash | ewallet | bank',
    status: 'pending | confirmed | failed',
    createdAt: 'number (ms)',
    updatedAt: 'number (ms)',
  },
  chats: {
    requestId: 'string',
    customerUid: 'string',
    repairmanUid: 'string | null',
    lastMessage: 'string',
    messages: '{ msgId: { senderUid, senderName, text, createdAt } }',
    createdAt: 'number (ms)',
    updatedAt: 'number (ms)',
  },
  schedules: {
    uid: 'string',
    online: 'boolean',
    defaultStart: 'string (HH:mm)',
    defaultEnd: 'string (HH:mm)',
    workDays: 'number[] (1-7)',
    timeOff: '{ id: { start, end, reason } }',
    updatedAt: 'number (ms)',
  },
  reports: {
    reporterUid: 'string',
    reporterName: 'string',
    targetType: 'user | request',
    targetId: 'string',
    reason: 'string',
    description: 'string',
    status: 'open | resolved | rejected',
    createdAt: 'number (ms)',
    updatedAt: 'number (ms)',
    resolvedAt: 'number (ms) | null',
    resolvedBy: 'string | null',
  },
  settings: {
    commissionRate: 'number (%)',
    minServiceFee: 'number',
    currency: 'string',
    note: 'string',
    updatedAt: 'number (ms)',
  },
}

async function main() {
  const names = Object.keys(TABLES)

  for (const name of names) {
    await db.ref(`${name}/_schema`).set(TABLES[name])
    console.log(`  ✔ ${name}`)
  }

  console.log(`\n✅ Đã khởi tạo ${names.length} bảng trong Realtime Database.`)
  process.exit(0)
}

main().catch((error) => {
  console.error('\n❌ Không thể khởi tạo database:', error.message, '\n')
  process.exit(1)
})
