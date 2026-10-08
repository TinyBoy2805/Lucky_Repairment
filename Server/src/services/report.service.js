import { db } from '../config/firebase.js'
import { badRequest, conflict, forbidden, notFound } from '../utils/http-error.js'
import {
  matchesSearch,
  paginate,
  parseRange,
  readListQuery,
  sortList,
  withinRange,
} from '../utils/list-query.js'

export const REPORT_STATUSES = ['open', 'resolved', 'rejected']
export const REPORT_TARGETS = ['user', 'request']

const reportsRef = () => db.ref('reports')
const reportRef = (id) => reportsRef().child(id)

const norm = (value) => String(value ?? '').trim()

const toList = (value) =>
  Object.entries(value ?? {})
    .filter(([id]) => id !== '_schema')
    .map(([id, data]) => ({ id, ...data }))

async function readAllReports() {
  const snapshot = await reportsRef().once('value')
  if (!snapshot.exists()) return []
  return toList(snapshot.val())
}

/**
 * Danh sách báo cáo:
 * - admin → tất cả.
 * - user  → chỉ báo cáo do mình gửi.
 */
export async function listReports(viewer, query = {}) {
  const options = readListQuery(query)
  const range = parseRange(query)
  let items = await readAllReports()

  if (viewer.role !== 'admin') {
    items = items.filter((item) => item.reporterUid === viewer.uid)
  }

  if (query.status) {
    items = items.filter((item) => item.status === query.status)
  }
  if (query.targetType) {
    items = items.filter((item) => item.targetType === query.targetType)
  }

  items = items.filter((item) => withinRange(item.createdAt, range))
  items = items.filter((item) =>
    matchesSearch(
      item,
      ['reason', 'description', 'reporterName', 'targetId'],
      options.search,
    ),
  )
  items = sortList(items, options.sort, options.order, 'createdAt', 'desc')

  return paginate(items, options)
}

export async function getReport(id) {
  const snapshot = await reportRef(id).once('value')
  if (!snapshot.exists()) throw notFound('Không tìm thấy báo cáo.')
  return { id, ...snapshot.val() }
}

/** Gửi báo cáo về user hoặc đơn hàng. */
export async function createReport(reporter, input = {}) {
  const targetType = norm(input.targetType)
  const targetId = norm(input.targetId)
  const reason = norm(input.reason)

  if (!REPORT_TARGETS.includes(targetType)) {
    throw badRequest(
      `Đối tượng báo cáo không hợp lệ. Chỉ chấp nhận: ${REPORT_TARGETS.join(', ')}.`,
    )
  }
  if (!targetId) throw badRequest('Thiếu mã đối tượng bị báo cáo.')
  if (!reason) throw badRequest('Vui lòng nhập lý do báo cáo.')

  const now = Date.now()
  const entry = {
    reporterUid: reporter.uid,
    reporterName: reporter.displayName || reporter.email || '',
    targetType,
    targetId,
    reason,
    description: norm(input.description),
    status: 'open',
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    resolvedBy: null,
  }

  const ref = await reportsRef().push(entry)
  return { id: ref.key, ...entry }
}

/**
 * Admin xử lý báo cáo:
 * - { action: 'resolve' } → resolved.
 * - { action: 'reject' }  → rejected.
 */
export async function updateReport({ id, actor, action }) {
  if (!id) throw badRequest('Thiếu mã báo cáo.')

  const snapshot = await reportRef(id).once('value')
  if (!snapshot.exists()) throw notFound('Không tìm thấy báo cáo.')

  const report = snapshot.val()
  if (actor.role !== 'admin') {
    throw forbidden('Chỉ admin mới xử lý được báo cáo.')
  }
  if (report.status !== 'open') {
    throw conflict('Báo cáo này đã được xử lý.')
  }

  const status =
    action === 'resolve' ? 'resolved' : action === 'reject' ? 'rejected' : null
  if (!status) throw badRequest('Thiếu thao tác hợp lệ (resolve hoặc reject).')

  const now = Date.now()
  const patch = { status, updatedAt: now, resolvedAt: now, resolvedBy: actor.uid }

  await reportRef(id).update(patch)
  return { id, ...report, ...patch }
}
