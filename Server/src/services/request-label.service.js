import { db, firestore } from '../config/firebase.js'
import { classifyIssue, deriveCategoryFromDevice } from './label.service.js'

const VALID_CATEGORIES = new Set(['electric', 'water'])

async function readServiceCategory(serviceId) {
  if (!serviceId) return null

  try {
    const doc = await firestore.collection('services').doc(String(serviceId)).get()
    if (!doc.exists) return null
    const category = doc.data()?.category
    return VALID_CATEGORIES.has(category) ? category : null
  } catch {
    return null
  }
}

async function writeLabel(id, patch) {
  await firestore.collection('requests').doc(id).update(patch)

  try {
    await firestore.collection('bookings').doc(id).update(patch)
  } catch {}

  try {
    await db.ref(`requests/${id}`).update(patch)
  } catch {}
}

export async function applyLabelToRequest(id) {
  if (!id) throw new Error('Thiếu mã yêu cầu.')

  const doc = await firestore.collection('requests').doc(String(id)).get()
  if (!doc.exists) return null

  const request = { id, ...doc.data() }
  if (request.labelStatus === 'done' && VALID_CATEGORIES.has(request.category)) {
    return request
  }

  let result = null

  const realCategory = await readServiceCategory(request.serviceId)
  if (realCategory) {
    result = { category: realCategory, source: 'real', confidence: 1, margin: 1 }
  }

  if (!result) {
    const derived = deriveCategoryFromDevice(request.device)
    if (derived) {
      result = { category: derived, source: 'derived', confidence: 1, margin: 1 }
    }
  }

  if (!result) {
    try {
      result = await classifyIssue(request.issue)
    } catch {
      result = null
    }
  }

  const now = Date.now()
  const patch = result
    ? {
        category: result.category,
        labelSource: result.source,
        labelConfidence: result.confidence,
        labelMargin: result.margin,
        labeledAt: now,
        labelStatus: 'done',
        labelError: null,
        updatedAt: now,
      }
    : {
        category: 'unknown',
        labelSource: 'rule',
        labelConfidence: 0,
        labelMargin: 0,
        labeledAt: now,
        labelStatus: 'failed',
        updatedAt: now,
      }

  await writeLabel(String(id), patch)
  return { ...request, ...patch }
}

export async function markLabelFailed(id, error) {
  if (!id) return null

  const patch = {
    category: 'unknown',
    labelStatus: 'failed',
    labelSource: 'rule',
    labelConfidence: 0,
    labelMargin: 0,
    labeledAt: Date.now(),
    updatedAt: Date.now(),
    labelError: String(error?.message ?? 'unknown error').slice(0, 300),
  }

  await writeLabel(String(id), patch)
  return patch
}

export async function findStuckRequestIds(options = {}) {
  const { olderThanMs = 2 * 60 * 1000, limit = 50 } = options
  const cutoff = Date.now() - olderThanMs

  try {
    const snapshot = await firestore
      .collection('requests')
      .where('labelStatus', '==', 'calculating')
      .limit(limit)
      .get()

    return snapshot.docs
      .filter((doc) => (Number(doc.data()?.updatedAt) || 0) < cutoff)
      .map((doc) => doc.id)
  } catch {
    return []
  }
}
