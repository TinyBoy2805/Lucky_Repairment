import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { env } from '../config/env.js'
import { badRequest, httpError } from '../utils/http-error.js'

const SEED_CACHE_FILE = fileURLToPath(
  new URL('../../../GraphRAG/demo_cache.seed.json', import.meta.url),
)
const REQUEST_TIMEOUT_MS = 90000

let seedCache = null

const norm = (value) => String(value ?? '').trim()

const normalizeQuestion = (value) =>
  norm(value)
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function similarity(left, right) {
  if (!left || !right) return 0
  if (left === right) return 1

  const leftTokens = new Set(left.split(' '))
  const rightTokens = new Set(right.split(' '))
  const union = new Set([...leftTokens, ...rightTokens])
  let overlap = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1
  }

  return union.size === 0 ? 0 : overlap / union.size
}

function loadSeedCache() {
  if (seedCache) return seedCache

  try {
    const data = JSON.parse(readFileSync(SEED_CACHE_FILE, 'utf8'))
    seedCache = data?.entries ?? {}
  } catch (error) {
    console.warn('[assistant] Không đọc được demo cache:', error.message)
    seedCache = {}
  }

  return seedCache
}

function findSeedAnswer(question) {
  const entries = loadSeedCache()
  const key = normalizeQuestion(question)
  if (!key) return null

  if (entries[key]) return entries[key]

  let best = null
  let bestScore = 0
  for (const [cachedKey, entry] of Object.entries(entries)) {
    const score = similarity(key, cachedKey)
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }

  return bestScore >= 0.7 ? best : null
}

function fallbackResponse(question, reason) {
  const cached = findSeedAnswer(question)
  if (cached) {
    return {
      ...cached,
      source: 'cache',
      degraded: true,
      reason,
    }
  }

  return {
    answer:
      'Trợ lý AI đang tạm thời không phản hồi. Bạn vui lòng thử lại sau ít phút hoặc gọi tổng đài 1900 6868 để được hỗ trợ.',
    citations: [],
    mode: 'local',
    source: 'fallback',
    degraded: true,
    reason,
  }
}

async function callSidecar(route, { method = 'POST', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (env.assistantToken) headers['X-Assistant-Token'] = env.assistantToken

  let response
  try {
    response = await fetch(`${env.assistantUrl}${route}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw httpError(504, 'Trợ lý AI phản hồi quá lâu.')
    }
    throw httpError(503, 'Trợ lý AI chưa sẵn sàng.')
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    console.warn('[assistant] Sidecar trả lỗi:', response.status, data?.detail)
    throw httpError(502, 'Trợ lý AI không xử lý được yêu cầu.')
  }

  return data
}

function validateQuestion(question) {
  const value = norm(question)
  if (!value) throw badRequest('Vui lòng nhập câu hỏi.')
  if (value.length > 1000) throw badRequest('Câu hỏi quá dài (tối đa 1000 ký tự).')
  return value
}

export async function queryAssistant({ question, serviceId } = {}) {
  const value = validateQuestion(question)

  try {
    return await callSidecar('/query', {
      body: {
        question: value,
        service_id: serviceId || null,
        mode: 'auto',
      },
    })
  } catch (error) {
    if ([502, 503, 504].includes(error?.status)) {
      return fallbackResponse(value, 'timeout')
    }
    throw error
  }
}

export async function queryServiceAssistant({ serviceId, question } = {}) {
  const id = norm(serviceId)
  if (!id) throw badRequest('Thiếu mã dịch vụ.')

  const value = validateQuestion(question)

  try {
    return await callSidecar('/query', {
      body: {
        question: value,
        service_id: id,
        mode: 'auto',
      },
    })
  } catch (error) {
    if ([502, 503, 504].includes(error?.status)) {
      return fallbackResponse(value, 'timeout')
    }
    throw error
  }
}

export async function queryAdminAssistant({ question } = {}) {
  const value = validateQuestion(question)

  try {
    return await callSidecar('/query', {
      body: {
        question: value,
        mode: 'local',
      },
    })
  } catch (error) {
    if ([502, 503, 504].includes(error?.status)) {
      return fallbackResponse(value, 'timeout')
    }
    throw error
  }
}

export async function getAssistantStatus() {
  try {
    const data = await callSidecar('/health', { method: 'GET' })
    return { ...data, sidecar: true }
  } catch (error) {
    return {
      status: 'unavailable',
      sidecar: false,
      error: error.message,
      reindexAllowed: env.assistantAllowReindex,
    }
  }
}

export async function requestReindex() {
  if (!env.assistantAllowReindex) {
    throw httpError(403, 'Chức năng đánh lại chỉ mục đang tắt.')
  }

  return callSidecar('/index', { body: {} })
}

export async function getIndexStatus() {
  return callSidecar('/index/status', { method: 'GET' })
}
