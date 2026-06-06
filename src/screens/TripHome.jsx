import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import laender from '../data/laender'
import { Plane, Info, Users, CheckSquare, Wallet, StepBack } from 'lucide-react'

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

  if (tage === 0) return 'Heute geht es los! 🚀'
  if (tage < 0) return 'Reise läuft gerade oder abgeschlossen 🎉'
  return `Noch ${tage} Tage`
  }

  // Gesamtkosten berechnen
  const gesamt = ausgaben.reduce((sum, a) => sum + a.betrag, 0)

  if (laden) return <p style={{ color: '#fff', padding: '20px' }}>Lädt...</p>

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '40px' }}>

      {/* Zurück Button */}
      <button onClick={() => navigate('/')} style={{
        background: 'none', border: 'none', color: '#c9a84c',
        fontSize: '1rem', cursor: 'pointer', marginBottom: '20px', padding: '0',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}><StepBack size={20} /> Zurück</button>

      {/* Hero Bereich */}
      <div style={{
        backgroundColor: '#111827',
        borderRadius: '20px',
        border: '1px solid rgba(201,168,76,0.3)',
        padding: '24px',
        marginBottom: '20px',
      }}>
        <p style={{ color: '#8892a4', fontSize: '0.85rem', margin: '0 0 4px' }}>
          {laender.find(l => l.code === trip.land_code)?.name}
        </p>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
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
        gap: '12px',
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
  padding: '20px',
  cursor: 'pointer',
}

const kachelIconStyle = {
  fontSize: '1.8rem',
  margin: '0 0 8px',
}

const kachelTitelStyle = {
  fontSize: '1rem',
  fontWeight: '600',
  margin: '0 0 4px',
  color: '#ffffff',
}

const kachelSubStyle = {
  fontSize: '0.8rem',
  color: '#8892a4',
  margin: 0,
}

export default TripHome