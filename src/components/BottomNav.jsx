import { useNavigate, useLocation } from 'react-router-dom'
import { Plane, Map, Settings } from 'lucide-react'

function BottomNav({ onAdd }) {
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    { path: '/', label: 'Reisen', icon: Plane },
    { path: '/map', label: 'Karte', icon: Map },
    { path: '/settings', label: 'Einstellungen', icon: Settings },
  ]

  return (
    <div style={{
      position: 'fixed', bottom: '0', left: '50%',
      transform: 'translateX(-50%)',
      width: '100%', maxWidth: '600px',
      backgroundColor: '#111827',
      borderTop: '1px solid #c9a84c',
      borderBottom: '1px solid #111827',
      border: '1px solid #c9a84c',
      borderRadius: '15px 15px 0 0',
      padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
      display: 'flex', zIndex: 100,
      boxSizing: 'border-box',
    }}>
      {tabs.map((tab, index) => {
        const aktiv = location.pathname === tab.path
        const Icon = tab.icon

        // Mittlerer Tab = + Button
        if (index === 1) {
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                flex: 1, padding: '12px 0', minHeight: '48px',
                backgroundColor: 'transparent', border: 'none',
                cursor: 'pointer', display: 'flex',
                flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: '4px',
              }}
            >
              <Icon size={20} color={aktiv ? '#c9a84c' : '#8892a4'} />
              <span style={{
                fontSize: '11px',
                color: aktiv ? '#c9a84c' : '#8892a4',
                fontWeight: aktiv ? '600' : '400',
              }}>{tab.label}</span>
            </button>
          )
        }

        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1, padding: '12px 0',
              backgroundColor: 'transparent', border: 'none',
              cursor: 'pointer', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: '4px',
            }}
          >
            <Icon size={20} color={aktiv ? '#c9a84c' : '#8892a4'} />
            <span style={{
              fontSize: '11px',
              color: aktiv ? '#c9a84c' : '#8892a4',
              fontWeight: aktiv ? '600' : '400',
            }}>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default BottomNav