import { asyncHandler } from '../middlewares/error.middleware.js'
import { listChats, listMessages, sendMessage } from '../services/chat.service.js'

/** GET /api/chats */
export const index = asyncHandler(async (req, res) => {
  const chats = await listChats(req.profile)
  res.json({ chats, total: chats.length })
})

/** GET /api/chats/:requestId/messages */
export const messages = asyncHandler(async (req, res) => {
  const messages = await listMessages(req.params.requestId, req.profile)
  res.json({ messages, total: messages.length })
})

/** POST /api/chats/:requestId/messages */
export const send = asyncHandler(async (req, res) => {
  const message = await sendMessage(req.params.requestId, req.profile, req.body ?? {})
  res.status(201).json({ message })
})
