import { useEffect } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

// Toast Typen mit Farben und Icons
const toastConfig = {
  success: { farbe: '#4caf50', hintergrund: 'rgba(76,175,80,0.1)', border: 'rgba(76,175,80,0.2)', Icon: CheckCircle },
  error: { farbe: '#e94560', hintergrund: 'rgba(233,69,96,0.1)', border: 'rgba(233,69,96,0.2)', Icon: XCircle },
  info: { farbe: 'var(--gold)', hintergrund: 'rgba(201,168,76,0.1)', border: 'rgba(201,168,76,0.2)', Icon: Info },
}

export default function Toast({ toasts, setToasts }) {
  return (
    <div style={{
      position: 'fixed', bottom: '90px', left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex',
      flexDirection: 'column', gap: '8px',
      width: 'calc(100% - 40px)', maxWidth: '400px',
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => {
        const config = toastConfig[toast.typ] || toastConfig.info
        const { Icon } = config
        return (
          <div
            key={toast.id}
            style={{
              backgroundColor: 'var(--card)',
              border: `1px solid ${config.border}`,
              borderRadius: '16px',
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              pointerEvents: 'all',
              animation: 'toastIn 0.3s ease forwards',
            }}
          >
            {/* Icon */}
            <Icon size={20} color={config.farbe} style={{ flexShrink: 0 }} />

            {/* Nachricht */}
            <p style={{
              margin: 0, flex: 1, fontSize: '0.9rem',
              fontWeight: '600', color: 'var(--text)',
            }}>
              {toast.nachricht}
            </p>

            {/* Schließen Button – min. 44x44px Touch-Target (Apple HIG) */}
            <button
              onClick={() => setToasts(t => t.filter(t => t.id !== toast.id))}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-sub)', cursor: 'pointer',
                flexShrink: 0,
                width: '44px', height: '44px', margin: '-12px -4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}