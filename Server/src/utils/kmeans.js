function mulberry32(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function squaredDistance(left, right) {
  let total = 0
  for (let index = 0; index < left.length; index += 1) {
    const diff = (Number(left[index]) || 0) - (Number(right[index]) || 0)
    total += diff * diff
  }
  return total
}

function pickCentroids(vectors, k, random) {
  const centroids = [vectors[Math.floor(random() * vectors.length)].slice()]

  while (centroids.length < k) {
    const distances = vectors.map((vector) => {
      let minimum = Infinity
      for (const centroid of centroids) {
        minimum = Math.min(minimum, squaredDistance(vector, centroid))
      }
      return minimum
    })

    const total = distances.reduce((sum, value) => sum + value, 0)
    if (!total || !Number.isFinite(total)) {
      const index = Math.floor(random() * vectors.length)
      centroids.push(vectors[index].slice())
      continue
    }

    let target = random() * total
    let index = 0
    for (; index < distances.length; index += 1) {
      target -= distances[index]
      if (target <= 0) break
    }
    centroids.push(vectors[Math.min(index, vectors.length - 1)].slice())
  }

  return centroids
}

function assign(vectors, centroids) {
  const assignments = new Array(vectors.length)
  let inertia = 0

  for (let index = 0; index < vectors.length; index += 1) {
    let best = 0
    let bestDistance = Infinity
    for (let cluster = 0; cluster < centroids.length; cluster += 1) {
      const distance = squaredDistance(vectors[index], centroids[cluster])
      if (distance < bestDistance) {
        bestDistance = distance
        best = cluster
      }
    }
    assignments[index] = best
    inertia += bestDistance
  }

  return { assignments, inertia }
}

function updateCentroids(vectors, assignments, k) {
  const sums = Array.from({ length: k }, () => null)
  const counts = new Array(k).fill(0)

  for (let index = 0; index < vectors.length; index += 1) {
    const cluster = assignments[index]
    const vector = vectors[index]
    if (!sums[cluster]) sums[cluster] = new Array(vector.length).fill(0)
    for (let position = 0; position < vector.length; position += 1) {
      sums[cluster][position] += Number(vector[position]) || 0
    }
    counts[cluster] += 1
  }

  return sums.map((sum, cluster) => {
    if (!sum || !counts[cluster]) return null
    return sum.map((value) => value / counts[cluster])
  })
}

function runOnce(vectors, k, random, maxIterations) {
  let centroids = pickCentroids(vectors, k, random)
  let assignments = []
  let inertia = 0
  let iterations = 0

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const result = assign(vectors, centroids)
    assignments = result.assignments
    inertia = result.inertia
    iterations = iteration + 1

    const next = updateCentroids(vectors, assignments, k)

    let changed = false
    for (let cluster = 0; cluster < k; cluster += 1) {
      if (!next[cluster]) {
        next[cluster] = vectors[cluster % vectors.length].slice()
      }
      if (squaredDistance(next[cluster], centroids[cluster]) > 1e-12) {
        changed = true
      }
    }

    centroids = next
    if (!changed) break
  }

  return { centroids, assignments, inertia, iterations }
}

export function kmeans(vectors, k, options = {}) {
  const { maxIterations = 100, restarts = 5, seed = 42 } = options
  const data = (vectors || []).filter(
    (vector) => Array.isArray(vector) && vector.length > 0,
  )

  if (!data.length) {
    return { centroids: [], assignments: [], inertia: 0, iterations: 0 }
  }

  const clusters = Math.max(1, Math.min(Math.floor(k) || 1, data.length))
  let best = null

  for (let restart = 0; restart < Math.max(1, restarts); restart += 1) {
    const random = mulberry32(seed + restart)
    const result = runOnce(data, clusters, random, maxIterations)
    if (!best || result.inertia < best.inertia) best = result
  }

  return best
}
