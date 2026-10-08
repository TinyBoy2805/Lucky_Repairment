export default function LoadingScreen({ label = 'Đang tải...' }) {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <span className="page-loading__spinner" />
      <p>{label}</p>
    </div>
  )
}
