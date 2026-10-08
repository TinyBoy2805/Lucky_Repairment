import { db } from '../config/firebase.js'
import { badRequest, notFound } from '../utils/http-error.js'

const schedulesRef = () => db.ref('schedules')
const scheduleRef = (uid) => schedulesRef().child(uid)
const timeOffRef = (uid) => scheduleRef(uid).child('timeOff')
const timeOffItemRef = (uid, id) => timeOffRef(uid).child(id)

const norm = (value) => String(value ?? '').trim()

const defaultSchedule = (uid) => ({
  uid,
  online: false,
  defaultStart: '08:00',
  defaultEnd: '17:00',
  workDays: [1, 2, 3, 4, 5, 6],
  timeOff: {},
  updatedAt: Date.now(),
})

/** Lịch làm việc của 1 thợ (trả mặc định nếu chưa cấu hình). */
export async function getSchedule(uid) {
  const snapshot = await scheduleRef(uid).once('value')
  if (!snapshot.exists()) return defaultSchedule(uid)
  return { ...defaultSchedule(uid), ...snapshot.val() }
}

/** Cập nhật giờ mặc định / ngày làm / trạng thái online. */
export async function upsertSchedule(uid, input = {}) {
  const existing = await getSchedule(uid)
  const patch = { uid, updatedAt: Date.now() }

  if (input.online !== undefined) patch.online = Boolean(input.online)
  if (input.defaultStart !== undefined) patch.defaultStart = norm(input.defaultStart)
  if (input.defaultEnd !== undefined) patch.defaultEnd = norm(input.defaultEnd)

  if (input.workDays !== undefined) {
    if (!Array.isArray(input.workDays)) {
      throw badRequest('workDays phải là mảng các thứ trong tuần (1-7).')
    }
    patch.workDays = input.workDays
      .map(Number)
      .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
  }

  await scheduleRef(uid).update(patch)
  return { ...existing, ...patch }
}

/** Thêm khung giờ nghỉ (time-off). */
export async function addTimeOff(uid, input = {}) {
  const start = norm(input.start)
  const end = norm(input.end)
  const reason = norm(input.reason)

  if (!start || !end) {
    throw badRequest('Vui lòng nhập thời gian bắt đầu và kết thúc.')
  }

  const entry = { start, end, reason, createdAt: Date.now() }
  const ref = await timeOffRef(uid).push(entry)
  return { id: ref.key, ...entry }
}

/** Xoá khung giờ nghỉ. */
export async function removeTimeOff(uid, id) {
  const snapshot = await timeOffItemRef(uid, id).once('value')
  if (!snapshot.exists()) throw notFound('Không tìm thấy khung giờ nghỉ.')

  await timeOffItemRef(uid, id).remove()
  return true
}
