import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Info, Users, CheckSquare, Wallet, ChevronLeft, Camera, MapPin } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'

function TripNav({ tripName }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const { t } = useSettings()

  const tabs = [
    { path: `/trip/${id}/info`, label: t('navInfo'), icon: Info },
    { path: `/trip/${id}/orte`, label: t('navOrte'), icon: MapPin },
    { path: `/trip/${id}/personen`, label: t('navPersonen'), icon: Users },
    { path: `/trip/${id}/packliste`, label: t('navPackliste'), icon: CheckSquare },
    { path: `/trip/${id}/kosten`, label: t('navKosten'), icon: Wallet },
    { path: `/trip/${id}/fotos`, label: t('navFotos'), icon: Camera },
  ]

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 clamp(14px, 4vw, 20px)' }}>

      {/* Zurück Button + Trip Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '20px', marginBottom: '20px' }}>
        <button onClick={() => navigate(`/trip/${id}`)} className="btn-press" style={{
          background: 'rgba(201,168,76,0.1)',
          border: '1px solid rgba(201,168,76,0.2)',
          color: '#c9a84c', cursor: 'pointer',
          width: '44px', height: '44px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ChevronLeft size={20} />
        </button>
        <h1 style={{
          fontSize: 'clamp(1rem, 4.5vw, 1.25rem)', fontWeight: '700', margin: 0,
          minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word',
          letterSpacing: '-0.3px',
        }}>{tripName}</h1>
      </div>

      {/* Pill-Style Tab Navigation */}
      <div style={{
        display: 'flex', gap: '6px',
        marginBottom: '20px',
        overflowX: 'auto', paddingBottom: '2px',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
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
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                backgroundColor: aktiv ? '#c9a84c' : '#111827',
                color: aktiv ? '#080d1a' : '#8892a4',
                border: 'none',
                padding: '10px 16px', minHeight: '44px',
                borderRadius: '50px',
                cursor: 'pointer', fontSize: '0.82rem', fontWeight: aktiv ? '700' : '500',
                whiteSpace: 'nowrap', flexShrink: 0, boxSizing: 'border-box',
                boxShadow: aktiv ? '0 4px 16px rgba(201,168,76,0.35)' : '0 2px 8px rgba(0,0,0,0.3)',
                transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default TripNav
