import { env } from './config/env.js'

try {
  const { createApp } = await import('./app.js')
  const app = createApp()

  app.listen(env.port, () => {
    console.log('')
    console.log('  ✅ Lucky Repair API đang chạy')
    console.log(`     Local:   http://localhost:${env.port}/api/health`)
    console.log(`     CORS:    ${env.clientUrls.join(', ')}`)
    console.log(
      env.adminEmails.length
        ? `     Admin:   ${env.adminEmails.join(', ')}`
        : '     ⚠️  ADMIN_EMAILS đang trống — chưa có ai được quyền admin. Điền vào file .env',
    )
    console.log('')
  })
} catch (error) {
  console.error('\n❌ Không thể khởi động server:\n')
  console.error(error.message, '\n')
  process.exit(1)
}
