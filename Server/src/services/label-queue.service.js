import { createLabelQueue } from './label-queue.core.js'
import {
  applyLabelToRequest,
  findStuckRequestIds,
  markLabelFailed,
} from './request-label.service.js'

let queue = null
let sweeper = null

function getQueue() {
  if (!queue) {
    queue = createLabelQueue({
      handler: (id) => applyLabelToRequest(id),
      concurrency: 1,
      maxAttempts: 2,
      onError: (error, id) => {
        console.warn(`[ml] label job failed for ${id}: ${error.message}`)
        markLabelFailed(id, error).catch(() => {})
      },
    })
  }
  return queue
}

export function enqueueLabelJob(id) {
  return getQueue().enqueue(id)
}

async function sweep() {
  try {
    const ids = await findStuckRequestIds({
      olderThanMs: 2 * 60 * 1000,
      limit: 50,
    })
    for (const id of ids) enqueueLabelJob(id)
  } catch (error) {
    console.warn('[ml] label sweeper failed:', error.message)
  }
}

export function startLabelWorker(options = {}) {
  if (sweeper) return

  const { sweepIntervalMs = 5 * 60 * 1000 } = options
  sweep()
  sweeper = setInterval(sweep, sweepIntervalMs)
  if (typeof sweeper.unref === 'function') sweeper.unref()
}

export function stopLabelWorker() {
  if (sweeper) {
    clearInterval(sweeper)
    sweeper = null
  }
  if (queue) {
    queue.stop()
    queue = null
  }
}

export function getLabelQueue() {
  return getQueue()
}
