import { useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'

// Wird angezeigt wenn eine Trip-ID ungültig ist, die Reise gelöscht wurde oder
// RLS den Zugriff verweigert – verhindert einen weißen Bildschirm/Absturz beim
// direkten Zugriff auf einen Trip-Unterscreen mit ungültiger ID
export default function TripNichtGefunden() {
  const navigate = useNavigate()
  const { t } = useSettings()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '20px',
        backgroundColor: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '20px', boxShadow: 'var(--shadow)',
      }}>
        <Compass size={32} color="var(--gold)" />
      </div>
      <h2 style={{ margin: '0 0 8px', fontWeight: '800', fontSize: '1.2rem' }}>{t('tripNichtGefundenTitel')}</h2>
      <p style={{ color: 'var(--text-sub)', margin: '0 0 28px', fontSize: '0.92rem', maxWidth: '320px', lineHeight: 1.5 }}>
        {t('tripNichtGefundenText')}
      </p>
      <button onClick={() => navigate('/')} className="btn-press" style={{
        backgroundColor: 'var(--gold)', color: '#0a0f1e', border: 'none',
        padding: '0 24px', minHeight: '48px', borderRadius: '14px', boxSizing: 'border-box',
        cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem',
      }}>
        {t('joinZurueckBtn')}
      </button>
    </div>
  )
}
