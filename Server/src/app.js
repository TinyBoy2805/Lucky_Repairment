import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler, notFound } from './middlewares/error.middleware.js'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import requestRoutes from './routes/request.routes.js'

export function createApp() {
  const app = express()

  app.use(cors({ origin: env.clientUrls, credentials: false }))
  app.use(express.json())

  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)
    next()
  })

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', project: env.projectId, time: Date.now() })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/requests', requestRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
