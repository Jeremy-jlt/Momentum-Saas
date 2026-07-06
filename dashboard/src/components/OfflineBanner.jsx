export default function OfflineBanner({ isOnline }) {
  if (isOnline) return null

  return (
    <div className="bg-[var(--surface-1)] border-b border-[var(--border-strong)] text-center py-2 text-xs text-[var(--text-faint)]">
      📶 Mode hors ligne — tes données seront synchronisées à la reconnexion
    </div>
  )
}
