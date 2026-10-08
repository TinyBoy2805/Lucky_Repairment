import { db } from '../config/firebase.js'
import {
  matchesSearch,
  paginate,
  parseRange,
  readListQuery,
  sortList,
  withinRange,
} from '../utils/list-query.js'

// Các trạng thái hợp lệ của 1 yêu cầu sửa chữa
export const REQUEST_STATUSES = ['pending', 'assigned', 'in_progress', 'done']

// Bước tiếp theo hợp lệ khi thợ đổi trạng thái
const TRANSITIONS = { assigned: 'in_progress', in_progress: 'done' }

const requestsRef = () => db.ref('requests')
const requestRef = (id) => db.ref(`requests/${id}`)

const badRequest = (message) => Object.assign(new Error(message), { status: 400 })
const forbidden = (message) => Object.assign(new Error(message), { status: 403 })
const notFound = (message) => Object.assign(new Error(message), { status: 404 })
const conflict = (message) => Object.assign(new Error(message), { status: 409 })

const norm = (value) => String(value ?? '').trim()

/**
 * Danh sách yêu cầu theo vai trò:
 * - customer → chỉ thấy đơn của mình.
 * - repairman / admin → thấy tất cả (để nhận việc mới, theo dõi công việc).
 */
export async function listRequests(viewer, query = {}) {
  const options = readListQuery(query)
  const range = parseRange(query)
  const snapshot = await requestsRef().once('value')

  let items = snapshot.exists()
    ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
    : []

  if (viewer.role === 'customer') {
    items = items.filter((item) => item.customerUid === viewer.uid)
  }

  if (query.status) {
    items = items.filter((item) => item.status === query.status)
  }
  if (query.repairmanUid) {
    items = items.filter((item) => item.repairmanUid === query.repairmanUid)
  }

  items = items.filter((item) => withinRange(item.createdAt, range))
  items = items.filter((item) =>
    matchesSearch(
      item,
      ['device', 'issue', 'address', 'customerName', 'customerPhone', 'repairmanName'],
      options.search,
    ),
  )
  items = sortList(items, options.sort, options.order, 'createdAt', 'desc')

  return paginate(items, options)
}

/** Tạo yêu cầu sửa chữa mới — mọi user đã đăng nhập đều gửi được (thường là khách hàng). */
export async function createRequest(customer, input = {}) {
  const device = norm(input.device)
  const issue = norm(input.issue)
  const address = norm(input.address)
  const phone = norm(input.phone)

  if (!device) throw badRequest('Vui lòng nhập loại thiết bị.')
  if (!issue) throw badRequest('Vui lòng mô tả lỗi cần sửa.')
  if (!address) throw badRequest('Vui lòng nhập địa chỉ.')

  const entry = {
    device,
    issue,
    address,
    phone,
    customerUid: customer.uid,
    customerName: customer.displayName || customer.email || 'Khách hàng',
    customerPhone: phone || customer.phone || '',
    status: 'pending',
    repairmanUid: null,
    repairmanName: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const ref = await requestsRef().push(entry)
  return { id: ref.key, ...entry }
}

/**
 * Thao tác trên 1 yêu cầu:
 * - { action: 'accept' }          → thợ nhận việc (pending → assigned).
 * - { action: 'status', status }  → thợ phụ trách chuyển bước (assigned → in_progress → done).
 */
export async function updateRequest({ id, actor, action, status }) {
  if (!id) throw badRequest('Thiếu mã yêu cầu.')

  const snapshot = await requestRef(id).once('value')
  if (!snapshot.exists()) {
    throw notFound('Không tìm thấy yêu cầu sửa chữa.')
  }

  const request = snapshot.val()
  const patch = { updatedAt: Date.now() }

  if (action === 'accept') {
    if (actor.role !== 'repairman' && actor.role !== 'admin') {
      throw forbidden('Chỉ thợ sửa chữa mới nhận được yêu cầu.')
    }
    if (request.status !== 'pending') {
      throw conflict('Yêu cầu này đã được nhận rồi.')
    }
    patch.status = 'assigned'
    patch.repairmanUid = actor.uid
    patch.repairmanName = actor.displayName || actor.email || ''
  } else if (action === 'status') {
    if (request.repairmanUid !== actor.uid) {
      throw forbidden('Chỉ thợ đang phụ trách mới đổi được trạng thái.')
    }
    const next = TRANSITIONS[request.status]
    if (!next || next !== status) {
      throw conflict(
        `Không thể chuyển trạng thái "${request.status}" sang "${status}".`,
      )
    }
    patch.status = status
  } else {
    throw badRequest('Thiếu thao tác hợp lệ (accept hoặc status).')
  }

  await requestRef(id).update(patch)

  const after = await requestRef(id).once('value')
  return { id, ...after.val() }
}