import { useEffect, useState } from 'react'

/**
 * Minimal toast/notification component for Cognira.
 * Usage:
 *   <ToastContainer />
 *   Toast.show({ message: "Hello", duration: 3000, type: "info" })
 */
export type ToastType = 'info' | 'success' | 'warning' | 'regain'

export interface ToastOptions {
  message: string
  duration?: number // ms, default 3000
  type?: ToastType
  action?: { label: string; onClick: () => void }
}

interface ToastInstance extends ToastOptions {
  id: number
}

let toastIdCounter = 0
const listeners: Array<(toasts: ToastInstance[]) => void> = []
let toasts: ToastInstance[] = []

function notify() {
  listeners.forEach((fn) => fn([...toasts]))
}

export const Toast = {
  show(opts: ToastOptions) {
    const id = ++toastIdCounter
    const toast: ToastInstance = {
      id,
      message: opts.message,
      duration: opts.duration ?? 3000,
      type: opts.type ?? 'info',
      action: opts.action,
    }
    toasts = [...toasts, toast]
    notify()
    const duration = toast.duration ?? 3000
    if (duration > 0) {
      setTimeout(() => {
        Toast.dismiss(id)
      }, duration)
    }
    return id
  },
  dismiss(id: number) {
    toasts = toasts.filter((t) => t.id !== id)
    notify()
  },
  subscribe(fn: (toasts: ToastInstance[]) => void) {
    listeners.push(fn)
    fn([...toasts])
    return () => {
      const idx = listeners.indexOf(fn)
      if (idx >= 0) listeners.splice(idx, 1)
    }
  },
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastInstance[]>([])

  useEffect(() => Toast.subscribe(setItems), [])

  if (items.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
        maxWidth: '90vw',
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {items.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

function ToastItem({ toast }: { toast: ToastInstance }) {
  const bgColor =
    toast.type === 'success'
      ? 'var(--accent)'
      : toast.type === 'warning'
      ? 'var(--warning, #F5A623)'
      : toast.type === 'regain'
      ? 'var(--card)'
      : 'var(--ink)'

  const textColor =
    toast.type === 'success' ? 'var(--on-accent)' : toast.type === 'warning' ? '#000' : 'var(--ink)'

  const borderColor = toast.type === 'regain' ? 'var(--accent)' : 'transparent'

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: bgColor,
        color: textColor,
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        boxShadow: 'var(--shadow, 0 4px 12px rgba(0,0,0,0.15))',
        border: `1px solid ${borderColor}`,
        fontFamily: 'var(--font)',
        fontSize: '0.95rem',
        textAlign: 'center',
        maxWidth: '420px',
        animation: 'slideUp 0.3s ease, fadeOut 0.3s ease 2.7s forwards',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick()
            Toast.dismiss(toast.id)
          }}
          style={{
            background: 'transparent',
            border: `1px solid ${textColor}`,
            color: textColor,
            padding: '0.25rem 0.75rem',
            borderRadius: '999px',
            fontSize: '0.8rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  )
}

// Add CSS animation keyframes globally (once)
if (typeof document !== 'undefined' && !document.getElementById('cognira-toast-styles')) {
  const style = document.createElement('style')
  style.id = 'cognira-toast-styles'
  style.textContent = `
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; transform: translateY(-10px); }
    }
  `
  document.head.appendChild(style)
}