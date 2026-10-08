import { firestore } from '../src/config/firebase.js'
import { INITIAL_SERVICES } from '../src/services/repair-service.service.js'

async function main() {
  console.log('🔄 Đang đồng bộ danh sách dịch vụ sửa chữa lên Cloud Firestore (collection "services")...')

  const batch = firestore.batch()
  const colRef = firestore.collection('services')

  for (const s of INITIAL_SERVICES) {
    const docRef = colRef.doc(s.id)
    batch.set(docRef, {
      ...s,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  }

  await batch.commit()

  console.log(
    `✅ Đã nạp thành công ${INITIAL_SERVICES.length} dịch vụ sửa chữa vào collection "services" trên Cloud Firestore!`,
  )
  for (const s of INITIAL_SERVICES) {
    console.log(`   ✔ [${s.category}] document "${s.id}" - ${s.title}`)
  }

  process.exit(0)
}

main().catch((error) => {
  console.error('\n❌ Lỗi khi nạp dịch vụ lên Cloud Firestore:', error.message, '\n')
  process.exit(1)
})
