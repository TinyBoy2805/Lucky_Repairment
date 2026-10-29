import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const MAX_STORED_MESSAGES = 40

function isStoredMessage(message) {
  return (
    (message?.role === 'user' || message?.role === 'assistant') &&
    typeof message.text === 'string'
  )
}

function loadSessionMessages(storageKey) {
  if (!storageKey) return []

  try {
    const raw = sessionStorage.getItem(storageKey)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(isStoredMessage)
      .slice(-MAX_STORED_MESSAGES)
      .map((message) => ({
        role: message.role,
        text: message.text,
        citations: Array.isArray(message.citations) ? message.citations : [],
        degraded: Boolean(message.degraded),
      }))
  } catch {
    return []
  }
}

function saveSessionMessages(storageKey, messages) {
  if (!storageKey) return

  try {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)),
    )
  } catch {
    // sessionStorage may be unavailable or full.
  }
}

function clearSessionMessages(storageKey) {
  if (!storageKey) return

  try {
    sessionStorage.removeItem(storageKey)
  } catch {
    // Ignore unavailable storage.
  }
}

function Citations({ citations }) {
  if (!citations || citations.length === 0) return null

  return (
    <div className="assistant-citations">
      <span className="assistant-citations__label">Nguồn tham khảo:</span>
      <div className="assistant-citations__list">
        {citations.map((citation, index) =>
          citation.url ? (
            <Link
              key={`${citation.url}-${index}`}
              to={citation.url}
              className="assistant-citation"
            >
              {citation.label}
            </Link>
          ) : (
            <span key={`${citation.label}-${index}`} className="assistant-citation">
              {citation.label}
            </span>
          ),
        )}
      </div>
    </div>
  )
}

function Message({ message }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`assistant-message ${
        isUser ? 'assistant-message--user' : 'assistant-message--bot'
      }`}
    >
      {!isUser && <span className="assistant-avatar">AI</span>}
      <div className="assistant-message__content">
        <div className="assistant-bubble">
          {message.text.split('\n').map((line, index) => (
            <span key={index}>
              {line}
              {index < message.text.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>
        {!isUser && <Citations citations={message.citations} />}
        {!isUser && message.degraded && (
          <span className="assistant-degraded">Câu trả lời tham khảo</span>
        )}
      </div>
    </div>
  )
}

export default function AssistantChat({
  title = 'Trợ lý sửa chữa',
  description = 'Hỏi về dịch vụ, giá, bảo hành, hủy đơn hoặc thanh toán.',
  suggestions = [],
  onAsk,
  placeholder = 'Nhập câu hỏi của bạn...',
  emptyText = 'Chọn một câu hỏi gợi ý hoặc nhập câu hỏi để bắt đầu.',
  embedded = false,
  storageKey,
}) {
  const [messages, setMessages] = useState(() => loadSessionMessages(storageKey))
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    if (messages.length === 0) {
      clearSessionMessages(storageKey)
      return
    }

    saveSessionMessages(storageKey, messages)
  }, [messages, storageKey])

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, busy])

  const clearConversation = () => {
    setMessages([])
    clearSessionMessages(storageKey)
  }

  const ask = async (question) => {
    const value = String(question ?? '').trim()
    if (!value || busy) return

    setMessages((previous) => [...previous, { role: 'user', text: value }])
    setInput('')
    setBusy(true)

    try {
      const data = await onAsk(value)
      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          text: data?.answer || 'Mình chưa có câu trả lời cho câu hỏi này.',
          citations: data?.citations ?? [],
          degraded: Boolean(data?.degraded),
        },
      ])
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          text:
            error?.message ||
            'Trợ lý đang tạm thời không phản hồi. Bạn vui lòng thử lại sau.',
          degraded: true,
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    ask(input)
  }

  return (
    <section className={`assistant-chat ${embedded ? 'assistant-chat--embedded' : ''}`}>
      <header className="assistant-chat__header">
        <div className="assistant-chat__heading">
          <h2 className="assistant-chat__title">{title}</h2>
          <p className="assistant-chat__desc">{description}</p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            className="assistant-chat__reset"
            onClick={clearConversation}
            disabled={busy}
          >
            Xóa hội thoại
          </button>
        )}
      </header>

      <div className="assistant-messages" ref={listRef} aria-live="polite">
        {messages.length === 0 && (
          <p className="assistant-empty">{emptyText}</p>
        )}
        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}
        {busy && (
          <div className="assistant-message assistant-message--bot">
            <span className="assistant-avatar">AI</span>
            <div className="assistant-bubble assistant-bubble--typing">
              Đang tìm câu trả lời...
            </div>
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="assistant-suggestions">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="assistant-suggestion"
              onClick={() => ask(suggestion)}
              disabled={busy}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form className="assistant-composer" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={placeholder}
          maxLength={1000}
          disabled={busy}
          aria-label="Câu hỏi"
        />
        <button
          type="submit"
          className="btn btn--primary"
          disabled={busy || !input.trim()}
        >
          {busy ? 'Đang trả lời...' : 'Gửi'}
        </button>
      </form>
    </section>
  )
}
