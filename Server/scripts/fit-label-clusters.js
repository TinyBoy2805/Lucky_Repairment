import 'dotenv/config'

import { db, firestore } from '../src/config/firebase.js'
import { embed, getEmbeddingModel } from '../src/services/embedding.service.js'
import {
  keywordLabel,
  nearestCentroidLabel,
} from '../src/services/label.service.js'
import { saveLabelModel } from '../src/services/ml-store.service.js'
import { buildServiceText } from '../src/utils/service-text.js'
import { kmeans } from '../src/utils/kmeans.js'
import { meanVector, normalizeVector } from '../src/utils/vector.js'

const dryRun = process.argv.includes('--dry-run')
const MAX_PER_CATEGORY = 30
const MIN_VALIDATION_ACCURACY = 0.8

const GOLDEN_PHRASES = {
  electric: [
    'ổ điện bị hư',
    'không có điện',
    'chập điện',
    'aptomat nhảy liên tục',
    'cháy cầu chì',
    'hư áp to mát',
  ],
  water: [
    'máy bơm không lên nước',
    'rò rỉ ống nước',
    'tắc cống',
    'bồn cầu bị nghẹt',
    'nước rỉ nhỏ và nhiều',
    'thay ống nước bị bục',
  ],
}

function argValue(name) {
  const prefix = `--${name}=`
  const match = process.argv.find((item) => item.startsWith(prefix))
  return match ? match.slice(prefix.length) : null
}

async function readRequests() {
  const snapshot = await db.ref('requests').once('value')
  if (!snapshot.exists()) return []

  return Object.entries(snapshot.val())
    .filter(([id]) => id !== '_schema')
    .map(([id, data]) => ({ id, ...data }))
}

async function readServices() {
  const snapshot = await firestore.collection('services').get()
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

function splitPhrases(value) {
  return String(value ?? '')
    .split(/[.,;:!?\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 8 && part.length <= 140)
}

function symptomTexts(services) {
  const buckets = { electric: [], water: [] }

  for (const service of services) {
    const category = service.category === 'water' ? 'water' : 'electric'
    const signs = Array.isArray(service.signs) ? service.signs : []

    for (const sign of signs) {
      const text = typeof sign === 'string' ? sign : sign?.text || sign?.label || ''
      buckets[category].push(...splitPhrases(text))
    }

    buckets[category].push(...splitPhrases(service.shortDesc))
  }

  return {
    electric: buckets.electric.slice(0, MAX_PER_CATEGORY),
    water: buckets.water.slice(0, MAX_PER_CATEGORY),
  }
}

function unique(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))]
}

async function validateModel(labels, centroids) {
  const model = { labels, centroids }
  const results = []

  for (const [expected, phrases] of Object.entries(GOLDEN_PHRASES)) {
    for (const phrase of phrases) {
      const vector = await embed(phrase)
      const prediction = nearestCentroidLabel(vector, model)
      results.push({
        phrase,
        expected,
        predicted: prediction?.category ?? null,
      })
    }
  }

  const correct = results.filter((item) => item.predicted === item.expected).length
  const accuracy = correct / results.length

  console.log(
    `Validation: ${correct}/${results.length} (${(accuracy * 100).toFixed(0)}%)`,
  )

  for (const item of results) {
    if (item.predicted === item.expected) continue
    console.log(
      `  ✘ "${item.phrase}" expected ${item.expected}, got ${item.predicted ?? 'null'}`,
    )
  }

  return accuracy
}

async function supervisedCentroids(services) {
  const labels = ['electric', 'water']
  const buckets = { electric: [], water: [] }

  for (const service of services) {
    const category = service.category === 'water' ? 'water' : 'electric'
    const text = buildServiceText(service)
    if (!text) continue
    buckets[category].push(await embed(text))
  }

  if (!buckets.electric.length || !buckets.water.length) {
    throw new Error(
      'Need at least one electric and one water service for supervised centroids.',
    )
  }

  const centroids = labels.map((label) =>
    normalizeVector(meanVector(buckets[label])),
  )

  return {
    labels,
    centroids,
    counts: {
      electric: buckets.electric.length,
      water: buckets.water.length,
    },
  }
}

async function saveModel({
  labels,
  centroids,
  naming,
  sampleCount,
  method,
  validationAccuracy,
}) {
  const model = {
    model: getEmbeddingModel(),
    dim: centroids[0]?.length ?? 0,
    k: centroids.length,
    labels,
    centroids,
    naming: naming || [],
    method,
    validationAccuracy,
    sampleCount,
    updatedAt: Date.now(),
  }

  await saveLabelModel(model)
  return model
}

async function main() {
  const [requests, services] = await Promise.all([readRequests(), readServices()])

  const issueTexts = unique(requests.map((item) => item.issue))
  const symptoms = symptomTexts(services)
  const balancedSymptoms = [...symptoms.electric, ...symptoms.water]
  const texts = unique([...issueTexts, ...balancedSymptoms])

  const max = Number(argValue('max'))
  const limited = Number.isFinite(max) && max > 0 ? texts.slice(0, max) : texts

  if (limited.length < 2) {
    throw new Error('Need at least 2 texts to fit KMeans. Run the app or seed data first.')
  }

  console.log(
    `Corpus: ${limited.length} texts (${issueTexts.length} issues, ${symptoms.electric.length} electric symptoms, ${symptoms.water.length} water symptoms); model ${getEmbeddingModel()}`,
  )

  const vectors = []
  for (let index = 0; index < limited.length; index += 1) {
    vectors.push(await embed(limited[index]))
    if ((index + 1) % 50 === 0 || index === limited.length - 1) {
      console.log(`  embedded ${index + 1}/${limited.length}`)
    }
  }

  const result = kmeans(vectors, 2, { seed: 42, restarts: 10 })
  const naming = [0, 1].map((cluster) => {
    let electric = 0
    let water = 0
    let size = 0

    for (let index = 0; index < limited.length; index += 1) {
      if (result.assignments[index] !== cluster) continue
      size += 1
      const label = keywordLabel(limited[index])
      if (label?.category === 'electric') electric += 1
      if (label?.category === 'water') water += 1
    }

    return { cluster, size, electric, water }
  })

  const override = argValue('labels')
  let labels

  if (override) {
    labels = override.split(',').map((value) => value.trim())
    if (
      labels.length !== 2 ||
      labels.some((value) => value !== 'electric' && value !== 'water') ||
      labels[0] === labels[1]
    ) {
      throw new Error('--labels must be "electric,water" or "water,electric".')
    }
  } else {
    const scores = naming.map((item) => item.electric - item.water)
    const electricCluster =
      scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1

    if (electricCluster === null) {
      throw new Error(
        'Could not name clusters automatically (keyword scores tied). Re-run with --labels=electric,water or --labels=water,electric.',
      )
    }

    if (scores[electricCluster] <= 0) {
      throw new Error(
        'Clusters do not separate electric/water cleanly. Check the corpus or pass --labels explicitly.',
      )
    }

    if (scores[1 - electricCluster] >= 0) {
      console.warn(
        'Warning: the water cluster also leans electric; separation is weak. Consider --labels override.',
      )
    }

    labels = []
    labels[electricCluster] = 'electric'
    labels[1 - electricCluster] = 'water'
  }

  console.log('Clusters:')
  for (const item of naming) {
    console.log(
      `  cluster ${item.cluster}: size=${item.size} electricHits=${item.electric} waterHits=${item.water} -> ${labels[item.cluster]}`,
    )
  }

  const accuracy = await validateModel(labels, result.centroids)
  let final = {
    labels,
    centroids: result.centroids,
    naming,
    method: 'kmeans',
    validationAccuracy: accuracy,
  }

  if (accuracy < MIN_VALIDATION_ACCURACY) {
    console.warn(
      `KMeans validation failed (${(accuracy * 100).toFixed(0)}%). Falling back to supervised category centroids.`,
    )

    const supervised = await supervisedCentroids(services)
    const supervisedAccuracy = await validateModel(
      supervised.labels,
      supervised.centroids,
    )

    if (supervisedAccuracy < MIN_VALIDATION_ACCURACY) {
      throw new Error(
        `Both KMeans and supervised centroids failed validation. Refusing to save a bad model.`,
      )
    }

    final = {
      labels: supervised.labels,
      centroids: supervised.centroids,
      naming: [],
      method: 'centroid',
      validationAccuracy: supervisedAccuracy,
    }

    console.log(
      `Using supervised centroids (${supervised.counts.electric} electric services, ${supervised.counts.water} water services).`,
    )
  }

  if (dryRun) {
    console.log('[dry-run] Not writing label-centroids.json.')
    return
  }

  await saveModel({
    ...final,
    sampleCount: limited.length,
  })

  console.log(
    `Saved label-centroids.json (${limited.length} samples, method=${final.method}).`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fit label clusters failed:', error.message)
    process.exit(1)
  })
