import AssistantChat from '../components/AssistantChat.jsx'
import { useAuth } from '../context/useAuth.js'
import { assistantApi } from '../lib/assistant.js'

const SUGGESTIONS = [
  'Sửa bình nóng lạnh giá bao nhiêu?',
  'Bảo hành bao lâu?',
  'Hủy đơn có mất phí không?',
  'Thanh toán bằng cách nào?',
  'Thông tắc bồn cầu mất bao lâu?',
]

export default function Assistant() {
  const { user } = useAuth()
  const storageKey = `lucky_assistant_v1:chat:${user?.uid ?? 'guest'}`

  return (
    <div className="assistant-page">
      <div className="home-container">
        <header className="assistant-page__header">
          <span className="assistant-page__badge">GraphRAG · Cloudflare</span>
          <h1>Trợ lý sửa chữa Lucky Repairment</h1>
          <p>
            Hỏi nhanh về dịch vụ, giá tham khảo, bảo hành, hủy đơn và thanh toán.
            Câu trả lời có kèm nguồn tham khảo.
          </p>
        </header>

        <AssistantChat
          key={storageKey}
          storageKey={storageKey}
          title="Bạn cần hỗ trợ gì?"
          description="Trợ lý chỉ tư vấn thông tin, không thay đổi đơn hàng của bạn."
          suggestions={SUGGESTIONS}
          onAsk={(question) => assistantApi.chat({ question })}
        />

        <p className="assistant-page__note">
          Thông tin giá chỉ mang tính tham khảo. Thợ sẽ khảo sát và báo giá trước khi sửa.
        </p>
      </div>
    </div>
  )
}
