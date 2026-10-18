export default function Loading() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="skeleton" style={{ height: 36, width: 220 }} />
      <div className="skeleton" style={{ height: 360 }} />
    </div>
  )
}