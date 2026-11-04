import { embed, getEmbeddingModel } from './embedding.service.js'
import { loadServiceVectors, saveServiceVectors } from './ml-store.service.js'
import { buildServiceText } from '../utils/service-text.js'
import { cosineSimilarity } from '../utils/vector.js'

let writeChain = Promise.resolve()

function withIndexLock(task) {
  const run = writeChain.then(task, task)
  writeChain = run.catch(() => {})
  return run
}

export async function searchServiceIds(query, options = {}) {
  const text = String(query ?? '').trim()
  if (!text) return { ids: [], scores: [] }

  const { topK = 100 } = options
  const index = await loadServiceVectors()
  const entries = Object.entries(index.vectors || {})
  if (!entries.length) return null

  const queryVector = await embed(text)
  const scored = entries
    .map(([id, vector]) => ({
      id,
      score: cosineSimilarity(queryVector, vector),
    }))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))

  const limited = scored.slice(0, Math.max(1, Math.floor(topK) || 1))
  return { ids: limited.map((item) => item.id), scores: limited }
}

export async function rebuildServiceIndex(services, options = {}) {
  const { onProgress } = options
  const list = (services || []).filter((service) => service?.id)
  const vectors = {}
  let dim = 0

  return withIndexLock(async () => {
    for (let position = 0; position < list.length; position += 1) {
      const service = list[position]
      const text = buildServiceText(service)
      if (!text) continue

      const vector = await embed(text)
      vectors[service.id] = vector
      dim = vector.length

      if (onProgress) {
        onProgress({
          index: position + 1,
          total: list.length,
          id: service.id,
        })
      }
    }

    return saveServiceVectors({
      model: getEmbeddingModel(),
      dim,
      updatedAt: Date.now(),
      vectors,
    })
  })
}

export async function upsertServiceVector(service) {
  if (!service?.id) return null
  const text = buildServiceText(service)
  if (!text) return null

  const vector = await embed(text)

  return withIndexLock(async () => {
    const index = await loadServiceVectors()
    const vectors = { ...(index.vectors || {}), [service.id]: vector }
    await saveServiceVectors({
      ...index,
      model: getEmbeddingModel(),
      dim: vector.length,
      updatedAt: Date.now(),
      vectors,
    })
    return vector
  })
}

export async function removeServiceVector(id) {
  if (!id) return false

  return withIndexLock(async () => {
    const index = await loadServiceVectors()
    if (!index.vectors || !(id in index.vectors)) return false

    const vectors = { ...index.vectors }
    delete vectors[id]
    await saveServiceVectors({
      ...index,
      updatedAt: Date.now(),
      vectors,
    })
    return true
  })
}
