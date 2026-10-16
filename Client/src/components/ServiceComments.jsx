import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { commentsApi } from '../lib/comments.js'
import { fmtDateTime } from '../lib/format.js'

export default function ServiceComments({ serviceId, user }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form tạo comment mới
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Form trả lời (reply)
  const [activeReplyId, setActiveReplyId] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [replyError, setReplyError] = useState('')

  // Trạng thái xóa
  const [deletingId, setDeletingId] = useState(null)

  const loadComments = async () => {
    try {
      const res = await commentsApi.list(serviceId)
      setComments(res.comments || [])
    } catch (err) {
      setError(err.message || 'Không thể tải bình luận.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!serviceId) return
    loadComments()
  }, [serviceId])

  // Gửi bình luận mới
  const handleCreateComment = async (e) => {
    e.preventDefault()
    const content = newContent.trim()
    if (content.length < 2) {
      setFormError('Nội dung câu hỏi phải có ít nhất 2 ký tự.')
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      const res = await commentsApi.create(serviceId, content)
      setComments((prev) => [{ ...res.comment, replies: [] }, ...prev])
      setNewContent('')
    } catch (err) {
      setFormError(err.message || 'Không thể gửi bình luận. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  // Gửi trả lời
  const handleSendReply = async (parentId) => {
    const content = replyContent.trim()
    if (content.length < 2) {
      setReplyError('Nội dung trả lời phải có ít nhất 2 ký tự.')
      return
    }

    setReplySubmitting(true)
    setReplyError('')
    try {
      const res = await commentsApi.reply(parentId, content)
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replyCount: (c.replyCount || 0) + 1,
              replies: [...(c.replies || []), res.comment],
            }
          }
          return c
        }),
      )
      setActiveReplyId(null)
      setReplyContent('')
    } catch (err) {
      setReplyError(err.message || 'Không thể gửi câu trả lời. Vui lòng thử lại.')
    } finally {
      setReplySubmitting(false)
    }
  }

  // Xóa bình luận hoặc trả lời
  const handleDelete = async (commentId, parentId = null) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá bình luận này?')) return

    setDeletingId(commentId)
    try {
      await commentsApi.remove(commentId)
      if (parentId) {
        // Xóa reply bên trong 1 comment cha
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === parentId) {
              return {
                ...c,
                replyCount: Math.max(0, (c.replyCount || 1) - 1),
                replies: (c.replies || []).filter((r) => r.id !== commentId),
              }
            }
            return c
          }),
        )
      } else {
        // Xóa comment cha
        setComments((prev) => prev.filter((c) => c.id !== commentId))
      }
    } catch (err) {
      alert(err.message || 'Không thể xoá bình luận.')
    } finally {
      setDeletingId(null)
    }
  }

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return <span className="comment-role comment-role--admin">Quản trị viên</span>
    }
    if (role === 'repairman') {
      return <span className="comment-role comment-role--repairman">Thợ kỹ thuật</span>
    }
    return <span className="comment-role comment-role--customer">Khách hàng</span>
  }

  return (
    <section className="service-section-box service-qa-section">
      <div className="service-section-box__header">
        <h2>Hỏi Đáp & Bình Luận ({comments.length})</h2>
        <p>Thắc mắc về dịch vụ sửa chữa này? Hãy để lại câu hỏi để được kỹ thuật viên hỗ trợ nhanh nhất.</p>
      </div>

      {/* Form đăng câu hỏi mới */}
      <div className="qa-form-card">
        {user ? (
          <form onSubmit={handleCreateComment} className="qa-form">
            <div className="qa-form__header">
              <span className="qa-form__user">
                Đặt câu hỏi với tư cách <strong>{user.displayName || user.email}</strong>
              </span>
            </div>
            <div className="field">
              <div className="field__control">
                <textarea
                  rows="3"
                  placeholder="Bạn có câu hỏi hoặc cần tư vấn về dịch vụ này? Đặt câu hỏi tại đây..."
                  value={newContent}
                  onChange={(e) => {
                    setNewContent(e.target.value)
                    setFormError('')
                  }}
                  disabled={submitting}
                />
              </div>
              {formError && <span className="field__error">{formError}</span>}
            </div>
            <div className="qa-form__actions">
              <button
                type="submit"
                className="btn btn--primary btn--sm"
                disabled={submitting || !newContent.trim()}
              >
                {submitting ? 'Đang gửi câu hỏi…' : 'Gửi câu hỏi'}
              </button>
            </div>
          </form>
        ) : (
          <div className="qa-login-prompt">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p>
              Vui lòng <Link to="/login" className="text-brand">đăng nhập</Link> để đặt câu hỏi hoặc trao đổi cùng kỹ thuật viên.
            </p>
          </div>
        )}
      </div>

      {/* Danh sách bình luận */}
      <div className="qa-comments-list">
        {loading ? (
          <p className="card__empty">Đang tải bình luận…</p>
        ) : error ? (
          <div className="alert alert--error">{error}</div>
        ) : comments.length === 0 ? (
          <div className="qa-empty">
            <p>Chưa có câu hỏi nào về dịch vụ này.</p>
            <span>Hãy là người đầu tiên đặt câu hỏi để nhận tư vấn từ kỹ thuật viên!</span>
          </div>
        ) : (
          comments.map((comment) => {
            const isAuthor = user?.uid === comment.authorUid
            const isAdmin = user?.role === 'admin'
            const canDelete = isAuthor || isAdmin
            const isReplying = activeReplyId === comment.id

            return (
              <div key={comment.id} className="qa-comment-item">
                <div className="qa-comment-main">
                  {/* Avatar */}
                  <div className={`qa-avatar qa-avatar--${comment.authorRole || 'customer'}`}>
                    {(comment.authorName || 'U').charAt(0).toUpperCase()}
                  </div>

                  <div className="qa-comment-body">
                    <div className="qa-comment-meta">
                      <span className="qa-author-name">{comment.authorName}</span>
                      {getRoleBadge(comment.authorRole)}
                      <span className="qa-time">{fmtDateTime(comment.createdAt)}</span>
                    </div>

                    <p className="qa-content">{comment.content}</p>

                    <div className="qa-comment-actions">
                      {user && (
                        <button
                          type="button"
                          className="qa-btn-action"
                          onClick={() => {
                            if (isReplying) {
                              setActiveReplyId(null)
                              setReplyContent('')
                            } else {
                              setActiveReplyId(comment.id)
                              setReplyContent('')
                              setReplyError('')
                            }
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <polyline points="9 17 4 12 9 7" />
                            <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                          </svg>
                          {isReplying ? 'Đóng' : 'Trả lời'}
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          className="qa-btn-action qa-btn-action--danger"
                          onClick={() => handleDelete(comment.id)}
                          disabled={deletingId === comment.id}
                        >
                          {deletingId === comment.id ? 'Đang xoá…' : 'Xoá'}
                        </button>
                      )}
                    </div>

                    {/* Inline reply form */}
                    {isReplying && (
                      <div className="qa-reply-form">
                        <textarea
                          rows="2"
                          placeholder={`Trả lời @${comment.authorName}...`}
                          value={replyContent}
                          onChange={(e) => {
                            setReplyContent(e.target.value)
                            setReplyError('')
                          }}
                          disabled={replySubmitting}
                          autoFocus
                        />
                        {replyError && <span className="field__error">{replyError}</span>}
                        <div className="qa-reply-form__actions">
                          <button
                            type="button"
                            className="btn btn--outline btn--sm"
                            onClick={() => {
                              setActiveReplyId(null)
                              setReplyContent('')
                            }}
                            disabled={replySubmitting}
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            onClick={() => handleSendReply(comment.id)}
                            disabled={replySubmitting || !replyContent.trim()}
                          >
                            {replySubmitting ? 'Đang gửi…' : 'Gửi câu trả lời'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Danh sách Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="qa-replies-list">
                        {comment.replies.map((reply) => {
                          const canDeleteReply =
                            user?.uid === reply.authorUid || user?.role === 'admin'

                          return (
                            <div key={reply.id} className="qa-reply-item">
                              <div className={`qa-avatar qa-avatar--sm qa-avatar--${reply.authorRole || 'customer'}`}>
                                {(reply.authorName || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="qa-reply-body">
                                <div className="qa-comment-meta">
                                  <span className="qa-author-name">{reply.authorName}</span>
                                  {getRoleBadge(reply.authorRole)}
                                  <span className="qa-time">{fmtDateTime(reply.createdAt)}</span>
                                </div>
                                <p className="qa-content">{reply.content}</p>
                                {canDeleteReply && (
                                  <div className="qa-comment-actions">
                                    <button
                                      type="button"
                                      className="qa-btn-action qa-btn-action--danger"
                                      onClick={() => handleDelete(reply.id, comment.id)}
                                      disabled={deletingId === reply.id}
                                    >
                                      {deletingId === reply.id ? 'Đang xoá…' : 'Xoá'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
