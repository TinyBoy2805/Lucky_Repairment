import AssistantChat from '../../components/AssistantChat.jsx'
import { useAuth } from '../../context/useAuth.js'
import { assistantApi } from '../../lib/assistant.js'

const SUGGESTIONS = [
  'Có bao nhiêu dịch vụ điện nước?',
  'Dịch vụ nào đắt nhất?',
  'Dịch vụ nào rẻ nhất?',
  'Dịch vụ nào bảo hành dài nhất?',
  'Danh mục sửa chữa nước gồm những gì?',
]

export default function AdminAssistant() {
  const { user } = useAuth()
  const storageKey = `lucky_assistant_v1:admin:${user?.uid ?? 'guest'}`

  return (
    <div className="assistant-page assistant-page--admin">
      <header className="assistant-page__header">
        <span className="assistant-page__badge">Quản trị · Danh mục</span>
        <h1>Trợ lý danh mục dịch vụ</h1>
        <p>
          Hỏi về dịch vụ, danh mục, giá và bảo hành. Trợ lý không truy cập đơn hàng,
          doanh thu hay thông tin khách hàng.
        </p>
      </header>

      <AssistantChat
        key={storageKey}
        storageKey={storageKey}
        title="Hỏi về danh mục"
        description="Ví dụ: dịch vụ nào đắt nhất, bảo hành bao lâu, danh mục nước gồm gì."
        suggestions={SUGGESTIONS}
        onAsk={(question) => assistantApi.adminQuery({ question })}
      />
    </div>
  )
}
