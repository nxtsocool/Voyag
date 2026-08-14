import { useNavigate } from 'react-router-dom'
import laender from '../data/laender'

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

// Zeitleisten-Ansicht der Reisen – wird in TripsOverview als Alternative zur Karten-Ansicht eingebettet
function TripsTimeline({ trips, currentUser, t }) {
  const navigate = useNavigate()

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

  // Leerer Zustand wird zentral in TripsOverview gerendert – hier nichts anzeigen
  if (trips.length === 0) return null

  return (
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
  )
}

export default TripsTimeline
