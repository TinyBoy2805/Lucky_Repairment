import { db } from '../config/firebase.js'
import { badRequest } from '../utils/http-error.js'

const DEFAULTS = {
  commissionRate: 10,
  minServiceFee: 0,
  currency: 'VND',
  note: '',
}

const pricingRef = () => db.ref('settings/pricing')

export async function getPricing() {
  const snapshot = await pricingRef().once('value')
  if (!snapshot.exists()) return { ...DEFAULTS, updatedAt: null }
  return { ...DEFAULTS, ...snapshot.val() }
}

export async function updatePricing(input = {}) {
  const commissionRate = Number(input.commissionRate)
  const minServiceFee = Number(input.minServiceFee)

  if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
    throw badRequest('Tỷ lệ hoa hồng phải nằm trong khoảng 0 đến 100 (%).')
  }
  if (!Number.isFinite(minServiceFee) || minServiceFee < 0) {
    throw badRequest('Phí dịch vụ tối thiểu không hợp lệ.')
  }

  const entry = {
    commissionRate: Math.round(commissionRate * 100) / 100,
    minServiceFee: Math.round(minServiceFee),
    currency: String(input.currency ?? DEFAULTS.currency).trim() || DEFAULTS.currency,
    note: String(input.note ?? '').trim(),
    updatedAt: Date.now(),
  }

  await pricingRef().set(entry)
  return entry
}
