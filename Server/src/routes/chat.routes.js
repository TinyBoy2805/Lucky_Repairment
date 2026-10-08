import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { index, messages, send } from '../controllers/chat.controller.js'

const router = Router()

router.use(requireAuth)

router.get('/', index)
router.get('/:requestId/messages', messages)
router.post('/:requestId/messages', send)

export default router
