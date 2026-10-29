import { asyncHandler } from '../middlewares/error.middleware.js'
import {
  getAssistantStatus,
  getIndexStatus,
  queryAdminAssistant,
  queryAssistant,
  queryServiceAssistant,
  requestReindex,
} from '../services/assistant.service.js'

/** POST /api/assistant/chat — public read-only assistant. */
export const chat = asyncHandler(async (req, res) => {
  const result = await queryAssistant({ question: req.body?.question })
  res.json(result)
})

/** POST /api/assistant/service/:id — service-scoped assistant. */
export const serviceChat = asyncHandler(async (req, res) => {
  const result = await queryServiceAssistant({
    serviceId: req.params.id,
    question: req.body?.question,
  })
  res.json(result)
})

/** POST /api/assistant/admin/query — catalog Q&A for admins. */
export const adminQuery = asyncHandler(async (req, res) => {
  const result = await queryAdminAssistant({ question: req.body?.question })
  res.json(result)
})

/** GET /api/assistant/status — sidecar and index health. */
export const status = asyncHandler(async (req, res) => {
  res.json({ assistant: await getAssistantStatus() })
})

/** GET /api/assistant/admin/index/status — indexing progress. */
export const indexStatus = asyncHandler(async (req, res) => {
  res.json({ index: await getIndexStatus() })
})

/** POST /api/assistant/admin/reindex — disabled during the demo by default. */
export const reindex = asyncHandler(async (req, res) => {
  const result = await requestReindex()
  res.status(202).json(result)
})
