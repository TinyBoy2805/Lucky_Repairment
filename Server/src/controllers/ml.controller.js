import { asyncHandler } from '../middlewares/error.middleware.js'
import { checkEmbeddingHealth } from '../services/embedding.service.js'
import { classifyIssue } from '../services/label.service.js'
import { loadLabelModel, loadServiceVectors } from '../services/ml-store.service.js'
import { listRepairServices } from '../services/repair-service.service.js'
import { applyLabelToRequest } from '../services/request-label.service.js'
import { notFound } from '../utils/http-error.js'

const RECOMMENDATION_LIMIT = 3

function toRecommendation(service) {
  return {
    id: service.id,
    title: service.title,
    category: service.category,
    categoryName: service.categoryName,
    startingPrice: service.startingPrice,
    priceDisplay: service.priceDisplay,
    image: service.image,
    responseTime: service.responseTime,
    warranty: service.warranty,
  }
}

export const health = asyncHandler(async (req, res) => {
  const [embedding, serviceIndex, labelModel] = await Promise.all([
    checkEmbeddingHealth(),
    loadServiceVectors(),
    loadLabelModel(),
  ])

  const vectors = Object.keys(serviceIndex.vectors || {})

  res.json({
    status: embedding.ok ? 'ok' : 'degraded',
    embedding,
    searchIndex: {
      ready: vectors.length > 0,
      count: vectors.length,
      updatedAt: serviceIndex.updatedAt || null,
    },
    labelModel: {
      ready: labelModel.centroids.length > 0,
      labels: labelModel.labels,
      updatedAt: labelModel.updatedAt || null,
    },
  })
})

export const retryLabel = asyncHandler(async (req, res) => {
  const request = await applyLabelToRequest(req.params.id)
  if (!request) throw notFound('Không tìm thấy yêu cầu sửa chữa.')
  res.json({ request })
})

export const classify = asyncHandler(async (req, res) => {
  const text = String(req.body?.text ?? '').trim()
  const selectedCategory = String(req.body?.selectedCategory ?? '').trim()
  const excludeServiceId = String(req.body?.excludeServiceId ?? '').trim()

  if (text.length < 6) {
    return res.json({
      issueCategory: null,
      source: null,
      confidence: null,
      margin: null,
      mismatch: false,
      recommendations: [],
    })
  }

  const result = await classifyIssue(text)
  const issueCategory = result?.category ?? null
  const mismatch = Boolean(
    issueCategory && selectedCategory && issueCategory !== selectedCategory,
  )

  let recommendations = []

  if (mismatch) {
    let list = await listRepairServices({ search: text, category: issueCategory })
    if (!list.length) {
      list = await listRepairServices({ category: issueCategory })
    }

    recommendations = list
      .filter((service) => service.id !== excludeServiceId)
      .slice(0, RECOMMENDATION_LIMIT)
      .map(toRecommendation)
  }

  res.json({
    issueCategory,
    source: result?.source ?? null,
    confidence: result?.confidence ?? null,
    margin: result?.margin ?? null,
    mismatch,
    recommendations,
  })
})
