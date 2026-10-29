import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { firestore, db } from '../src/config/firebase.js'
import { INITIAL_SERVICES } from '../src/services/repair-service.service.js'

const GRAPHRAG_DIR = fileURLToPath(new URL('../../GraphRAG/', import.meta.url))
const INPUT_DIR = path.join(GRAPHRAG_DIR, 'input')
const OUTPUT_DIR = path.join(GRAPHRAG_DIR, 'output')
const POLICIES_FILE = path.join(GRAPHRAG_DIR, 'policies.md')
const dryRun = process.argv.includes('--dry-run')

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} quá thời gian chờ`)), ms),
    ),
  ])

const norm = (value) => String(value ?? '').trim()
const toList = (value) => {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  return Object.values(value)
}

const formatVnd = (value) => {
  const amount = Number(value)
  if (!amount) return ''
  return `${amount.toLocaleString('vi-VN')} VNĐ`
}

function serviceText(service) {
  const signs = toList(service.signs)
    .map((item) => (typeof item === 'string' ? item : item?.text ?? item?.label ?? ''))
    .filter(Boolean)
  const processSteps = toList(service.process)
    .map((step, index) => {
      if (typeof step === 'string') return `${index + 1}. ${step}`
      return `${step.step ?? index + 1}. ${step.title ?? ''}${step.desc ? `: ${step.desc}` : ''}`
    })
    .filter(Boolean)
  const priceList = toList(service.priceList)
    .map((item) => {
      if (typeof item === 'string') return item
      const unit = item.unit ? ` / ${item.unit}` : ''
      return `${item.item ?? ''}${unit}: ${item.price ?? ''}`
    })
    .filter(Boolean)

  return [
    `[service:${service.id}]`,
    `Dịch vụ: ${service.title}`,
    `Danh mục: ${service.categoryName || service.category || ''}`,
    `Giá tham khảo: ${service.priceDisplay || formatVnd(service.startingPrice)}`,
    service.responseTime ? `Thời gian có mặt: ${service.responseTime}` : '',
    service.warranty ? `Bảo hành: ${service.warranty}` : '',
    service.shortDesc ? `Mô tả ngắn: ${service.shortDesc}` : '',
    service.description ? `Mô tả: ${service.description}` : '',
    signs.length ? `Dấu hiệu cần sửa:\n- ${signs.join('\n- ')}` : '',
    priceList.length ? `Bảng giá tham khảo:\n- ${priceList.join('\n- ')}` : '',
    processSteps.length ? `Quy trình:\n${processSteps.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function categoryText(category, serviceCount) {
  return [
    `[category:${category.id}]`,
    `Danh mục: ${category.name}`,
    category.description ? `Mô tả: ${category.description}` : '',
    `Số dịch vụ: ${serviceCount}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function parsePolicies() {
  let source = ''
  try {
    source = readFileSync(POLICIES_FILE, 'utf8')
  } catch {
    return []
  }

  return source
    .split(/^## /m)
    .slice(1)
    .map((section) => {
      const [heading, ...rest] = section.split('\n')
      const match = heading.match(/^\[policy:([a-z0-9-]+)\]\s*(.+)$/i)
      if (!match) return null

      const [, id, title] = match
      const body = rest.join('\n').trim()
      return {
        id,
        title: title.trim(),
        text: `[policy:${id}]\nChính sách: ${title.trim()}\n\n${body}`,
      }
    })
    .filter(Boolean)
}

async function loadServices() {
  try {
    const snapshot = await withTimeout(
      firestore.collection('services').get(),
      15000,
      'Firestore services',
    )
    if (!snapshot.empty) {
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }
  } catch (error) {
    console.warn('[export-assistant] Không đọc được Firestore services:', error.message)
  }

  return INITIAL_SERVICES.map((service) => ({ ...service }))
}

async function loadCategories(services) {
  try {
    const snapshot = await withTimeout(
      db.ref('categories').once('value'),
      15000,
      'RTDB categories',
    )
    if (snapshot.exists()) {
      const categories = Object.entries(snapshot.val())
        .filter(([id]) => id !== '_schema')
        .map(([id, data]) => ({ id, ...data }))
      if (categories.length > 0) return categories
    }
  } catch (error) {
    console.warn('[export-assistant] Không đọc được RTDB categories:', error.message)
  }

  const labels = new Map()
  for (const service of services) {
    if (!service.category) continue
    labels.set(service.category, service.categoryName || service.category)
  }

  return [...labels.entries()].map(([id, name]) => ({ id, name, description: '' }))
}

async function main() {
  const services = await loadServices()
  const categories = await loadCategories(services)
  const policies = parsePolicies()

  const documents = []
  const sources = { services: {}, categories: {}, policies: {} }

  for (const service of services) {
    documents.push({
      id: `service-${service.id}`,
      title: service.title,
      text: serviceText(service),
    })
    sources.services[service.id] = {
      title: service.title,
      url: `/services/${service.id}`,
      summary: service.shortDesc || service.description || '',
      categoryName: service.categoryName || service.category || '',
      priceDisplay: service.priceDisplay || formatVnd(service.startingPrice),
      responseTime: service.responseTime || '',
      warranty: service.warranty || '',
    }
  }

  for (const category of categories) {
    const count = services.filter((service) => service.category === category.id).length
    documents.push({
      id: `category-${category.id}`,
      title: category.name,
      text: categoryText(category, count),
    })
    sources.categories[category.id] = {
      title: category.name,
      url: '/services',
      summary: category.description || '',
    }
  }

  for (const policy of policies) {
    documents.push({
      id: `policy-${policy.id}`,
      title: policy.title,
      text: policy.text,
    })
    sources.policies[policy.id] = {
      title: policy.title,
      url: null,
      summary: '',
    }
  }

  const dataHash = createHash('sha256')
    .update(JSON.stringify(documents))
    .digest('hex')
  const manifest = {
    generatedAt: new Date().toISOString(),
    dataHash,
    counts: {
      services: services.length,
      categories: categories.length,
      policies: policies.length,
      documents: documents.length,
    },
  }

  const summary = {
    dryRun,
    manifest,
    services: services.map((service) => service.id),
    categories: categories.map((category) => category.id),
    policies: policies.map((policy) => policy.id),
  }

  if (dryRun) {
    console.log(JSON.stringify(summary, null, 2))
    process.exit(0)
  }

  mkdirSync(INPUT_DIR, { recursive: true })
  mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(
    path.join(INPUT_DIR, 'documents.json'),
    `${JSON.stringify(documents, null, 2)}\n`,
    'utf8',
  )
  writeFileSync(
    path.join(INPUT_DIR, 'sources.json'),
    `${JSON.stringify(sources, null, 2)}\n`,
    'utf8',
  )
  writeFileSync(
    path.join(INPUT_DIR, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  )

  console.log('[export-assistant] Đã xuất dữ liệu GraphRAG:')
  console.log(JSON.stringify(summary.manifest, null, 2))
  process.exit(0)
}

main().catch((error) => {
  console.error('[export-assistant] Lỗi:', error)
  process.exit(1)
})
