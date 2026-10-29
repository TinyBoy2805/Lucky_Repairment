const buckets = new Map()

const defaultKey = (req) => req.uid || req.ip || 'anonymous'

export function rateLimit({ windowMs = 60000, max = 30, key = defaultKey } = {}) {
  return (req, res, next) => {
    const now = Date.now()
    const id = key(req)
    const bucket = buckets.get(id)

    if (!bucket || now - bucket.startedAt >= windowMs) {
      buckets.set(id, { startedAt: now, count: 1 })
      return next()
    }

    bucket.count += 1
    if (bucket.count > max) {
      return res.status(429).json({
        error: 'Bạn đã gửi quá nhiều câu hỏi. Vui lòng thử lại sau ít phút.',
      })
    }

    return next()
  }
}
