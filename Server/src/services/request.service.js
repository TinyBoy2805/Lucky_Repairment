import { db, firestore } from '../config/firebase.js'

// Các trạng thái hợp lệ của 1 yêu cầu sửa chữa
export const REQUEST_STATUSES = ['pending', 'assigned', 'in_progress', 'done']

// Bước tiếp theo hợp lệ khi thợ đổi trạng thái
const TRANSITIONS = { assigned: 'in_progress', in_progress: 'done' }

const requestsCol = () => firestore.collection('requests')
const requestDoc = (id) => firestore.collection('requests').doc(id)
const requestRtdbRef = (id) => db.ref(`requests/${id}`)

const badRequest = (message) => Object.assign(new Error(message), { status: 400 })
const unauthorized = (message) => Object.assign(new Error(message), { status: 401 })
const forbidden = (message) => Object.assign(new Error(message), { status: 403 })
const notFound = (message) => Object.assign(new Error(message), { status: 404 })
const conflict = (message) => Object.assign(new Error(message), { status: 409 })

const norm = (value) => String(value ?? '').trim()

/**
 * Danh sách yêu cầu theo vai trò từ Cloud Firestore:
 * - customer → chỉ thấy đơn của mình.
 * - repairman / admin → thấy tất cả (để nhận việc mới, theo dõi công việc).
 */
export async function listRequests(viewer) {
  const snapshot = await requestsCol().orderBy('createdAt', 'desc').get()
  const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  if (viewer.role === 'customer') {
    return all.filter((item) => item.customerUid === viewer.uid)
  }
  return all
}

/** Tạo yêu cầu sửa chữa mới — bắt buộc người dùng đã đăng nhập */
export async function createRequest(customer, input = {}) {
  if (!customer?.uid) {
    throw unauthorized('Vui lòng đăng nhập để gửi yêu cầu đặt lịch sửa chữa.')
  }

  const serviceId = norm(input.serviceId)
  const serviceName = norm(input.serviceName)
  const device = norm(input.device) || serviceName || 'Sửa chữa điện nước'
  const issue = norm(input.issue)
  const address = norm(input.address)
  const phone = norm(input.phone || customer.phone || '')
  const appointmentDate = norm(input.appointmentDate)
  const appointmentTime = norm(input.appointmentTime)
  const estimatedPrice = input.estimatedPrice ? Number(input.estimatedPrice) : null
  const notes = norm(input.notes)

  if (!device) throw badRequest('Vui lòng nhập loại thiết bị hoặc dịch vụ.')
  if (!issue) throw badRequest('Vui lòng mô tả sự cố hoặc yêu cầu sửa chữa.')
  if (!address) throw badRequest('Vui lòng nhập địa chỉ cần sửa chữa.')
  if (!phone) throw badRequest('Vui lòng nhập số điện thoại liên hệ.')

  const entry = {
    serviceId: serviceId || null,
    serviceName: serviceName || device,
    device,
    issue,
    address,
    phone,
    appointmentDate: appointmentDate || 'Sớm nhất có thể',
    appointmentTime: appointmentTime || '15 - 30 phút tới',
    estimatedPrice,
    notes,
    customerUid: customer.uid,
    customerName: norm(input.customerName || customer.displayName || customer.email || 'Khách hàng'),
    customerPhone: phone,
    customerEmail: customer.email || '',
    status: 'pending',
    repairmanUid: null,
    repairmanName: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  // 1. Tạo document trong Cloud Firestore collection 'requests'
  const docRef = await requestsCol().add(entry)
  const id = docRef.id
  const fullEntry = { id, ...entry }

  // Ghi id vào chính document Firestore
  await docRef.set(fullEntry)

  // 2. Đồng thời lưu vào Cloud Firestore collection 'bookings'
  // để dù kiểm tra theo 'bookings' hay 'requests' trên Firebase Console đều thấy đầy đủ!
  try {
    await firestore.collection('bookings').doc(id).set(fullEntry)
  } catch (err) {
    console.warn('[bookings] Firestore write error:', err.message)
  }

  // 3. Đồng bộ sang RTDB (nếu cần tương thích ngược)
  try {
    await requestRtdbRef(id).set(fullEntry)
  } catch (err) {
    console.warn('[requests] RTDB sync error:', err.message)
  }

  console.log(`[bookings] ✅ Đã lưu đơn đặt lịch #${id} vào Cloud Firestore (collection "requests" & "bookings")`)
  return fullEntry
}

/**
 * Thao tác trên 1 yêu cầu trong Cloud Firestore:
 * - { action: 'accept' }          → thợ nhận việc (pending → assigned).
 * - { action: 'status', status }  → thợ phụ trách chuyển bước (assigned → in_progress → done).
 */
export async function updateRequest({ id, actor, action, status }) {
  if (!id) throw badRequest('Thiếu mã yêu cầu.')

  const doc = await requestDoc(id).get()
  if (!doc.exists) {
    throw notFound('Không tìm thấy yêu cầu sửa chữa.')
  }

  const request = doc.data()
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

  // Cập nhật cả 2 collection Cloud Firestore
  await requestDoc(id).update(patch)

  try {
    await firestore.collection('bookings').doc(id).update(patch)
  } catch {}

  try {
    await requestRtdbRef(id).update(patch)
  } catch {}

  return { id, ...request, ...patch }
}