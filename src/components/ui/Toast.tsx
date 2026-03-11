import { useState, useEffect, useCallback, useRef } from 'react'

type ToastType = 'info' | 'success' | 'error' | 'warning'

interface ToastItem { id: number; msg: string; type: ToastType }

let _addToast: ((msg: string, type: ToastType) => void) | null = null

export function toast(msg: string, type: ToastType = 'info'): void {
  _addToast?.(msg, type)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  _addToast = useCallback((msg: string, type: ToastType) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  if (!toasts.length) return null
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' && <span>✓</span>}
          {t.type === 'error'   && <span>✕</span>}
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: number
}

export function Modal({ open, onClose, title, children, maxWidth = 480 }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
