import { useNavigate, useLocation } from 'react-router-dom'
import { Plane, Map, Settings } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'

function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useSettings() // Übersetzungsfunktion holen

  const tabs = [
    { path: '/', label: t('reisen'), icon: Plane },
    { path: '/map', label: t('karte'), icon: Map },
    { path: '/settings', label: t('einstellungen'), icon: Settings },
  ]

  return (
    <div style={{
      position: 'fixed',
      bottom: '14px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 28px)',
      maxWidth: '560px',
      backgroundColor: 'var(--card)',
      borderRadius: '26px',
      padding: '6px 8px calc(6px + env(safe-area-inset-bottom))',
      display: 'flex',
      zIndex: 100,
      boxSizing: 'border-box',
      boxShadow: '0 8px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(201,168,76,0.1)',
    }}>
      {tabs.map(tab => {
        const aktiv = location.pathname === tab.path
        const Icon = tab.icon
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="btn-press"
            style={{
              flex: 1,
              backgroundColor: aktiv ? 'rgba(201,168,76,0.1)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: 'calc(6px + env(safe-area-inset-bottom)) 8px 6px',
              minHeight: '56px',
              borderRadius: '20px',
              transition: 'background-color 0.2s ease',
              position: 'relative',
            }}
          >
            <Icon size={22} color={aktiv ? 'var(--gold)' : 'var(--text-sub)'} />
            <span style={{
              fontSize: '10px',
              color: aktiv ? 'var(--gold)' : 'var(--text-sub)',
              fontWeight: aktiv ? '700' : '400',
              letterSpacing: '0.02em',
            }}>
              {tab.label}
            </span>
            {aktiv && (
              <div style={{
                width: '4px', height: '4px',
                borderRadius: '50%',
                backgroundColor: 'var(--gold)',
                marginTop: '1px',
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}

export default BottomNav