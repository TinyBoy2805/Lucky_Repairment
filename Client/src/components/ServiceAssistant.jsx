import AssistantChat from './AssistantChat.jsx'
import { useAuth } from '../context/useAuth.js'
import { assistantApi } from '../lib/assistant.js'

const SUGGESTIONS = [
  'Giá dịch vụ này bao nhiêu?',
  'Bảo hành bao lâu?',
  'Thời gian có mặt bao lâu?',
]

export default function ServiceAssistant({ service }) {
  const { user } = useAuth()
  const storageKey = service
    ? `lucky_assistant_v1:service:${service.id}:${user?.uid ?? 'guest'}`
    : undefined

  if (!service) return null

  return (
    <div className="assistant-embedded">
      <AssistantChat
        key={storageKey}
        storageKey={storageKey}
        title="Hỏi nhanh về dịch vụ này"
        description="Trợ lý trả lời dựa trên thông tin dịch vụ và chính sách của Lucky Repairment."
        suggestions={SUGGESTIONS}
        onAsk={(question) => assistantApi.serviceChat(service.id, question)}
        placeholder="Ví dụ: dịch vụ này bảo hành bao lâu?"
        embedded
      />
    </div>
  )
}
