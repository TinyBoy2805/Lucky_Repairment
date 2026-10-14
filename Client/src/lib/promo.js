// Danh sách mã khuyến mãi hợp lệ (dùng chung cho mọi luồng đặt hàng)
export const PROMO_CODES = {
  PROMO10: { percent: 10, label: 'Giảm 10%' },
  SAVE10: { percent: 10, label: 'Giảm 10%' },
  WELCOME5: { amount: 50000, label: 'Giảm 50.000đ' },
}

export function normalizePromoCode(code) {
  return String(code || '').trim().toUpperCase()
}

export function isValidPromoCode(code) {
  return Boolean(PROMO_CODES[normalizePromoCode(code)])
}

export function computeDiscount(code, total) {
  const promo = PROMO_CODES[normalizePromoCode(code)]
  if (!promo) return 0
  if (promo.percent) return Math.min(total, Math.round((total * promo.percent) / 100))
  return Math.min(total, promo.amount || 0)
}

export function promoLabel(code) {
  const promo = PROMO_CODES[normalizePromoCode(code)]
  return promo ? promo.label : ''
}