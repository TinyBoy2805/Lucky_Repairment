import '../config/env.js'
import { normalizeVector } from '../utils/vector.js'

const MAX_CACHE_ENTRIES = 500
const cache = new Map()

function config() {
  return {
    url: String(process.env.OLLAMA_EMBED_URL ?? 'http://127.0.0.1:11435').replace(
      /\/+$/,
      '',
    ),
    model: String(process.env.OLLAMA_EMBEDDING_MODEL ?? 'qwen3-embedding:0.6b'),
    timeoutMs: Number(process.env.OLLAMA_EMBED_TIMEOUT_MS ?? 15000),
  }
}

function extractVector(payload) {
  const candidates = [
    payload?.embeddings?.[0],
    payload?.embedding,
    payload?.data?.[0]?.embedding,
  ]

  for (const candidate of candidates) {
    if (
      Array.isArray(candidate) &&
      candidate.length > 0 &&
      candidate.every((value) => Number.isFinite(Number(value)))
    ) {
      return candidate.map(Number)
    }
  }

  return null
}

async function postJson(url, body, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => null)
    return { ok: response.ok, status: response.status, payload }
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Ollama embedding timed out after ${timeoutMs}ms`)
    }
    throw new Error(`Cannot reach Ollama embedding service: ${error.message}`)
  } finally {
    clearTimeout(timeout)
  }
}

function remember(key, vector) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value
    cache.delete(oldest)
  }
  cache.set(key, vector)
}

export function getEmbeddingModel() {
  return config().model
}

export function clearEmbeddingCache() {
  cache.clear()
}

export async function embed(text, options = {}) {
  const input = String(text ?? '').trim()
  if (!input) throw new Error('Cannot embed empty text.')

  const { useCache = true, timeoutMs } = options
  const settings = config()
  const effectiveTimeout = Number(timeoutMs ?? settings.timeoutMs)
  const key = `${settings.model}::${input}`

  if (useCache && cache.has(key)) return cache.get(key)

  const modern = await postJson(
    `${settings.url}/api/embed`,
    { model: settings.model, input },
    effectiveTimeout,
  )

  let raw = modern.ok ? extractVector(modern.payload) : null

  if (!raw) {
    const legacy = await postJson(
      `${settings.url}/api/embeddings`,
      { model: settings.model, prompt: input },
      effectiveTimeout,
    )
    if (!legacy.ok) {
      throw new Error(
        `Ollama embedding failed with status ${legacy.status || modern.status}`,
      )
    }
    raw = extractVector(legacy.payload)
  }

  if (!raw) throw new Error('Ollama returned an invalid embedding response.')

  const vector = normalizeVector(raw)
  if (useCache) remember(key, vector)
  return vector
}

export async function embedMany(texts, options = {}) {
  const { onProgress } = options
  const vectors = []

  for (let index = 0; index < texts.length; index += 1) {
    vectors.push(await embed(texts[index], options))
    if (onProgress) onProgress({ index: index + 1, total: texts.length })
  }

  return vectors
}

export async function checkEmbeddingHealth() {
  const settings = config()

  try {
    const response = await fetch(`${settings.url}/api/tags`, {
      signal: AbortSignal.timeout(Math.min(settings.timeoutMs, 3000)),
    })
    const payload = await response.json().catch(() => null)
    const models = Array.isArray(payload?.models) ? payload.models : []
    const modelPresent = models.some(
      (item) => item?.name === settings.model || item?.model === settings.model,
    )

    return { ok: response.ok, model: settings.model, modelPresent }
  } catch (error) {
    return {
      ok: false,
      model: settings.model,
      modelPresent: false,
      error: error.message,
    }
  }
}
