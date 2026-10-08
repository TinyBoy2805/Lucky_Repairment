export function fmtDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function fmtDateTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtMoney(value) {
  const amount = Number(value) || 0
  return `${amount.toLocaleString('vi-VN')} ₫`
}

export function dayStart(value) {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date.getTime()
}

export function dayEnd(value) {
  if (!value) return undefined
  const date = new Date(`${value}T23:59:59.999`)
  return Number.isNaN(date.getTime()) ? undefined : date.getTime()
}
