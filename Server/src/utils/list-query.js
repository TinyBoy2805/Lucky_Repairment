const MAX_PAGE_SIZE = 100

export function readListQuery(query = {}) {
  const search = String(query.search ?? '').trim()
  const sort = query.sort ? String(query.sort) : undefined
  const order = query.order === 'asc' || query.order === 'desc' ? query.order : undefined

  const page = Number.parseInt(query.page, 10)
  const pageSize = Number.parseInt(query.pageSize, 10)
  const paginated =
    Number.isInteger(page) && page > 0 && Number.isInteger(pageSize) && pageSize > 0

  return {
    search,
    sort,
    order,
    paginated,
    page: paginated ? page : 1,
    pageSize: paginated ? Math.min(pageSize, MAX_PAGE_SIZE) : 0,
  }
}

export function matchesSearch(item, fields, search) {
  if (!search) return true
  const needle = search.toLowerCase()
  return fields.some((field) =>
    String(item[field] ?? '')
      .toLowerCase()
      .includes(needle),
  )
}

export function sortList(items, sort, order, fallbackField = 'createdAt', fallbackOrder = 'desc') {
  const field = sort || fallbackField
  const factor = (order || fallbackOrder) === 'asc' ? 1 : -1

  return [...items].sort((a, b) => {
    const av = a[field]
    const bv = b[field]

    if (av == null && bv == null) return 0
    if (av == null) return -factor
    if (bv == null) return factor

    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor
    return String(av).localeCompare(String(bv), 'vi') * factor
  })
}

export function paginate(items, query) {
  const total = items.length

  if (!query.paginated) {
    return { items, total, page: 1, pageSize: total, totalPages: 1 }
  }

  const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
  const start = (query.page - 1) * query.pageSize

  return {
    items: items.slice(start, start + query.pageSize),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages,
  }
}

export function parseRange(query = {}) {
  const from = Number.parseInt(query.from, 10)
  const to = Number.parseInt(query.to, 10)
  return {
    from: Number.isFinite(from) ? from : undefined,
    to: Number.isFinite(to) ? to : undefined,
  }
}

export function withinRange(value, { from, to }) {
  const time = Number(value) || 0
  if (from !== undefined && time < from) return false
  if (to !== undefined && time > to) return false
  return true
}
