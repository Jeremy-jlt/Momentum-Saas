export default function OfflineBanner({ isOnline }) {
  if (isOnline) return null

  return (
    <div className="bg-[#1a1a1a] border-b border-[#374151] text-center py-2 text-xs text-gray-400">
      📶 Mode hors ligne — tes données seront synchronisées à la reconnexion
    </div>
  )
}
