export function fmtDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}