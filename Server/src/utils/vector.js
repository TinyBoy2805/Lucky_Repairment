export function normalizeVector(vector) {
  const values = Array.isArray(vector) ? vector.map((value) => Number(value) || 0) : []
  let sum = 0
  for (const value of values) sum += value * value
  if (!sum || !Number.isFinite(sum)) return values.map(() => 0)
  const length = Math.sqrt(sum)
  return values.map((value) => value / length)
}

export function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return 0
  if (!left.length || left.length !== right.length) return 0

  let dot = 0
  let leftNorm = 0
  let rightNorm = 0

  for (let index = 0; index < left.length; index += 1) {
    const a = Number(left[index]) || 0
    const b = Number(right[index]) || 0
    dot += a * b
    leftNorm += a * a
    rightNorm += b * b
  }

  if (!leftNorm || !rightNorm) return 0
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
}

export function meanVector(vectors) {
  const list = (vectors || []).filter(
    (vector) => Array.isArray(vector) && vector.length > 0,
  )
  if (!list.length) return []

  const size = list[0].length
  const total = new Array(size).fill(0)

  for (const vector of list) {
    for (let index = 0; index < size; index += 1) {
      total[index] += Number(vector[index]) || 0
    }
  }

  return total.map((value) => value / list.length)
}
