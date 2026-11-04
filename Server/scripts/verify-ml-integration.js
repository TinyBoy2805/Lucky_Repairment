import 'dotenv/config'

process.env.OLLAMA_EMBED_TIMEOUT_MS = '500'
process.env.ML_LABEL_MARGIN = '0.05'

const createdIds = []
let passed = 0
let failed = 0
const failures = []

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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForLabel(firestore, id, timeoutMs = 8000) {
  const started = Date.now()

  while (Date.now() - started < timeoutMs) {
    const doc = await firestore.collection('requests').doc(id).get()
    if (doc.exists && doc.data()?.labelStatus !== 'calculating') {
      return { id, ...doc.data() }
    }
    await delay(150)
  }

  const doc = await firestore.collection('requests').doc(id).get()
  return doc.exists ? { id, ...doc.data() } : null
}

async function waitForRtdbCategory(db, id, timeoutMs = 3000) {
  const started = Date.now()

  while (Date.now() - started < timeoutMs) {
    const snapshot = await db.ref(`requests/${id}`).once('value')
    const category = snapshot.val()?.category
    if (category) return category
    await delay(100)
  }

  return null
}

async function cleanup(firestore, db) {
  for (const id of createdIds) {
    try {
      await firestore.collection('requests').doc(id).delete()
    } catch {}
    try {
      await firestore.collection('bookings').doc(id).delete()
    } catch {}
    try {
      await db.ref(`requests/${id}`).remove()
    } catch {}
  }
}

async function main() {
  const { firestore, db } = await import('../src/config/firebase.js')
  const { createRequest } = await import('../src/services/request.service.js')
  const { seedServicesIfEmpty, listRepairServices } = await import(
    '../src/services/repair-service.service.js'
  )
  const { getLabelQueue, stopLabelWorker } = await import(
    '../src/services/label-queue.service.js'
  )

  const customer = {
    uid: 'verifyMlIntegrationCustomer',
    email: 'verify.ml.integration@example.com',
    displayName: 'Verify ML Customer',
  }

  try {
    await seedServicesIfEmpty()

    section('A1 immediate real label (serviceId)')
    const real = await createRequest(customer, {
      serviceId: 'sua-chap-dien',
      device: 'Sửa chữa điện',
      issue: 'aptomat cứ nhảy, mùi khét',
      address: '1 Test Street',
      phone: '0900000001',
    })
    createdIds.push(real.id)
    check('request is labelled immediately', real.labelStatus === 'done', real.labelStatus)
    check('real label is electric', real.category === 'electric', real.category)
    check('real label source is real', real.labelSource === 'real', real.labelSource)

    section('A1 immediate derived label (device text)')
    const derived = await createRequest(customer, {
      device: 'Sửa Chữa Nước',
      issue: 'thiết bị cần kiểm tra',
      address: '2 Test Street',
      phone: '0900000002',
    })
    createdIds.push(derived.id)
    check('derived label is water', derived.category === 'water', derived.category)
    check('derived label source is derived', derived.labelSource === 'derived', derived.labelSource)

    section('A1 async keyword fallback (Ollama unavailable)')
    const asyncElectric = await createRequest(customer, {
      device: 'Thiết bị khác',
      issue: 'aptomat cứ nhảy, mùi khét',
      address: '3 Test Street',
      phone: '0900000003',
    })
    createdIds.push(asyncElectric.id)
    check(
      'customer request returns without waiting for labeling',
      ['calculating', 'done'].includes(asyncElectric.labelStatus),
      asyncElectric.labelStatus,
    )

    const electricLabelled = await waitForLabel(firestore, asyncElectric.id)
    check('async label completes', electricLabelled?.labelStatus === 'done', electricLabelled?.labelStatus)
    check('async label is electric', electricLabelled?.category === 'electric', electricLabelled?.category)
    check(
      'async label uses the classifier',
      ['model', 'rule'].includes(electricLabelled?.labelSource),
      electricLabelled?.labelSource,
    )

    const rtdbCategory = await waitForRtdbCategory(db, asyncElectric.id)
    check('label is mirrored to RTDB', rtdbCategory === 'electric', rtdbCategory)

    const asyncWater = await createRequest(customer, {
      device: 'Thiết bị khác',
      issue: 'máy bơm không lên nước',
      address: '4 Test Street',
      phone: '0900000004',
    })
    createdIds.push(asyncWater.id)
    const waterLabelled = await waitForLabel(firestore, asyncWater.id)
    check('async label is water', waterLabelled?.category === 'water', waterLabelled?.category)

    section('A3 lexical fallback with empty index')
    const search = await listRepairServices({ search: 'chập điện' })
    check(
      'service search still returns results without an index',
      search.some((service) => service.id === 'sua-chap-dien'),
      search.map((service) => service.id),
    )

    await getLabelQueue().whenIdle()
  } finally {
    await getLabelQueue().whenIdle()
    stopLabelWorker()
    await cleanup(firestore, db)
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) {
    console.log('Failures:')
    for (const failure of failures) console.log(`  - ${failure}`)
    process.exit(1)
  }

  process.exit(0)
}

main().catch((error) => {
  console.error('ML integration verification failed:', error)
  process.exit(1)
})
