import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler, notFound } from './middlewares/error.middleware.js'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import requestRoutes from './routes/request.routes.js'
import categoryRoutes from './routes/category.routes.js'
import ratingRoutes from './routes/rating.routes.js'
import walletRoutes from './routes/wallet.routes.js'
import transactionRoutes from './routes/transaction.routes.js'
import paymentRoutes from './routes/payment.routes.js'
import chatRoutes from './routes/chat.routes.js'
import scheduleRoutes from './routes/schedule.routes.js'
import reportRoutes from './routes/report.routes.js'
import productRoutes from './routes/product.routes.js'
import orderRoutes from './routes/order.routes.js'
import serviceRoutes from './routes/service.routes.js'

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
  app.use('/api/bookings', requestRoutes)
  app.use('/api/services', serviceRoutes)
  app.use('/api/categories', categoryRoutes)
  app.use('/api/ratings', ratingRoutes)
  app.use('/api/wallet', walletRoutes)
  app.use('/api/transactions', transactionRoutes)
  app.use('/api/payments', paymentRoutes)
  app.use('/api/chats', chatRoutes)
  app.use('/api/schedules', scheduleRoutes)
  app.use('/api/reports', reportRoutes)
  app.use('/api/products', productRoutes)
  app.use('/api/orders', orderRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
