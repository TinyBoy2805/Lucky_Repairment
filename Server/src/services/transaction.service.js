import { db } from '../config/firebase.js'

const transactionsRef = () => db.ref('transactions')

const toList = (value) =>
  Object.entries(value ?? {})
    .filter(([id]) => id !== '_schema')
    .map(([id, data]) => ({ id, ...data }))

/**
 * Lịch sử giao dịch:
 * - user thường → chỉ giao dịch của mình.
 * - admin       → tất cả, có thể lọc ?uid= và ?type=.
 */
export async function listTransactions(viewer, { uid, type } = {}) {
  const snapshot = await transactionsRef().once('value')
  if (!snapshot.exists()) return []

  let items = toList(snapshot.val())

  if (viewer.role !== 'admin') {
    items = items.filter((item) => item.uid === viewer.uid)
  } else if (uid) {
    items = items.filter((item) => item.uid === uid)
  }

  if (type) {
    items = items.filter((item) => item.type === type)
  }

  return items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
}
