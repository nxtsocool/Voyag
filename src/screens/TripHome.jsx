import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import laender from '../data/laender'
import { ChevronLeft, Info, Users, CheckSquare, Wallet, Camera, Rocket, PartyPopper } from 'lucide-react'

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

  // Countdown in Tagen berechnen
  const getCountdownTage = () => {
    if (!trip?.datum) return null
    const startTeil = trip.datum.split(' - ')[0]
    const teile = startTeil.split('.')
    if (teile.length < 3) return null
    const start = new Date(`${teile[2]}-${teile[1]}-${teile[0]}`)
    const heute = new Date()
    return Math.ceil((start - heute) / (1000 * 60 * 60 * 24))
  }

  const tage = getCountdownTage()

  // Gesamtkosten berechnen
  const gesamt = ausgaben.reduce((sum, a) => sum + a.betrag, 0)

  // Packliste Fortschritt
  const packlisteErledigt = packliste.filter(i => i.erledigt).length
  const packlisteProzent = packliste.length > 0
    ? Math.round((packlisteErledigt / packliste.length) * 100)
    : 0

  if (laden) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="skeleton" style={{ width: '200px', height: '24px', borderRadius: '12px' }} />
    </div>
  )

  const landName = laender.find(l => l.code === trip.land_code)?.name
  const flagUrl = trip.land_code
    ? `https://flagcdn.com/w320/${trip.land_code.toLowerCase()}.png`
    : null

  // Countdown Anzeige je nach Status
  const renderCountdown = () => {
    if (tage === null) return (
      <span style={{ color: '#c9a84c', fontWeight: '600', fontSize: '0.95rem' }}>{trip.datum}</span>
    )
    if (tage === 0) return (
      <span style={{ color: '#c9a84c', fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
        Heute geht's los! <Rocket size={18} />
      </span>
    )
    
      if (tage < 0) {
        const endTeil = trip.datum?.split(' - ')[1]
        const endTeile = endTeil?.split('.')
        const enddatum = endTeile?.length >= 3
          ? new Date(`${endTeile[2]}-${endTeile[1]}-${endTeile[0]}`)
          : null
        const nochAktiv = enddatum && enddatum >= new Date()

        return (
          <span style={{ color: '#c9a84c', fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {nochAktiv ? 'Reise läuft! 🛫' : 'Reise abgeschlossen!'} <PartyPopper size={18} />
          </span>
        )
    }

    // Reise steht noch bevor (tage > 0)
    if (tage > 0) {
      return (
        <span style={{ color: '#c9a84c', fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Noch {tage} Tag{tage === 1 ? '' : 'e'} bis zur Abreise
        </span>
      )
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '100px', boxSizing: 'border-box' }}>

      {/* Hero Banner mit Länderflagge als Hintergrund */}
      <div className="fade-in" style={{
        position: 'relative',
        minHeight: '310px',
        borderRadius: '0 0 36px 36px',
        overflow: 'hidden',
        marginBottom: '24px',
        background: flagUrl
        ? `linear-gradient(to bottom, 
            rgba(8,13,26,0.2) 0%, 
            rgba(8,13,26,0.5) 40%, 
            rgba(8,13,26,0.92) 75%, 
            #080d1a 100%
          ), url(https://flagcdn.com/w640/${trip.land_code.toLowerCase()}.png) center top/cover no-repeat`
        : 'linear-gradient(135deg, #111827 0%, #1a2235 100%)',
      }}>

        {/* Zurück Button – eleganter Kreis */}
        <button onClick={() => navigate('/')} className="btn-press" style={{
          position: 'absolute', top: '20px', left: '20px',
          background: 'rgba(8,13,26,0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#ffffff', cursor: 'pointer',
          width: '46px', height: '46px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          zIndex: 2, flexShrink: 0,
        }}>
          <ChevronLeft size={22} />
        </button>

        {/* Hero Textinhalt */}
        <div style={{ padding: '88px 24px 36px', position: 'relative', zIndex: 1 }}>
          {landName && (
            <p style={{
              color: '#c9a84c',
              fontSize: '0.7rem', fontWeight: '700',
              letterSpacing: '0.2em', textTransform: 'uppercase',
              margin: '0 0 10px', opacity: 0.9,
            }}>
              {landName}
            </p>
          )}

          <h1 style={{
            fontSize: 'clamp(1.9rem, 7.5vw, 2.8rem)',
            fontWeight: '800', margin: '0 0 8px',
            letterSpacing: '-0.5px', lineHeight: 1.1,
            overflowWrap: 'break-word', wordBreak: 'break-word',
          }}>
            {trip.name}
          </h1>

          <p style={{ color: '#8892a4', margin: '0 0 28px', fontSize: '0.88rem', letterSpacing: '0.02em' }}>
            {trip.datum}
          </p>

          {/* Countdown Block – sehr prominent */}
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'rgba(17,24,39,0.75)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(201,168,76,0.22)',
            borderRadius: '22px',
            padding: '14px 24px',
          }}>
            {renderCountdown()}
          </div>
        </div>
      </div>

      {/* Navigation Kacheln – 2-spaltiges Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        padding: '0 clamp(14px, 4vw, 20px)',
      }}>

        {/* Info */}
        <div onClick={() => navigate(`/trip/${id}/info`)}
          className="karte-hover btn-press fade-in-1"
          style={kachelStyle}>
          <div style={iconWrapStyle}><Info size={20} color="#c9a84c" /></div>
          <p style={kachelTitelStyle}>Info</p>
          <p style={kachelSubStyle}>Flug, Hotel & Links</p>
        </div>

        {/* Personen */}
        <div onClick={() => navigate(`/trip/${id}/personen`)}
          className="karte-hover btn-press fade-in-2"
          style={kachelStyle}>
          <div style={iconWrapStyle}><Users size={20} color="#c9a84c" /></div>
          <p style={kachelTitelStyle}>Personen</p>
          <p style={kachelSubStyle}>{teilnehmer.length} Teilnehmer</p>
        </div>

        {/* Packliste mit Mini-Fortschrittsbalken */}
        <div onClick={() => navigate(`/trip/${id}/packliste`)}
          className="karte-hover btn-press fade-in-3"
          style={kachelStyle}>
          <div style={iconWrapStyle}><CheckSquare size={20} color="#c9a84c" /></div>
          <p style={kachelTitelStyle}>Packliste</p>
          <p style={kachelSubStyle}>{packlisteErledigt}/{packliste.length} gepackt</p>
          {packliste.length > 0 && (
            <div style={{ marginTop: '12px', backgroundColor: '#0d1525', borderRadius: '6px', height: '4px', overflow: 'hidden' }}>
              <div style={{
                backgroundColor: '#c9a84c', borderRadius: '6px', height: '4px',
                width: `${packlisteProzent}%`, transition: 'width 0.6s ease',
              }} />
            </div>
          )}
        </div>

        {/* Kosten */}
        <div onClick={() => navigate(`/trip/${id}/kosten`)}
          className="karte-hover btn-press fade-in-4"
          style={kachelStyle}>
          <div style={iconWrapStyle}><Wallet size={20} color="#c9a84c" /></div>
          <p style={kachelTitelStyle}>Kosten</p>
          <p style={kachelSubStyle}>{gesamt.toFixed(0)}€ ausgegeben</p>
        </div>

        {/* Fotos – volle Breite als breite Kachel */}
        <div onClick={() => navigate(`/trip/${id}/fotos`)}
          className="karte-hover btn-press fade-in-5"
          style={{ ...kachelStyle, gridColumn: '1 / -1', flexDirection: 'row', alignItems: 'center', gap: '16px', paddingTop: '18px', paddingBottom: '18px' }}>
          <div style={{ ...iconWrapStyle, marginBottom: 0, flexShrink: 0 }}><Camera size={20} color="#c9a84c" /></div>
          <div>
            <p style={kachelTitelStyle}>Fotos</p>
            <p style={kachelSubStyle}>Gemeinsames Album</p>
          </div>
        </div>

      </div>
    </div>
  )
}

const kachelStyle = {
  backgroundColor: '#111827',
  borderRadius: '22px',
  padding: 'clamp(18px, 4vw, 24px)',
  cursor: 'pointer',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
}

const iconWrapStyle = {
  width: '46px', height: '46px',
  borderRadius: '14px',
  backgroundColor: 'rgba(201,168,76,0.1)',
  border: '1px solid rgba(201,168,76,0.18)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  marginBottom: '14px', flexShrink: 0,
}

const kachelTitelStyle = {
  fontSize: 'clamp(0.9rem, 3.5vw, 1rem)',
  fontWeight: '700', margin: '0 0 4px',
  color: '#ffffff',
  overflowWrap: 'break-word', wordBreak: 'break-word',
}

const kachelSubStyle = {
  fontSize: 'clamp(0.72rem, 3vw, 0.8rem)',
  color: '#8892a4', margin: 0,
  overflowWrap: 'break-word', wordBreak: 'break-word',
}

export default TripHome
