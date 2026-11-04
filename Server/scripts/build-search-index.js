import 'dotenv/config'

import { seedServicesIfEmpty } from '../src/services/repair-service.service.js'
import { rebuildServiceIndex } from '../src/services/search.service.js'

const dryRun = process.argv.includes('--dry-run')

async function main() {
  const services = await seedServicesIfEmpty()
  if (!services.length) {
    console.log('No services found. Nothing to index.')
    return
  }

  if (dryRun) {
    console.log(`[dry-run] Would embed ${services.length} services.`)
    return
  }

  const index = await rebuildServiceIndex(services, {
    onProgress: ({ index: position, total, id }) => {
      if (position % 10 === 0 || position === total) {
        console.log(`  ${position}/${total} ${id}`)
      }
    },
  })

  console.log(
    `Indexed ${Object.keys(index.vectors).length} services (dim ${index.dim}, model ${index.model}).`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Build search index failed:', error.message)
    process.exit(1)
  })
