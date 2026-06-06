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
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 20px 0' }}>

      {/* Zurück Button + Trip Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => navigate(`/trip/${id}`)} style={{
          background: 'none', border: 'none', color: '#c9a84c',
          fontSize: '1rem', cursor: 'pointer', padding: '0',
            display: 'flex', alignItems: 'center', gap: '6px',
        }}><StepBack size={20} /></button>
        <h1 style={{ fontSize: '1.3rem', fontWeight: '700', margin: 0 }}>{tripName}
            
        </h1>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '20px',
        overflowX: 'auto', paddingBottom: '4px',
      }}>
        {tabs.map(tab => {
          const aktiv = location.pathname === tab.path
          const Icon = tab.icon
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: aktiv ? '#c9a84c' : '#111827',
                color: aktiv ? '#0a0f1e' : '#8892a4',
                border: '1px solid rgba(201,168,76,0.3)',
                padding: '8px 14px', borderRadius: '12px',
                cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
                whiteSpace: 'nowrap', flexShrink: 0,
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