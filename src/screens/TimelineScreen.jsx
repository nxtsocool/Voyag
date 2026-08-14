import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import laender from '../data/laender'
import { CalendarDays } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'

// Start-/Enddatum aus dem "DD.MM.YYYY - DD.MM.YYYY" Format parsen
const parseZeitraum = (datum) => {
  if (!datum) return { start: null, ende: null }
  const [startTeil, endTeil] = datum.split(' - ')
  const parseDatum = (teil) => {
    if (!teil) return null
    const [tag, monat, jahr] = teil.split('.')
    if (!jahr) return null
    return new Date(`${jahr}-${monat}-${tag}`)
  }
  const start = parseDatum(startTeil)
  const ende = parseDatum(endTeil)
  if (ende) ende.setHours(23, 59, 59)
  return { start, ende }
}

function TimelineScreen() {
  const navigate = useNavigate()
  const { t } = useSettings()
  const [trips, setTrips] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    const datenLaden = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      setCurrentUser(user)

      const { data: eigeneTrips } = await supabase
        .from('trips').select('*').eq('user_id', user.id)

      const { data: members } = await supabase
        .from('trip_members').select('trip_id').eq('user_id', user.id)

      let beigetreteneTrips = []
      if (members && members.length > 0) {
        const tripIds = members.map(m => m.trip_id)
        const { data } = await supabase.from('trips').select('*').in('id', tripIds)
        beigetreteneTrips = data || []
      }

      setTrips([...(eigeneTrips || []), ...beigetreteneTrips])
      setLaden(false)
    }
    datenLaden()
  }, [])

  const getFlaggeUrl = (code) => code ? `https://flagcdn.com/w40/${code.toLowerCase()}.png` : null

  const heute = new Date()

  // Reisen mit Status anreichern
  const angereichert = trips.map(trip => {
    const { start, ende } = parseZeitraum(trip.datum)
    let status = 'kommend'
    if (start && ende) {
      if (heute > ende) status = 'vergangen'
      else if (heute >= start && heute <= ende) status = 'laufend'
    }
    return { trip, start, ende, status }
  })

  const nichtVergangen = angereichert
    .filter(e => e.status !== 'vergangen')
    .sort((a, b) => (a.start?.getTime() || Infinity) - (b.start?.getTime() || Infinity))

  const vergangen = angereichert
    .filter(e => e.status === 'vergangen')
    .sort((a, b) => (b.ende?.getTime() || 0) - (a.ende?.getTime() || 0))

  // Status-Text rechts auf der Karte
  const statusText = (eintrag) => {
    if (eintrag.status === 'laufend') return t('timelineLaeuftGerade')
    if (eintrag.status === 'vergangen') {
      if (!eintrag.ende) return ''
      const tage = Math.ceil((heute - eintrag.ende) / (1000 * 60 * 60 * 24))
      return t('timelineVorTagen')(Math.max(tage, 0))
    }
    if (!eintrag.start) return ''
    const tage = Math.ceil((eintrag.start - heute) / (1000 * 60 * 60 * 24))
    return t('timelineNochTage')(Math.max(tage, 0))
  }

  const dotFarbe = (status) => {
    if (status === 'laufend') return 'var(--success)'
    if (status === 'vergangen') return 'var(--text-sub)'
    return 'var(--gold)'
  }

  // Eine Zeitleisten-Karte rendern
  const renderEintrag = (eintrag, index) => {
    const { trip, status } = eintrag
    const landName = laender.find(l => l.code === trip.land_code)?.name || ''
    const eigenTrip = trip.user_id === currentUser?.id

    return (
      <div key={trip.id} className={`fly-in-${Math.min(index + 1, 5)}`} style={{ position: 'relative', paddingLeft: '28px', marginBottom: '16px' }}>
        {/* Punkt auf der Linie */}
        <div style={{
          position: 'absolute', left: '0', top: '18px',
          width: '12px', height: '12px', borderRadius: '50%',
          backgroundColor: dotFarbe(status),
          border: '2px solid var(--bg)',
          boxShadow: status !== 'vergangen' ? `0 0 8px ${dotFarbe(status)}` : 'none',
        }} />

        <div
          onClick={() => navigate(`/trip/${trip.id}`)}
          className="karte-hover btn-press"
          style={{
            backgroundColor: 'var(--card)', borderRadius: '20px',
            padding: '16px', boxShadow: 'var(--shadow)',
            cursor: 'pointer', boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}
        >
          {trip.land_code && (
            <img
              src={getFlaggeUrl(trip.land_code)}
              alt={trip.land_code}
              style={{ width: '40px', height: '30px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
            />
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <p style={{ margin: 0, fontWeight: '700', color: 'var(--text)', overflowWrap: 'break-word', wordBreak: 'break-word', fontSize: '0.95rem' }}>
                {trip.name}
              </p>
              {!eigenTrip && (
                <span style={{
                  backgroundColor: 'rgba(136,146,164,0.15)', color: 'var(--text-sub)',
                  borderRadius: '6px', padding: '1px 6px',
                  fontSize: '0.65rem', fontWeight: '700', flexShrink: 0,
                }}>
                  {t('beigetreten')}
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0', color: 'var(--text-sub)', fontSize: '0.78rem', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
              {landName ? `${landName} · ` : ''}{trip.datum}
            </p>
          </div>

          <span style={{ color: 'var(--gold)', fontSize: '0.78rem', fontWeight: '700', flexShrink: 0, whiteSpace: 'nowrap', textAlign: 'right' }}>
            {statusText(eintrag)}
          </span>
        </div>
      </div>
    )
  }

  if (laden) return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px', boxSizing: 'border-box' }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton" style={{ height: '78px', borderRadius: '20px', marginBottom: '16px' }} />
      ))}
    </div>
  )

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px', boxSizing: 'border-box', paddingBottom: 'calc(120px + env(safe-area-inset-bottom))' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 24px', letterSpacing: '-0.5px' }}>
        {t('navTimeline')}
      </h1>

      {trips.length === 0 ? (
        <div className="fade-in" style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            backgroundColor: 'rgba(var(--gold-rgb), 0.1)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <CalendarDays size={36} color="var(--gold)" />
          </div>
          <p style={{ fontWeight: '700', color: 'var(--text)', marginBottom: '8px', fontSize: '1.1rem' }}>
            {t('timelineLeerTitel')}
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-sub)', lineHeight: 1.5 }}>
            {t('timelineLeerSubtitel')}
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Durchgehende vertikale Linie */}
          <div style={{
            position: 'absolute', left: '5px', top: '18px', bottom: '18px',
            width: '2px', backgroundColor: 'var(--border)',
          }} />

          {nichtVergangen.map((eintrag, index) => renderEintrag(eintrag, index))}

          {vergangen.length > 0 && (
            <div style={{ position: 'relative', paddingLeft: '28px', margin: '8px 0 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  color: 'var(--text-sub)', fontSize: '0.72rem', fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
                }}>
                  {t('timelineVergangenLabel')}
                </span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
              </div>
            </div>
          )}

          {vergangen.map((eintrag, index) => renderEintrag(eintrag, index))}
        </div>
      )}
    </div>
  )
}

export default TimelineScreen
