import 'dotenv/config'

import { db } from '../src/config/firebase.js'
import { applyLabelToRequest } from '../src/services/request-label.service.js'

const dryRun = process.argv.includes('--dry-run')

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

function needsLabel(request) {
  if (request.labelStatus === 'done' && request.category) return false
  return !request.category || request.category === 'unknown'
}

async function main() {
  const limit = Number(argValue('limit'))
  let requests = (await readRequests()).filter(needsLabel)

  if (Number.isFinite(limit) && limit > 0) requests = requests.slice(0, limit)

  console.log(
    `${requests.length} requests need labels${dryRun ? ' (dry-run)' : ''}.`,
  )

  if (dryRun) {
    for (const request of requests.slice(0, 10)) {
      console.log(`  #${request.id} ${String(request.issue || '').slice(0, 80)}`)
    }
    if (requests.length > 10) console.log(`  ... and ${requests.length - 10} more`)
    return
  }

  const counts = { done: 0, failed: 0, skipped: 0 }

  for (let index = 0; index < requests.length; index += 1) {
    const request = requests[index]
    try {
      const result = await applyLabelToRequest(request.id)
      if (!result) counts.skipped += 1
      else if (result.labelStatus === 'done') counts.done += 1
      else counts.failed += 1
    } catch (error) {
      counts.failed += 1
      console.warn(`  #${request.id} failed: ${error.message}`)
    }

    if ((index + 1) % 25 === 0 || index === requests.length - 1) {
      console.log(`  processed ${index + 1}/${requests.length}`)
    }
  }

  console.log(
    `Done: ${counts.done} labelled, ${counts.failed} failed, ${counts.skipped} skipped.`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Backfill labels failed:', error.message)
    process.exit(1)
  })
