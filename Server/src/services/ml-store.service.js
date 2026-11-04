import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const SERVICE_VECTORS_FILE = 'service-vectors.json'
const LABEL_MODEL_FILE = 'label-centroids.json'

const cache = {
  serviceVectors: { mtime: 0, data: null },
  labelModel: { mtime: 0, data: null },
}

function dataDir() {
  const configured = process.env.ML_DATA_DIR
  return configured
    ? path.resolve(configured)
    : path.resolve(process.cwd(), 'data', 'ml')
}

function filePath(name) {
  return path.join(dataDir(), name)
}

function ensureDir() {
  mkdirSync(dataDir(), { recursive: true })
}

function readJson(name, fallback) {
  try {
    return JSON.parse(readFileSync(filePath(name), 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(name, value) {
  ensureDir()
  const target = filePath(name)
  const temp = `${target}.tmp`
  const body = JSON.stringify(value)

  try {
    writeFileSync(temp, body)
    renameSync(temp, target)
  } catch {
    writeFileSync(target, body)
  }

  return value
}

function modifiedAt(name) {
  try {
    return statSync(filePath(name)).mtimeMs
  } catch {
    return 0
  }
}

function emptyServiceVectors() {
  return { model: '', dim: 0, updatedAt: 0, vectors: {} }
}

function emptyLabelModel() {
  return {
    model: '',
    dim: 0,
    k: 0,
    labels: [],
    centroids: [],
    naming: [],
    sampleCount: 0,
    updatedAt: 0,
  }
}

export async function loadServiceVectors() {
  const mtime = modifiedAt(SERVICE_VECTORS_FILE)
  if (cache.serviceVectors.data && cache.serviceVectors.mtime === mtime) {
    return cache.serviceVectors.data
  }

  const raw = readJson(SERVICE_VECTORS_FILE, emptyServiceVectors())
  const data = {
    ...emptyServiceVectors(),
    ...raw,
    vectors: raw?.vectors && typeof raw.vectors === 'object' ? raw.vectors : {},
  }

  cache.serviceVectors = { mtime, data }
  return data
}

export async function saveServiceVectors(data) {
  const value = {
    ...emptyServiceVectors(),
    ...data,
    vectors: data?.vectors && typeof data.vectors === 'object' ? data.vectors : {},
  }
  writeJson(SERVICE_VECTORS_FILE, value)
  cache.serviceVectors = { mtime: modifiedAt(SERVICE_VECTORS_FILE), data: value }
  return value
}

export async function loadLabelModel() {
  const mtime = modifiedAt(LABEL_MODEL_FILE)
  if (cache.labelModel.data && cache.labelModel.mtime === mtime) {
    return cache.labelModel.data
  }

  const raw = readJson(LABEL_MODEL_FILE, emptyLabelModel())
  const data = {
    ...emptyLabelModel(),
    ...raw,
    labels: Array.isArray(raw?.labels) ? raw.labels : [],
    centroids: Array.isArray(raw?.centroids) ? raw.centroids : [],
    naming: Array.isArray(raw?.naming) ? raw.naming : [],
  }

  cache.labelModel = { mtime, data }
  return data
}

export async function saveLabelModel(data) {
  const value = {
    ...emptyLabelModel(),
    ...data,
    labels: Array.isArray(data?.labels) ? data.labels : [],
    centroids: Array.isArray(data?.centroids) ? data.centroids : [],
    naming: Array.isArray(data?.naming) ? data.naming : [],
  }
  writeJson(LABEL_MODEL_FILE, value)
  cache.labelModel = { mtime: modifiedAt(LABEL_MODEL_FILE), data: value }
  return value
}

export function resetMlStoreCache() {
  cache.serviceVectors = { mtime: 0, data: null }
  cache.labelModel = { mtime: 0, data: null }
}

export function mlDataPaths() {
  return {
    dir: dataDir(),
    serviceVectors: filePath(SERVICE_VECTORS_FILE),
    labelModel: filePath(LABEL_MODEL_FILE),
  }
}
