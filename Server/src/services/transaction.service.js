import { db } from '../config/firebase.js'
import {
  matchesSearch,
  paginate,
  parseRange,
  readListQuery,
  sortList,
  withinRange,
} from '../utils/list-query.js'

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
export async function listTransactions(viewer, query = {}) {
  const options = readListQuery(query)
  const range = parseRange(query)
  const snapshot = await transactionsRef().once('value')

  let items = snapshot.exists() ? toList(snapshot.val()) : []

  if (viewer.role !== 'admin') {
    items = items.filter((item) => item.uid === viewer.uid)
  } else if (query.uid) {
    items = items.filter((item) => item.uid === query.uid)
  }

  if (query.type) {
    items = items.filter((item) => item.type === query.type)
  }
  if (query.status) {
    items = items.filter((item) => item.status === query.status)
  }

  items = items.filter((item) => withinRange(item.createdAt, range))
  items = items.filter((item) =>
    matchesSearch(item, ['uid', 'type', 'status'], options.search),
  )
  items = sortList(items, options.sort, options.order, 'createdAt', 'desc')

  return paginate(items, options)
}
