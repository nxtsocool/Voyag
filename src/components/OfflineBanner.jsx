import useOnlineStatus from '../hooks/useOnlineStatus'
import { useSettings } from '../context/SettingsContext'

// Dezenter, immer sichtbarer Hinweis solange das Gerät offline ist –
// wird global in App.jsx gerendert, unabhängig von der aktuellen Route
export default function OfflineBanner() {
  const online = useOnlineStatus()
  const { t } = useSettings()

  if (online) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      backgroundColor: 'var(--error)', color: '#fff',
      textAlign: 'center',
      padding: 'calc(8px + env(safe-area-inset-top)) 16px 8px',
      fontSize: '0.78rem', fontWeight: '600',
      zIndex: 10000, boxSizing: 'border-box',
      boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
    }}>
      {t('keineVerbindung')}
    </div>
  )
}
