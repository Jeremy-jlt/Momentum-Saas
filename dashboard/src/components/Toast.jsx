import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

const DURATIONS = { success: 2000, error: 3000 }
const EXIT_MS = 200

function ToastItem({ toast }) {
  const isError = toast.type === 'error'

  return (
    <div
      className="pointer-events-auto bg-[var(--surface-1)] border-[0.5px] rounded-md px-4 py-3 text-[12px] shadow-lg max-w-xs"
      style={{
        borderColor: isError ? 'var(--danger)' : 'var(--accent)',
        color: isError ? 'var(--danger)' : 'var(--accent)',
        animation: `${toast.leaving ? 'toast-out' : 'toast-in'} 200ms ease-out forwards`,
      }}
    >
      {toast.message}
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`
    const duration = DURATIONS[type] ?? DURATIONS.success

    setToasts((prev) => [...prev, { id, message, type, leaving: false }])

    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, EXIT_MS)
    }, duration - EXIT_MS)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
