import { createServer } from 'node:http'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const PORT = 18181
const BASE = `http://127.0.0.1:${PORT}`
const tempDir = mkdtempSync(path.join(tmpdir(), 'lucky-ml-verify-'))

process.env.OLLAMA_EMBED_URL = BASE
process.env.OLLAMA_EMBEDDING_MODEL = 'test-embed'
process.env.OLLAMA_EMBED_TIMEOUT_MS = '2000'
process.env.ML_DATA_DIR = tempDir
process.env.ML_LABEL_MARGIN = '0.05'

let passed = 0
let failed = 0
const failures = []

const stats = { embedCalls: 0, legacyCalls: 0, tagCalls: 0 }

function check(name, condition, detail) {
  if (condition) {
    passed += 1
    console.log(`  ✔ ${name}`)
    return
  }

  failed += 1
  failures.push(name)
  console.log(`  ✘ ${name}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`)
}

function section(title) {
  console.log(`\n${title}`)
}

function fold(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
}

function vectorFor(text) {
  const value = fold(text)
  const electric = ['chap', 'dien', 'aptomat', 'cau dao', 'chay', 'khet', 'tia lua'].some(
    (keyword) => value.includes(keyword),
  )
  const water = ['nuoc', 'bom', 'ong', 'ro ri', 'nghet', 'bon cau', 'voi'].some(
    (keyword) => value.includes(keyword),
  )

  const vector = new Array(8).fill(0)
  if (electric && water) {
    vector[0] = 0.7
    vector[1] = 0.7
  } else if (electric) {
    vector[0] = 1
  } else if (water) {
    vector[1] = 1
  } else {
    vector[2] = 1
  }

  return vector
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => resolve(body))
  })
}

function jsonResponse(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

function startStub() {
  const server = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/api/tags') {
      stats.tagCalls += 1
      jsonResponse(res, 200, { models: [{ name: 'test-embed' }, { name: 'other' }] })
      return
    }

    if (req.method === 'POST' && req.url === '/api/embed') {
      stats.embedCalls += 1
      const body = JSON.parse((await readBody(req)) || '{}')
      const input = String(body.input ?? '')

      if (input.includes('legacy')) {
        jsonResponse(res, 404, { error: 'not found' })
        return
      }
      if (input.includes('fail')) {
        jsonResponse(res, 500, { error: 'boom' })
        return
      }
      if (input.includes('timeout')) {
        setTimeout(() => {
          if (!res.writableEnded) jsonResponse(res, 200, { embeddings: [vectorFor(input)] })
        }, 5000)
        return
      }

      jsonResponse(res, 200, { embeddings: [vectorFor(input)] })
      return
    }

    if (req.method === 'POST' && req.url === '/api/embeddings') {
      stats.legacyCalls += 1
      const body = JSON.parse((await readBody(req)) || '{}')
      const prompt = String(body.prompt ?? '')

      if (prompt.includes('fail')) {
        jsonResponse(res, 500, { error: 'boom' })
        return
      }

      jsonResponse(res, 200, { embedding: vectorFor(prompt) })
      return
    }

    jsonResponse(res, 404, { error: 'not found' })
  })

  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => resolve(server))
  })
}

async function expectReject(name, action) {
  try {
    await action()
    check(name, false, 'expected rejection')
  } catch {
    check(name, true)
  }
}

async function run() {
  const { cosineSimilarity, normalizeVector } = await import('../src/utils/vector.js')
  const { kmeans } = await import('../src/utils/kmeans.js')
  const { embed, clearEmbeddingCache, checkEmbeddingHealth } = await import(
    '../src/services/embedding.service.js'
  )
  const {
    loadServiceVectors,
    resetMlStoreCache,
    saveLabelModel,
    saveServiceVectors,
  } = await import('../src/services/ml-store.service.js')
  const {
    rebuildServiceIndex,
    removeServiceVector,
    searchServiceIds,
    upsertServiceVector,
  } = await import('../src/services/search.service.js')
  const {
    classifyIssue,
    deriveCategoryFromDevice,
    keywordLabel,
    nearestCentroidLabel,
  } = await import('../src/services/label.service.js')
  const { createLabelQueue } = await import('../src/services/label-queue.core.js')

  section('Vector math')
  const unit = normalizeVector([3, 4])
  check(
    'normalizeVector returns a unit vector',
    Math.abs(Math.hypot(...unit) - 1) < 1e-9,
    unit,
  )
  check(
    'cosine of identical vectors is 1',
    Math.abs(cosineSimilarity([1, 0, 0], [1, 0, 0]) - 1) < 1e-9,
  )
  check(
    'cosine of orthogonal vectors is 0',
    Math.abs(cosineSimilarity([1, 0, 0], [0, 1, 0])) < 1e-9,
  )
  check('cosine rejects mismatched dimensions', cosineSimilarity([1, 0], [1]) === 0)
  check('cosine handles zero vectors', cosineSimilarity([0, 0], [1, 0]) === 0)
  check(
    'normalizeVector handles zero vectors',
    JSON.stringify(normalizeVector([0, 0])) === JSON.stringify([0, 0]),
  )

  section('KMeans')
  const points = []
  for (let index = 0; index < 5; index += 1) {
    points.push([1 + (index % 3) * 0.01, (index % 2) * 0.01, 0])
  }
  for (let index = 0; index < 5; index += 1) {
    points.push([(index % 2) * 0.01, 1 + (index % 3) * 0.01, 0])
  }

  const result = kmeans(points, 2, { seed: 42, restarts: 5 })
  check('kmeans returns 2 centroids', result.centroids.length === 2)
  const firstCluster = result.assignments[0]
  const secondCluster = result.assignments[5]
  check(
    'kmeans separates two synthetic clusters',
    firstCluster !== secondCluster &&
      result.assignments.slice(0, 5).every((value) => value === firstCluster) &&
      result.assignments.slice(5).every((value) => value === secondCluster),
    result.assignments,
  )
  const repeated = kmeans(points, 2, { seed: 42, restarts: 5 })
  check(
    'kmeans is deterministic for a fixed seed',
    JSON.stringify(repeated.centroids) === JSON.stringify(result.centroids),
  )
  check('kmeans handles k > n', kmeans([[1, 0]], 2).centroids.length === 1)
  check('kmeans handles empty input', kmeans([], 2).centroids.length === 0)

  section('Embedding client')
  clearEmbeddingCache()
  const beforeCalls = stats.embedCalls
  const first = await embed('aptomat cu nhay')
  check('embed returns an 8-dimensional vector', first.length === 8, first.length)
  check(
    'embed normalizes the vector',
    Math.abs(Math.hypot(...first) - 1) < 1e-6,
  )
  const cached = await embed('aptomat cu nhay')
  check('embed caches identical text', stats.embedCalls === beforeCalls + 1)
  check('embed cache returns the same vector', JSON.stringify(cached) === JSON.stringify(first))
  const legacy = await embed('legacy text', { useCache: false })
  check(
    'embed falls back to legacy /api/embeddings',
    legacy.length === 8 && stats.legacyCalls > 0,
  )
  await expectReject('embed rejects on timeout', () =>
    embed('timeout please', { timeoutMs: 150, useCache: false }),
  )
  await expectReject('embed rejects on server error', () =>
    embed('fail please', { useCache: false }),
  )
  await expectReject('embed rejects empty text', () => embed('   '))
  const health = await checkEmbeddingHealth()
  check(
    'embedding health reports ok and model present',
    health.ok === true && health.modelPresent === true,
    health,
  )

  section('Artifact store')
  await saveServiceVectors({
    model: 'test-embed',
    dim: 8,
    updatedAt: 1,
    vectors: { a: [1, 0, 0, 0, 0, 0, 0, 0] },
  })
  const loaded = await loadServiceVectors()
  check('artifact store round-trips', loaded.vectors.a?.[0] === 1)
  writeFileSync(path.join(tempDir, 'service-vectors.json'), '{not json')
  resetMlStoreCache()
  const corrupted = await loadServiceVectors()
  check('artifact store recovers from corrupt JSON', Object.keys(corrupted.vectors).length === 0)
  await saveServiceVectors({ model: 'test-embed', dim: 8, updatedAt: 2, vectors: {} })

  section('A3 semantic search')
  const baseVectors = {
    elec: [1, 0, 0, 0, 0, 0, 0, 0],
    water: [0, 1, 0, 0, 0, 0, 0, 0],
    other: [0, 0, 1, 0, 0, 0, 0, 0],
  }
  await saveServiceVectors({
    model: 'test-embed',
    dim: 8,
    updatedAt: Date.now(),
    vectors: baseVectors,
  })
  const electricResult = await searchServiceIds('chap dien')
  check('A3 ranks electric service first', electricResult.ids[0] === 'elec', electricResult.ids)
  const waterResult = await searchServiceIds('may bom nuoc')
  check('A3 ranks water service first', waterResult.ids[0] === 'water', waterResult.ids)
  const emptyQuery = await searchServiceIds('   ')
  check('A3 empty query returns empty result', emptyQuery.ids.length === 0)
  await saveServiceVectors({ model: 'test-embed', dim: 0, updatedAt: Date.now(), vectors: {} })
  check('A3 empty index returns null (caller falls back)', (await searchServiceIds('chap dien')) === null)
  await saveServiceVectors({
    model: 'test-embed',
    dim: 8,
    updatedAt: Date.now(),
    vectors: baseVectors,
  })
  await expectReject('A3 rejects when embedding fails', () => searchServiceIds('fail please'))

  const rebuilt = await rebuildServiceIndex([
    {
      id: 's1',
      title: 'Sửa chữa điện',
      categoryName: 'Sửa Chữa Điện',
      shortDesc: 'chập điện',
    },
    {
      id: 's2',
      title: 'Sửa máy bơm nước',
      categoryName: 'Sửa Chữa Nước',
      shortDesc: 'máy bơm',
    },
  ])
  check('rebuild indexes all services', Object.keys(rebuilt.vectors).length === 2)
  await upsertServiceVector({ id: 's3', title: 'Thông tắc cống', description: 'nước' })
  check('upsert adds a vector', Boolean((await loadServiceVectors()).vectors.s3))
  await removeServiceVector('s3')
  check('remove deletes a vector', !(await loadServiceVectors()).vectors.s3)
  check('remove of missing id returns false', (await removeServiceVector('missing')) === false)

  const manyVectors = {}
  for (let index = 0; index < 1000; index += 1) {
    const vector = new Array(8).fill(0)
    vector[index % 8] = 1
    manyVectors[`v${index}`] = vector
  }
  await saveServiceVectors({
    model: 'test-embed',
    dim: 8,
    updatedAt: Date.now(),
    vectors: manyVectors,
  })
  const started = Date.now()
  await searchServiceIds('chap dien')
  const elapsed = Date.now() - started
  check('A3 searches 1000 vectors under 1000ms', elapsed < 1000, `${elapsed}ms`)

  section('A1 labeling')
  await saveLabelModel({
    model: 'test-embed',
    dim: 8,
    k: 2,
    labels: ['electric', 'water'],
    centroids: [
      [1, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0, 0, 0],
    ],
    naming: [],
    sampleCount: 2,
    updatedAt: Date.now(),
  })

  const electric = await classifyIssue('aptomat cu nhay')
  check(
    'A1 labels electric via model',
    electric?.category === 'electric' && electric.source === 'model',
    electric,
  )
  const water = await classifyIssue('may bom khong len nuoc')
  check(
    'A1 labels water via model',
    water?.category === 'water' && water.source === 'model',
    water,
  )
  const generic = await classifyIssue('hello world')
  check('A1 refuses low-margin generic text', generic === null, generic)
  const mixed = await classifyIssue('chap dien va may bom nuoc')
  check(
    'A1 falls back to keyword rules on low margin',
    mixed?.source === 'rule' && ['electric', 'water'].includes(mixed.category),
    mixed,
  )
  check('keywordLabel maps electric', keywordLabel('chập điện')?.category === 'electric')
  check('keywordLabel maps water', keywordLabel('rò rỉ ống nước')?.category === 'water')
  check('keywordLabel returns null for unrelated text', keywordLabel('xin chào') === null)
  check(
    'deriveCategoryFromDevice maps electric',
    deriveCategoryFromDevice('Sửa Chữa Điện') === 'electric',
  )
  check(
    'deriveCategoryFromDevice maps water',
    deriveCategoryFromDevice('Sửa Chữa Nước') === 'water',
  )
  check(
    'deriveCategoryFromDevice rejects generic electric+water text',
    deriveCategoryFromDevice('Sửa chữa điện nước') === null,
  )
  check(
    'nearestCentroidLabel without model returns null',
    nearestCentroidLabel([1, 0, 0, 0, 0, 0, 0, 0], { centroids: [], labels: [] }) === null,
  )

  section('Async label queue')
  const events = []
  let active = 0
  let maxActive = 0
  const queue = createLabelQueue({
    handler: async (id) => {
      active += 1
      maxActive = Math.max(maxActive, active)
      await new Promise((resolve) => setTimeout(resolve, 10))
      events.push(id)
      active -= 1
    },
    concurrency: 1,
    maxAttempts: 2,
    retryDelayMs: 5,
  })

  for (const id of ['a', 'b', 'c', 'd']) queue.enqueue(id)
  check('queue dedupes duplicate ids', queue.enqueue('a') === false)
  await queue.whenIdle()
  check('queue processes all jobs', events.length === 4, events)
  check('queue respects concurrency=1', maxActive === 1, maxActive)

  let attempts = 0
  const retryQueue = createLabelQueue({
    handler: async () => {
      attempts += 1
      if (attempts === 1) throw new Error('transient')
    },
    concurrency: 1,
    maxAttempts: 2,
    retryDelayMs: 5,
  })
  retryQueue.enqueue('retry')
  await retryQueue.whenIdle()
  check('queue retries transient failures', attempts === 2, attempts)

  let errors = 0
  const failQueue = createLabelQueue({
    handler: async (id) => {
      if (id === 'bad') throw new Error('permanent')
    },
    concurrency: 1,
    maxAttempts: 1,
    onError: () => {
      errors += 1
    },
  })
  failQueue.enqueue('bad')
  failQueue.enqueue('good')
  await failQueue.whenIdle()
  check('queue isolates failures', errors === 1, errors)
  check('queue continues after a failure', failQueue.stats().pending === 0)

  failQueue.stop()
  check('queue rejects jobs after stop', failQueue.enqueue('later') === false)
}

let stub = null

try {
  stub = await startStub()
  await run()
} catch (error) {
  failed += 1
  failures.push('unexpected error')
  console.error('\nUnhandled test error:', error)
} finally {
  if (stub) {
    if (typeof stub.closeAllConnections === 'function') stub.closeAllConnections()
    await new Promise((resolve) => stub.close(resolve))
  }
  rmSync(tempDir, { recursive: true, force: true })
}

console.log(`\n${passed} passed, ${failed} failed`)

if (failed > 0) {
  console.log('Failures:')
  for (const failure of failures) console.log(`  - ${failure}`)
  process.exit(1)
}

process.exit(0)
