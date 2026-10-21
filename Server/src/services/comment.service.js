import { db } from '../config/firebase.js'
import { badRequest, forbidden, notFound } from '../utils/http-error.js'

// ─── Refs ────────────────────────────────────────────────────────────────────
const commentsRef = () => db.ref('comments')
const commentRef = (id) => commentsRef().child(id)

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Chuẩn hoá chuỗi: trim và ép sang string */
const norm = (value) => String(value ?? '').trim()

/** Chuyển snapshot object → mảng có kèm id, bỏ node _schema */
const toList = (value) =>
  Object.entries(value ?? {})
    .filter(([id]) => id !== '_schema')
    .map(([id, data]) => ({ id, ...data }))

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Lấy danh sách comment cha của 1 dịch vụ (công khai, không cần đăng nhập).
 * - Chỉ lấy comment có `parentId === null`.
 * - Mỗi comment cha được gắn kèm mảng `replies`.
 * - Sắp xếp comment cha theo `createdAt` desc (mới nhất trước).
 *
 * @param {string} serviceId - ID dịch vụ cần lấy comment.
 * @param {object} query     - Query params (dự phòng mở rộng).
 */
export async function listComments(serviceId, query = {}) {
  if (!serviceId) throw badRequest('Thiếu serviceId.')

  const snapshot = await commentsRef().once('value')
  if (!snapshot.exists()) return { comments: [] }

  const all = toList(snapshot.val())

  // Lọc comment cha theo serviceId
  const parents = all
    .filter((c) => c.serviceId === serviceId && c.parentId === null)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

  // Gắn replies vào từng comment cha
  const commentsWithReplies = parents.map((parent) => {
    const replies = all
      .filter((c) => c.parentId === parent.id)
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
    return { ...parent, replies }
  })

  return { comments: commentsWithReplies }
}

/**
 * Tạo comment mới cho một dịch vụ.
 * - Cần đăng nhập.
 * - `content`: tối thiểu 2, tối đa 500 ký tự.
 *
 * @param {object} user  - Thông tin người dùng từ req.profile.
 * @param {object} input - { serviceId, content }.
 */
export async function createComment(user, input = {}) {
  const serviceId = norm(input.serviceId)
  const content = norm(input.content)

  // Validate
  if (!serviceId) throw badRequest('Thiếu serviceId.')
  if (content.length < 2) throw badRequest('Nội dung bình luận phải có ít nhất 2 ký tự.')
  if (content.length > 500) throw badRequest('Nội dung bình luận không được vượt quá 500 ký tự.')

  const now = Date.now()
  const entry = {
    serviceId,
    content,
    parentId: null,
    authorUid: user.uid,
    authorName: user.displayName || user.email || 'Người dùng',
    authorRole: user.role ?? 'customer',
    replyCount: 0,
    createdAt: now,
    updatedAt: now,
  }

  const ref = await commentsRef().push(entry)
  return { id: ref.key, ...entry }
}

/**
 * Trả lời một comment cha.
 * - Cần đăng nhập.
 * - Không cho phép reply của reply (chỉ reply comment cha).
 * - Tăng `replyCount` của comment cha sau khi tạo thành công.
 *
 * @param {object} user  - Thông tin người dùng từ req.profile.
 * @param {object} input - { parentId, content }.
 */
export async function createReply(user, input = {}) {
  const parentId = norm(input.parentId)
  const content = norm(input.content)

  // Validate
  if (!parentId) throw badRequest('Thiếu parentId.')
  if (content.length < 2) throw badRequest('Nội dung trả lời phải có ít nhất 2 ký tự.')
  if (content.length > 500) throw badRequest('Nội dung trả lời không được vượt quá 500 ký tự.')

  // Kiểm tra comment cha tồn tại
  const parentSnap = await commentRef(parentId).once('value')
  if (!parentSnap.exists()) throw notFound('Không tìm thấy bình luận gốc.')

  const parent = parentSnap.val()

  // Không cho reply của reply (comment cha phải có parentId === null)
  if (parent.parentId !== null && parent.parentId !== undefined) {
    throw badRequest('Không thể trả lời một reply. Chỉ được trả lời bình luận gốc.')
  }

  const now = Date.now()
  const entry = {
    serviceId: parent.serviceId,
    content,
    parentId,
    authorUid: user.uid,
    authorName: user.displayName || user.email || 'Người dùng',
    authorRole: user.role ?? 'customer',
    createdAt: now,
    updatedAt: now,
  }

  // Lưu reply
  const ref = await commentsRef().push(entry)

  // Tăng replyCount của comment cha bằng transaction (thread-safe)
  await commentRef(parentId)
    .child('replyCount')
    .transaction((current) => (current ?? 0) + 1)

  return { id: ref.key, ...entry }
}

/**
 * Lấy danh sách reply của một comment cha.
 * - Sắp xếp theo `createdAt` asc (cũ nhất trước).
 *
 * @param {string} parentId - ID của comment cha.
 */
export async function listReplies(parentId) {
  if (!parentId) throw badRequest('Thiếu parentId.')

  // Kiểm tra comment cha tồn tại
  const parentSnap = await commentRef(parentId).once('value')
  if (!parentSnap.exists()) throw notFound('Không tìm thấy bình luận gốc.')

  const snapshot = await commentsRef().once('value')
  if (!snapshot.exists()) return { replies: [] }

  const all = toList(snapshot.val())
  const replies = all
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))

  return { replies }
}

/**
 * Xoá comment (hoặc reply).
 * - Chỉ admin hoặc tác giả mới được xoá.
 * - Khi xoá comment cha → xoá luôn tất cả replies con.
 *
 * @param {object} user      - Thông tin người dùng từ req.profile.
 * @param {string} commentId - ID của comment cần xoá.
 */
export async function deleteComment(user, commentId) {
  if (!commentId) throw badRequest('Thiếu commentId.')

  const snap = await commentRef(commentId).once('value')
  if (!snap.exists()) throw notFound('Không tìm thấy bình luận.')

  const comment = snap.val()

  // Kiểm tra quyền: chỉ admin hoặc tác giả mới xoá được
  if (user.role !== 'admin' && comment.authorUid !== user.uid) {
    throw forbidden('Bạn không có quyền xoá bình luận này.')
  }

  // Nếu là comment cha → xoá luôn tất cả replies con
  if (comment.parentId === null || comment.parentId === undefined) {
    const snapshot = await commentsRef().once('value')
    if (snapshot.exists()) {
      const all = toList(snapshot.val())
      const replies = all.filter((c) => c.parentId === commentId)

      // Xoá từng reply
      const deleteReplies = replies.map((r) => commentRef(r.id).remove())
      await Promise.all(deleteReplies)
    }
  }

  // Xoá comment chính
  await commentRef(commentId).remove()
  return true
}
