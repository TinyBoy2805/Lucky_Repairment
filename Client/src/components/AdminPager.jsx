export default function AdminPager({ page = 1, totalPages = 1, total = 0, onChange }) {
  if (totalPages <= 1) {
    return <p className="pager__single">Có {total} kết quả.</p>
  }

  return (
    <div className="pager">
      <span className="pager__info">
        Trang {page}/{totalPages} · {total} kết quả
      </span>
      <div className="pager__buttons">
        <button
          className="btn btn--outline btn--sm"
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Trước
        </button>
        <button
          className="btn btn--outline btn--sm"
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Sau
        </button>
      </div>
    </div>
  )
}
