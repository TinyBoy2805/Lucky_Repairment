function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createLabelQueue(options = {}) {
  const {
    handler,
    concurrency = 1,
    maxAttempts = 2,
    retryDelayMs = 500,
    onError = () => {},
  } = options

  if (typeof handler !== 'function') {
    throw new Error('createLabelQueue requires a handler function.')
  }

  const pending = []
  const known = new Set()
  let active = 0
  let stopped = false

  async function run(job) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (stopped) return
      try {
        await handler(job.id, { attempt })
        return
      } catch (error) {
        if (attempt >= maxAttempts || stopped) {
          try {
            await onError(error, job.id)
          } catch {}
          return
        }
        await delay(retryDelayMs)
      }
    }
  }

  function drain() {
    while (!stopped && active < concurrency && pending.length > 0) {
      const job = pending.shift()
      active += 1

      run(job).finally(() => {
        active -= 1
        known.delete(job.id)
        drain()
      })
    }
  }

  function enqueue(id) {
    const key = String(id ?? '')
    if (!key || stopped || known.has(key)) return false

    known.add(key)
    pending.push({ id: key })
    drain()
    return true
  }

  function stop() {
    stopped = true
    pending.length = 0
    known.clear()
  }

  function stats() {
    return {
      pending: pending.length,
      active,
      known: known.size,
      stopped,
    }
  }

  function whenIdle() {
    if (!pending.length && !active) return Promise.resolve()
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        if (!pending.length && !active) {
          clearInterval(timer)
          resolve()
        }
      }, 10)
      if (typeof timer.unref === 'function') timer.unref()
    })
  }

  return { enqueue, stop, stats, whenIdle }
}
