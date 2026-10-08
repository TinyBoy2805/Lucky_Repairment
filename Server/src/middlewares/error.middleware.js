/** Bọc handler async để chuyển lỗi sang error middleware. */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next)

export function notFound(req, res) {
  res.status(404).json({ error: `Không tìm thấy route: ${req.method} ${req.originalUrl}` })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  const status = Number(error.status) || 500

  if (status >= 500) {
    console.error('[error]', error)
  }

  res.status(status).json({
    error:
      status >= 500
        ? 'Lỗi máy chủ. Vui lòng thử lại sau.'
        : error.message || 'Có lỗi xảy ra.',
  })
}
