import { embed } from './embedding.service.js'
import { loadLabelModel } from './ml-store.service.js'
import { cosineSimilarity } from '../utils/vector.js'
import { normalizeVi } from '../utils/vi-text.js'

const VALID_CATEGORIES = new Set(['electric', 'water'])

const KEYWORDS = {
  electric: [
    ['chap dien', 4],
    ['chap', 3],
    ['aptomat', 4],
    ['ap to mat', 4],
    ['cau dao', 4],
    ['mat dien', 3],
    ['mat nguon', 3],
    ['len nguon', 2],
    ['o dien', 3],
    ['doan dien', 3],
    ['ro ri dien', 3],
    ['giat dien', 4],
    ['mui khet', 3],
    ['tia lua', 3],
    ['bong den', 2],
    ['o cam', 2],
    ['cong tac', 2],
    ['quat dien', 2],
    ['tu lanh', 2],
    ['may giat', 2],
    ['dieu hoa', 2],
    ['noi com', 2],
    ['bep dien', 2],
    ['binh nong lanh', 2],
    ['dien', 1],
    ['chay', 1],
    ['no', 1],
  ],
  water: [
    ['ro ri nuoc', 4],
    ['nuoc ri', 3],
    ['ro ri', 3],
    ['ong nuoc', 4],
    ['duong ong', 3],
    ['may bom', 4],
    ['bom nuoc', 4],
    ['bom', 2],
    ['nghet', 3],
    ['thong tac', 3],
    ['tac cong', 3],
    ['bon cau', 4],
    ['chau rua', 3],
    ['thoat nuoc', 3],
    ['voi nuoc', 3],
    ['sen', 2],
    ['binh nong lanh', 2],
    ['nuoc', 1],
    ['tran', 1],
  ],
}

function scoreKeywords(text, category) {
  let score = 0
  for (const [keyword, weight] of KEYWORDS[category]) {
    if (text.includes(keyword)) score += weight
  }
  return score
}

export function keywordLabel(value) {
  const text = normalizeVi(value)
  if (!text) return null

  const electric = scoreKeywords(text, 'electric')
  const water = scoreKeywords(text, 'water')

  if (!electric && !water) return null
  if (electric === water) return null

  return {
    category: electric > water ? 'electric' : 'water',
    confidence: 1,
    margin: Math.abs(electric - water),
  }
}

export function deriveCategoryFromDevice(value) {
  const text = normalizeVi(value)
  if (!text) return null

  const hasElectric = text.includes('dien')
  const hasWater = text.includes('nuoc')

  if (hasElectric && hasWater) return null
  if (hasElectric) return 'electric'
  if (hasWater) return 'water'

  const keyword = keywordLabel(value)
  return keyword?.category ?? null
}

export function nearestCentroidLabel(vector, model) {
  if (!Array.isArray(vector) || !vector.length) return null
  if (!model || !Array.isArray(model.centroids) || !Array.isArray(model.labels)) {
    return null
  }

  const scored = []
  for (let index = 0; index < model.centroids.length; index += 1) {
    const category = model.labels[index]
    if (!VALID_CATEGORIES.has(category)) continue
    scored.push({
      category,
      score: cosineSimilarity(vector, model.centroids[index]),
    })
  }

  if (!scored.length) return null
  scored.sort((left, right) => right.score - left.score)

  const top = scored[0]
  const second = scored[1]
  const margin = second ? top.score - second.score : top.score

  return { category: top.category, confidence: top.score, margin }
}

export async function classifyIssue(value, options = {}) {
  const text = String(value ?? '').trim()
  if (!text) return null

  const marginThreshold = Number(
    options.margin ?? process.env.ML_LABEL_MARGIN ?? 0.05,
  )
  const minScore = Number(options.minScore ?? 0.1)
  const effectiveMargin = Number.isFinite(marginThreshold) ? marginThreshold : 0.05
  const effectiveMinScore = Number.isFinite(minScore) ? minScore : 0.1

  try {
    const model = await loadLabelModel()
    if (model.centroids.length) {
      const vector = await embed(text)
      const prediction = nearestCentroidLabel(vector, model)
      if (
        prediction &&
        prediction.margin >= effectiveMargin &&
        prediction.confidence >= effectiveMinScore
      ) {
        return {
          category: prediction.category,
          source: 'model',
          confidence: prediction.confidence,
          margin: prediction.margin,
        }
      }
    }
  } catch {
    // fall through to keyword rules
  }

  const keyword = keywordLabel(text)
  if (keyword) {
    return {
      category: keyword.category,
      source: 'rule',
      confidence: 1,
      margin: keyword.margin,
    }
  }

  return null
}
