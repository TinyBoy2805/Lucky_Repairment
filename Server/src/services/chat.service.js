import { db } from '../config/firebase.js'
import { badRequest, forbidden, notFound } from '../utils/http-error.js'

// Chỉ được chat sau khi thợ đã nhận đơn.
const CHAT_STATUSES = ['assigned', 'in_progress', 'done']

const chatsRef = () => db.ref('chats')
const chatRef = (requestId) => chatsRef().child(requestId)
const messagesRef = (requestId) => chatRef(requestId).child('messages')
const requestRef = (id) => db.ref(`requests/${id}`)

const norm = (value) => String(value ?? '').trim()

const isParticipant = (request, uid) =>
  request.customerUid === uid || request.repairmanUid === uid

async function loadRequest(requestId) {
  const snapshot = await requestRef(requestId).once('value')
  if (!snapshot.exists()) throw notFound('Không tìm thấy đơn hàng.')
  return snapshot.val()
}

/** Danh sách cuộc trò chuyện (theo đơn) mà user tham gia. */
export async function listChats(viewer) {
  const snapshot = await chatsRef().once('value')
  if (!snapshot.exists()) return []

  const all = Object.entries(snapshot.val())
    .filter(([requestId]) => requestId !== '_schema')
    .map(([requestId, data]) => {
      const { messages, ...rest } = data
      return { requestId, ...rest, messageCount: Object.keys(messages ?? {}).length }
    })

  if (viewer.role === 'admin') return all

  return all.filter(
    (chat) => chat.customerUid === viewer.uid || chat.repairmanUid === viewer.uid,
  )
}

/** Tin nhắn trong 1 đơn (chỉ người tham gia hoặc admin). */
export async function listMessages(requestId, viewer) {
  const request = await loadRequest(requestId)
  if (viewer.role !== 'admin' && !isParticipant(request, viewer.uid)) {
    throw forbidden('Bạn không thuộc cuộc trò chuyện này.')
  }

  const snapshot = await messagesRef(requestId).once('value')
  if (!snapshot.exists()) return []

  return Object.entries(snapshot.val())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
}

/** Gửi tin nhắn (chỉ người tham gia, sau khi đơn đã được nhận). */
export async function sendMessage(requestId, sender, input = {}) {
  const text = norm(input.text)
  if (!text) throw badRequest('Nội dung tin nhắn không được để trống.')

  const request = await loadRequest(requestId)
  if (!isParticipant(request, sender.uid)) {
    throw forbidden('Bạn không thuộc cuộc trò chuyện này.')
  }
  if (!CHAT_STATUSES.includes(request.status)) {
    throw forbidden('Chỉ trò chuyện được sau khi thợ đã nhận đơn.')
  }

  const now = Date.now()
  const chatSnapshot = await chatRef(requestId).once('value')
  const existing = chatSnapshot.val() ?? {}

  await chatRef(requestId).update({
    requestId,
    customerUid: request.customerUid,
    repairmanUid: request.repairmanUid ?? null,
    lastMessage: text,
    createdAt: existing.createdAt ?? now,
    updatedAt: now,
  })

  const message = {
    senderUid: sender.uid,
    senderName: sender.displayName || sender.email || '',
    text,
    createdAt: now,
  }

  const ref = await messagesRef(requestId).push(message)
  return { id: ref.key, ...message }
}
