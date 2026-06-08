import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import laender from '../data/laender'
import { Plane, Info, Users, CheckSquare, Wallet, StepBack, Rocket, PartyPopper  } from 'lucide-react'

function TripHome() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [trip, setTrip] = useState(null)
  const [teilnehmer, setTeilnehmer] = useState([])
  const [ausgaben, setAusgaben] = useState([])
  const [packliste, setPackliste] = useState([])
  const [laden, setLaden] = useState(true)

  useEffect(() => {
  const datenLaden = async () => {
    const { data: tripData } = await supabase
      .from('trips').select('*').eq('id', id).single()
    setTrip(tripData)

    const { data: teilnehmerData } = await supabase
      .from('teilnehmer').select('*').eq('trip_id', id)
    setTeilnehmer(teilnehmerData || [])

    const { data: ausgabenData } = await supabase
      .from('ausgaben').select('*').eq('trip_id', id)
    setAusgaben(ausgabenData || [])

    // Packliste aus Supabase laden
    const { data: packlisteData } = await supabase
      .from('packliste').select('*').eq('trip_id', id)
    setPackliste(packlisteData || [])

    setLaden(false)
  }
  datenLaden()
  }, [id])

  // Countdown berechnen
  const countdown = () => {
  if (!trip?.datum) return null

  // Datum aus Text extrahieren z.B. "12.07.2025 - 19.07.2025"
  const startTeil = trip.datum.split(' - ')[0] // "12.07.2025"
  const teile = startTeil.split('.') // ["12", "07", "2025"]

  if (teile.length < 3) return trip.datum // Fallback für alte Trips ohne Jahr

  // Datum zusammenbauen
  const start = new Date(`${teile[2]}-${teile[1]}-${teile[0]}`)

  const heute = new Date()
  const tage = Math.ceil((start - heute) / (1000 * 60 * 60 * 24))

  if (tage === 0) return 
    <span style={{ color: '#c9a84c', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
      Heute geht's los! <Rocket size={18} />
    </span>
  if (tage < 0) return (
    <span style={{ color: '#c9a84c', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
      Reise läuft oder abgeschlossen! <PartyPopper size={18} />
    </span>
  )
  return `Noch ${tage} Tage`
  }

  // Gesamtkosten berechnen
  const gesamt = ausgaben.reduce((sum, a) => sum + a.betrag, 0)

  if (laden) return <p style={{ color: '#fff', padding: '20px' }}>Lädt...</p>

  return (
    <div style={{ padding: 'clamp(14px, 4vw, 20px)', maxWidth: '600px', margin: '0 auto', paddingBottom: '40px', boxSizing: 'border-box' }}>

      {/* Zurück Button */}
      <button onClick={() => navigate('/')} style={{
        background: 'none', border: 'none', color: '#c9a84c',
        fontSize: '1rem', cursor: 'pointer', marginBottom: '12px',
        padding: '10px 0', minHeight: '44px',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}><StepBack size={20} /> Zurück</button>

      {/* Hero Bereich */}
      <div style={{
        backgroundColor: '#111827',
        borderRadius: '20px',
        border: '1px solid rgba(201,168,76,0.3)',
        padding: 'clamp(18px, 5vw, 24px)',
        marginBottom: '20px',
        boxSizing: 'border-box',
      }}>
        <p style={{ color: '#8892a4', fontSize: '0.85rem', margin: '0 0 4px' }}>
          {laender.find(l => l.code === trip.land_code)?.name}
        </p>
        <h1 style={{
          fontSize: 'clamp(1.4rem, 6vw, 1.8rem)', fontWeight: '700', margin: '0 0 4px',
          letterSpacing: '-0.5px', overflowWrap: 'break-word', wordBreak: 'break-word',
        }}>
          {trip.name}
        </h1>
        <p style={{ color: '#8892a4', margin: '0 0 16px', fontSize: '0.9rem' }}>
          {trip.datum}
        </p>

        {/* Countdown */}
        <div style={{
          backgroundColor: '#1a2235',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'inline-block',
        }}>
          <p style={{ color: '#c9a84c', fontWeight: '600', margin: 0, fontSize: '0.9rem' }}>
        {countdown() || trip.datum}
        </p>
        </div>
      </div>

      {/* Navigation Kacheln */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'clamp(8px, 3vw, 12px)',
      }}>

        {/* Info */}
        <div onClick={() => navigate(`/trip/${id}/info`)} style={kachelStyle}>
        <Info size={28} color="#c9a84c" style={{ marginBottom: '10px' }} />
        <p style={kachelTitelStyle}>Info</p>
        <p style={kachelSubStyle}>Flug, Hotel & Links</p>
        </div>

        {/* Personen */}
        <div onClick={() => navigate(`/trip/${id}/personen`)} style={kachelStyle}>
        <Users size={28} color="#c9a84c" style={{ marginBottom: '10px' }} />
        <p style={kachelTitelStyle}>Personen</p>
        <p style={kachelSubStyle}>{teilnehmer.length} Teilnehmer</p>
        </div>

        {/* Packliste */}
        <div onClick={() => navigate(`/trip/${id}/packliste`)} style={kachelStyle}>
        <CheckSquare size={28} color="#c9a84c" style={{ marginBottom: '10px' }} />
        <p style={kachelTitelStyle}>Packliste</p>
        <p style={kachelSubStyle}>
            {packliste.filter(i => i.erledigt).length}/{packliste.length} gepackt
        </p>
        </div>

        {/* Kosten */}
        <div onClick={() => navigate(`/trip/${id}/kosten`)} style={kachelStyle}>
        <Wallet size={28} color="#c9a84c" style={{ marginBottom: '10px' }} />
        <p style={kachelTitelStyle}>Kosten</p>
        <p style={kachelSubStyle}>{gesamt.toFixed(2)}€ ausgegeben</p>
        </div>

      </div>
    </div>
  )
}

const kachelStyle = {
  backgroundColor: '#111827',
  borderRadius: '16px',
  border: '1px solid rgba(201,168,76,0.15)',
  padding: 'clamp(14px, 4vw, 20px)',
  minHeight: '44px',
  cursor: 'pointer',
  boxSizing: 'border-box',
}

const kachelIconStyle = {
  fontSize: '1.8rem',
  margin: '0 0 8px',
}

const kachelTitelStyle = {
  fontSize: 'clamp(0.9rem, 3.5vw, 1rem)',
  fontWeight: '600',
  margin: '0 0 4px',
  color: '#ffffff',
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
}

const kachelSubStyle = {
  fontSize: 'clamp(0.75rem, 3vw, 0.8rem)',
  color: '#8892a4',
  margin: 0,
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
}

export default TripHome