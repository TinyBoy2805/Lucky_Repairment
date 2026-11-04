function toList(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return Object.values(value)
  return []
}

export function buildServiceText(service = {}) {
  const signs = toList(service.signs)
    .map((item) => {
      if (typeof item === 'string') return item
      return item?.text || item?.label || ''
    })
    .filter(Boolean)

  const priceList = toList(service.priceList)
    .map((item) => {
      if (typeof item === 'string') return item
      return [item?.item, item?.price].filter(Boolean).join(' ')
    })
    .filter(Boolean)

  return [
    service.title,
    service.categoryName,
    service.shortDesc,
    service.description,
    signs.join(' '),
    priceList.join(' '),
  ]
    .filter(Boolean)
    .join('\n')
    .trim()
}
