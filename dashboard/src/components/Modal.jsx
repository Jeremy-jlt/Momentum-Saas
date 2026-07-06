export default function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-6 max-w-sm w-full">
        {children}
      </div>
    </div>
  )
}
