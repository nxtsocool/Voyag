import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Info, Users, CheckSquare, Wallet, StepBack } from 'lucide-react'

function TripNav({ tripName }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()

  const tabs = [
    { path: `/trip/${id}/info`, label: 'Info', icon: Info },
    { path: `/trip/${id}/personen`, label: 'Personen', icon: Users },
    { path: `/trip/${id}/packliste`, label: 'Packliste', icon: CheckSquare },
    { path: `/trip/${id}/kosten`, label: 'Kosten', icon: Wallet },
  ]

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: 'clamp(14px, 4vw, 20px) clamp(14px, 4vw, 20px) 0' }}>

      {/* Zurück Button + Trip Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <button onClick={() => navigate(`/trip/${id}`)} style={{
          background: 'none', border: 'none', color: '#c9a84c',
          fontSize: '1rem', cursor: 'pointer', padding: '10px',
          margin: '-10px 0', minWidth: '44px', minHeight: '44px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}><StepBack size={20} /></button>
        <h1 style={{
          fontSize: 'clamp(1.05rem, 4.5vw, 1.3rem)', fontWeight: '700', margin: 0,
          minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word',
        }}>{tripName}</h1>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '20px',
        overflowX: 'auto', paddingBottom: '4px',
        WebkitOverflowScrolling: 'touch',
      }}>
        {tabs.map(tab => {
          const aktiv = location.pathname === tab.path
          const Icon = tab.icon
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                backgroundColor: aktiv ? '#c9a84c' : '#111827',
                color: aktiv ? '#0a0f1e' : '#8892a4',
                border: '1px solid rgba(201,168,76,0.3)',
                padding: '12px 16px', minHeight: '44px', borderRadius: '12px',
                cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
                whiteSpace: 'nowrap', flexShrink: 0, boxSizing: 'border-box',
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default TripNav