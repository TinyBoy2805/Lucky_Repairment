// Tạo Error kèm HTTP status để error middleware map sang JSON { error }.
export const httpError = (status, message) =>
  Object.assign(new Error(message), { status })

export const badRequest = (message) => httpError(400, message)
export const unauthorized = (message) => httpError(401, message)
export const forbidden = (message) => httpError(403, message)
export const notFound = (message) => httpError(404, message)
export const conflict = (message) => httpError(409, message)
