import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import laender from '../data/laender'
import { Trash2, SquarePen, Globe } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { de } from 'date-fns/locale'
import Toast from '../components/Toast'
import useToast from '../hooks/useToast.jsx'


// Farbe anhand Trip-ID auswählen
// Farbe basierend auf Ländercode – nach Region/Kontinent
const getRegionFarbe = (code) => {
  if (!code) return { bg: '#0f1f2a', accent: '#1a3040' }

  // Europa – Dunkelblau
  const europa = ['DE','FR','IT','ES','PT','NL','BE','AT','CH','PL','CZ','SK','HU','RO','BG','HR','SI','RS','BA','ME','AL','MK','GR','CY','MT','LU','LI','MC','AD','SM','VA','IE','GB','DK','SE','NO','FI','IS','EE','LV','LT','BY','UA','MD','RU']
  // Asien – Dunkelviolett
  const asien = ['CN','JP','KR','KP','MN','TW','HK','MO','TH','VN','LA','KH','MM','MY','SG','ID','PH','BN','TL','IN','PK','BD','LK','NP','BT','MV','AF','IR','IQ','SY','LB','JO','IL','PS','SA','YE','OM','AE','QA','BH','KW','TR','AM','AZ','GE','KZ','UZ','TM','TJ','KG']
  // Afrika – Dunkelgrün
  const afrika = ['MA','DZ','TN','LY','EG','SD','SS','ET','ER','DJ','SO','KE','UG','TZ','RW','BI','MZ','ZW','ZM','MW','MG','MU','SC','KM','RE','YT','NG','GH','CI','SN','ML','BF','NE','TG','BJ','GN','SL','LR','GW','GM','CV','MR','EH','CM','CF','TD','CG','CD','GA','GQ','ST','AO','NA','BW','LS','SZ','ZA']
  // Amerika – Dunkelrot
  const amerika = ['US','CA','MX','GT','BZ','HN','SV','NI','CR','PA','CU','JM','HT','DO','PR','TT','BB','LC','VC','GD','AG','DM','KN','BS','TC','KY','BM','VI','VG','AW','CW','BR','AR','CL','UY','PY','BO','PE','EC','CO','VE','GY','SR','GF']
  // Ozeanien – Dunkelcyan
  const ozeanien = ['AU','NZ','PG','FJ','SB','VU','WS','TO','KI','TV','NR','PW','MH','FM']

  if (europa.includes(code)) return { bg: '#0a1628', accent: '#0f2040' }
  if (asien.includes(code)) return { bg: '#150d28', accent: '#1f1240' }
  if (afrika.includes(code)) return { bg: '#0a2010', accent: '#0f3018' }
  if (amerika.includes(code)) return { bg: '#280a0a', accent: '#3d1010' }
  if (ozeanien.includes(code)) return { bg: '#0a2028', accent: '#0f3038' }
  return { bg: '#1a1a1a', accent: '#252525' }
}

// Countdown berechnen
const getCountdown = (datum) => {
  if (!datum) return null
  const startTeil = datum.split(' - ')[0]
  const teile = startTeil.split('.')
  if (teile.length < 3) return null
  const start = new Date(`${teile[2]}-${teile[1]}-${teile[0]}`)
  const heute = new Date()
  const tage = Math.ceil((start - heute) / (1000 * 60 * 60 * 24))
  if (tage < 0) return 'Reise abgeschlossen'
  if (tage === 0) return 'Heute geht es los!'
  if (tage === 1) return 'Noch 1 Tag' // ← Singular
  return `Noch ${tage} Tage`
}

const getFlaggeUrl = (code) => {
  if (!code) return null
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`
}

function TripsOverview() {
  const navigate = useNavigate()
  const { toasts, setToasts, toast } = useToast()

  const [trips, setTrips] = useState([])
  const [laden, setLaden] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [formularOffen, setFormularOffen] = useState(false)
  const [beitretenOffen, setBeitretenOffen] = useState(false)
  const [einladungsCode, setEinladungsCode] = useState('')
  const [loescheTrip, setLoescheTrip] = useState(null)
  const [bearbeiteTrip, setBearbeiteTrip] = useState(null)
  const [bearbeiteDaten, setBearbeiteDaten] = useState({
    name: '', land_code: '', startDatum: null, endDatum: null
  })
  const [neueReise, setNeueReise] = useState({
    name: '', land_code: '', startDatum: null, endDatum: null
  })

  useEffect(() => { tripsLaden() }, [])

  async function tripsLaden() {
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

  const reiseHinzufuegen = async () => {
    if (!neueReise.name || !neueReise.land_code || !neueReise.startDatum || !neueReise.endDatum) return

    const formatDatum = (date) =>
      `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`
    const datumText = `${formatDatum(neueReise.startDatum)} - ${formatDatum(neueReise.endDatum)}`

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    const code = (() => {
      const zeichen = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let result = ''
      for (let i = 0; i < 6; i++) result += zeichen.charAt(Math.floor(Math.random() * zeichen.length))
      return result
    })()

    const { data: tripData, error } = await supabase
      .from('trips')
      .insert([{ name: neueReise.name, land_code: neueReise.land_code, datum: datumText, user_id: user.id, invite_code: code }])
      .select()

    if (error) console.error('Fehler:', error)
    else {
      setTrips([...trips, tripData[0]])
      // NEU – erst prüfen ob Land schon vorhanden:
      const { data: vorhanden } = await supabase
        .from('visited_countries')
        .select('*')
        .eq('user_id', user.id)
        .eq('country_code', neueReise.land_code)
        .single()

      // Nur hinzufügen wenn noch nicht vorhanden
      if (!vorhanden) {
        await supabase.from('visited_countries').insert([{
          user_id: user.id, country_code: neueReise.land_code, trip_id: tripData[0].id
        }])
      }
      setNeueReise({ name: '', land_code: '', startDatum: null, endDatum: null })
      setFormularOffen(false)
    }
  }

  const bearbeitenOeffnen = (trip) => {
    setBearbeiteTrip(trip)
    setBearbeiteDaten({ name: trip.name, land_code: trip.land_code || '', startDatum: null, endDatum: null })
  }

  const reiseSpeichern = async () => {
    if (!bearbeiteDaten.name || !bearbeiteDaten.land_code) return

    let datumText = bearbeiteTrip.datum
    if (bearbeiteDaten.startDatum && bearbeiteDaten.endDatum) {
      const formatDatum = (date) =>
        `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`
      datumText = `${formatDatum(bearbeiteDaten.startDatum)} - ${formatDatum(bearbeiteDaten.endDatum)}`
    }

    const { error } = await supabase
      .from('trips')
      .update({ name: bearbeiteDaten.name, land_code: bearbeiteDaten.land_code, datum: datumText })
      .eq('id', bearbeiteTrip.id)

    if (error) console.error('Fehler:', error)
    else {
      setTrips(trips.map(t => t.id === bearbeiteTrip.id
        ? { ...t, name: bearbeiteDaten.name, land_code: bearbeiteDaten.land_code, datum: datumText }
        : t
      ))
      setBearbeiteTrip(null)
    }
  }

  const reiseEntfernen = async (tripId) => {
    await supabase.from('teilnehmer').delete().eq('trip_id', tripId)
    await supabase.from('ausgaben').delete().eq('trip_id', tripId)
    await supabase.from('visited_countries').delete().eq('trip_id', tripId)
    await supabase.from('trip_members').delete().eq('trip_id', tripId)
    await supabase.from('packliste').delete().eq('trip_id', tripId)
    await supabase.from('trip_links').delete().eq('trip_id', tripId)
    await supabase.from('trip_fluege').delete().eq('trip_id', tripId)
    await supabase.from('trip_unterkuenfte').delete().eq('trip_id', tripId)
    const { error } = await supabase.from('trips').delete().eq('id', tripId)
    if (error) console.error('Fehler:', error)
    else {
      setTrips(trips.filter(t => t.id !== tripId))
      setLoescheTrip(null)
    }
  }

  const reiseVerlassen = async (tripId) => {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    await supabase.from('trip_members').delete().eq('trip_id', tripId).eq('user_id', user.id)
    await supabase.from('visited_countries').delete().eq('trip_id', tripId).eq('user_id', user.id)
    setTrips(trips.filter(t => t.id !== tripId))
  }

  const reiseBeitreten = async () => {
    if (!einladungsCode) return
    const { data: trip, error } = await supabase
      .from('trips').select('*').eq('invite_code', einladungsCode.toUpperCase()).single()

    if (error || !trip) { toast('Code nicht gefunden!', 'error'); return }

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (trip.user_id === user.id) { toast('Das ist deine eigene Reise!', 'error'); return }

    const { data: bereitsVorhanden } = await supabase
      .from('trip_members').select('*').eq('trip_id', trip.id).eq('user_id', user.id).single()

    if (bereitsVorhanden) { toast('Du bist bereits Mitglied!', 'error'); return }

    await supabase.from('trip_members').insert([{ trip_id: trip.id, user_id: user.id }])
    const { data: vorhandenBeitreten } = await supabase
      .from('visited_countries')
      .select('*')
      .eq('user_id', user.id)
      .eq('country_code', trip.land_code)
      .single()

    if (!vorhandenBeitreten) {
      await supabase.from('visited_countries').insert([{
        user_id: user.id,
        country_code: trip.land_code,
        trip_id: trip.id
      }])
    }

    setEinladungsCode('')
    setBeitretenOffen(false)
    await tripsLaden()
  }

  if (laden) return (
  <div style={{
    minHeight: '100vh', display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#080d1a',
    backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,168,76,0.1) 0%, transparent 70%)',
  }}>
    {/* Logo Animation */}
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
      <span className="logo-slide" style={{ fontSize: '2.8rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-2px', lineHeight: 1 }}>V</span>
      <svg className="kompass-spin" width="32" height="32" viewBox="-1 0 60 60" style={{ marginTop: '8px' }}>
        <circle cx="30" cy="30" r="27" fill="none" stroke="#c9a84c" strokeWidth="4"/>
        <polygon points="30,5 34,30 30,26 26,30" fill="#c9a84c"/>
        <polygon points="30,55 34,30 30,34 26,30" fill="#ffffff" opacity="0.15"/>
        <circle cx="30" cy="30" r="4" fill="#c9a84c"/>
        <circle cx="30" cy="30" r="2" fill="#080d1a"/>
      </svg>
      <span className="logo-slide" style={{ fontSize: '2.8rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-2px', lineHeight: 1 }}>y</span>
      <span className="logo-gold" style={{ fontSize: '2.8rem', fontWeight: '800', color: '#c9a84c', letterSpacing: '-2px', lineHeight: 1 }}>ag</span>
    </div>

    {/* Pulsierender Punkt */}
    <div style={{ display: 'flex', gap: '6px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '6px', height: '6px', borderRadius: '50%',
          backgroundColor: '#c9a84c',
          animation: `nadelPuls 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  </div>
  )

  return (
    <div style={{ padding: '24px 20px', maxWidth: '600px', margin: '0 auto', minHeight: '100vh' }}>

      {/* Header */}
      <div className="fly-down" style={{
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap',
        alignItems: 'flex-start', marginBottom: '28px', gap: '12px',
      }}>
        <div style={{ minWidth: 0 }}>
          {/* Logo mit Kompass als O */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0px',  }}>
            <span className="logo-slide" style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-2px', lineHeight: 1 }}>V</span>
            <svg className="kompass-spin" width="26" height="26" viewBox="0 0 60 60" style={{ marginTop: '8px' }}>
              <circle cx="30" cy="30" r="27" fill="none" stroke="#c9a84c" strokeWidth="4"/>
              <polygon points="30,5 34,30 30,26 26,30" fill="#c9a84c"/>
              <polygon points="30,55 34,30 30,34 26,30" fill="#ffffff" opacity="0.15"/>
              <circle cx="30" cy="30" r="4" fill="#c9a84c"/>
              <circle cx="30" cy="30" r="2" fill="#080d1a"/>
            </svg>
            <span className="logo-slide" style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-2px', lineHeight: 1 }}>y</span>
            <span className="logo-gold" style={{ fontSize: '2.2rem', fontWeight: '800', color: '#c9a84c', letterSpacing: '-2px', lineHeight: 1 }}>ag</span>
          </div>
          <p style={{ color: '#8892a4', fontSize: '0.8rem', marginTop: '4px' }}>
            {trips.length} {trips.length === 1 ? 'Reise' : 'Reisen'} geplant
          </p>
        </div>
         {/* Buttons – waren weg! */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setBeitretenOffen(!beitretenOffen)} className="btn-press" style={{
            backgroundColor: 'transparent', color: '#c9a84c',
            border: '1.5px solid rgba(201,168,76,0.4)', padding: '10px 16px',
            minHeight: '44px', boxSizing: 'border-box',
            borderRadius: '14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
          }}>Beitreten</button>
          <button onClick={() => setFormularOffen(!formularOffen)} className="btn-press" style={{
            backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
            padding: '10px 16px', minHeight: '44px', boxSizing: 'border-box',
            borderRadius: '14px', cursor: 'pointer',
            fontSize: '0.85rem', fontWeight: '700',
          }}>+ Neu</button>
        </div>
      </div>

      <div style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>

        {/* Beitreten Formular */}
        {beitretenOffen && (
          <div className="fade-in" style={{ ...karteStyle, position: 'relative', zIndex: 100 }}>
            <h3 style={{ marginBottom: '16px', fontWeight: '700' }}>Reise beitreten</h3>
            <input placeholder="Einladungscode (z.B. XKQT82)" value={einladungsCode}
              onChange={(e) => setEinladungsCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && reiseBeitreten()} style={inputStyle} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={reiseBeitreten} className="btn-press" style={speichernButtonStyle}>Beitreten</button>
              <button onClick={() => setBeitretenOffen(false)} className="btn-press" style={abbrechenButtonStyle}>Abbrechen</button>
            </div>
          </div>
        )}

        {/* Neue Reise Formular */}
        {formularOffen && (
          <div className="fade-in" style={{ ...karteStyle, position: 'relative', zIndex: 100 }}>
            <h3 style={{ marginBottom: '16px', fontWeight: '700' }}>Neue Reise</h3>
            <input placeholder="Name (z.B. Mallorca 2025)" value={neueReise.name}
              onChange={(e) => setNeueReise({ ...neueReise, name: e.target.value })} style={inputStyle} />
            <select value={neueReise.land_code}
              onChange={(e) => setNeueReise({ ...neueReise, land_code: e.target.value })} style={inputStyle}>
              <option value="">Land auswählen...</option>
              {laender.map(land => <option key={land.code} value={land.code}>{land.name}</option>)}
            </select>
            <DatePicker selected={neueReise.startDatum}
              onChange={(date) => setNeueReise({ ...neueReise, startDatum: date })}
              selectsStart startDate={neueReise.startDatum} endDate={neueReise.endDatum}
              placeholderText="Startdatum" locale={de} dateFormat="dd.MM.yyyy"
              customInput={<input style={inputStyle} />} />
            <DatePicker selected={neueReise.endDatum}
              onChange={(date) => setNeueReise({ ...neueReise, endDatum: date })}
              selectsEnd startDate={neueReise.startDatum} endDate={neueReise.endDatum}
              minDate={neueReise.startDatum} placeholderText="Enddatum" locale={de}
              dateFormat="dd.MM.yyyy" customInput={<input style={inputStyle} />} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button onClick={reiseHinzufuegen} className="btn-press" style={speichernButtonStyle}>Erstellen</button>
              <button onClick={() => setFormularOffen(false)} className="btn-press" style={abbrechenButtonStyle}>Abbrechen</button>
            </div>
          </div>
        )}

        {/* Reise bearbeiten Formular */}
        {bearbeiteTrip && (
            <div className="fade-in" style={{ ...karteStyle, position: 'relative', zIndex: 100 }}>
            <h3 style={{ marginBottom: '16px', fontWeight: '700' }}>Reise bearbeiten</h3>
            <input placeholder="Name" value={bearbeiteDaten.name}
              onChange={(e) => setBearbeiteDaten({ ...bearbeiteDaten, name: e.target.value })} style={inputStyle} />
            <select value={bearbeiteDaten.land_code}
              onChange={(e) => setBearbeiteDaten({ ...bearbeiteDaten, land_code: e.target.value })} style={inputStyle}>
              <option value="">Land auswählen...</option>
              {laender.map(land => <option key={land.code} value={land.code}>{land.name}</option>)}
            </select>
            <p style={{ color: '#8892a4', fontSize: '0.82rem', marginBottom: '10px' }}>
              Datum leer lassen = unverändert
            </p>
            <DatePicker selected={bearbeiteDaten.startDatum}
              onChange={(date) => setBearbeiteDaten({ ...bearbeiteDaten, startDatum: date })}
              selectsStart startDate={bearbeiteDaten.startDatum} endDate={bearbeiteDaten.endDatum}
              placeholderText="Neues Startdatum" locale={de} dateFormat="dd.MM.yyyy"
              customInput={<input style={inputStyle} />} />
            <DatePicker selected={bearbeiteDaten.endDatum}
              onChange={(date) => setBearbeiteDaten({ ...bearbeiteDaten, endDatum: date })}
              selectsEnd startDate={bearbeiteDaten.startDatum} endDate={bearbeiteDaten.endDatum}
              minDate={bearbeiteDaten.startDatum} placeholderText="Neues Enddatum" locale={de}
              dateFormat="dd.MM.yyyy" customInput={<input style={inputStyle} />} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button onClick={reiseSpeichern} className="btn-press" style={speichernButtonStyle}>Speichern</button>
              <button onClick={() => setBearbeiteTrip(null)} className="btn-press" style={abbrechenButtonStyle}>Abbrechen</button>
            </div>
          </div>
        )}

        {/* Trip Karten */}
        {trips.map((trip, index) => {
          const farbe = getRegionFarbe(trip.land_code)
          const countdown = getCountdown(trip.datum)
          const landName = laender.find(l => l.code === trip.land_code)?.name || ''
          const eigenTrip = trip.user_id === currentUser?.id

          return (
            <div key={trip.id} className={`fly-in-${Math.min(index + 1, 5)}`} style={{ marginBottom: '12px' }}>
              <div
                className="karte-hover"
                style={{
                  borderRadius: '20px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                }}
              >
                {/* Banner oben */}
                <div
                  onClick={() => navigate(`/trip/${trip.id}`)}
                  style={{
                    background: `linear-gradient(135deg, ${farbe.accent} 0%, ${farbe.bg} 100%)`,
                    padding: '20px',
                    borderRadius: '20px 20px 0 0',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Flaggen Bild */}
                  <div style={{
                    width: '48px', height: '36px', borderRadius: '8px',
                    overflow: 'hidden', flexShrink: 0,
                  }}>
                    <img
                      src={getFlaggeUrl(trip.land_code)}
                      alt={trip.land_code}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Name + Land */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{
                      margin: '0 0 3px', fontSize: 'clamp(0.95rem, 4.5vw, 1.15rem)',
                      fontWeight: '800', letterSpacing: '-0.5px',
                      color: '#ffffff',
                      overflowWrap: 'break-word', wordBreak: 'break-word',
                    }}>
                      {trip.name}
                    </h2>
                    <p style={{
                      margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem',
                      overflowWrap: 'break-word', wordBreak: 'break-word',
                    }}>
                      {landName} · {trip.datum}
                    </p>
                  </div>

                  {/* Aktions Buttons – min. 44x44px Touch-Target (Apple HIG) */}
                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                    {eigenTrip ? (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); bearbeitenOeffnen(trip) }}
                          className="btn-press" style={{
                            backgroundColor: 'rgba(255,255,255,0.1)', border: 'none',
                            color: 'rgba(255,255,255,0.7)', borderRadius: '10px',
                            width: '44px', height: '44px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                          <SquarePen size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setLoescheTrip(trip) }}
                          className="btn-press" style={{
                            backgroundColor: 'rgba(233,69,96,0.15)', border: 'none',
                            color: '#e94560', borderRadius: '10px',
                            width: '44px', height: '44px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); reiseVerlassen(trip.id) }}
                        className="btn-press" style={{
                          backgroundColor: 'rgba(255,255,255,0.08)', border: 'none',
                          color: 'rgba(255,255,255,0.5)', padding: '0 12px',
                          minHeight: '44px', boxSizing: 'border-box',
                          borderRadius: '10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        Verlassen
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer unten */}
                <div onClick={() => navigate(`/trip/${trip.id}`)} style={{
                  backgroundColor: '#111827', padding: '12px 20px',
                  borderRadius: '0 0 20px 20px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  {/* Einladungscode oder Badge */}
                  {eigenTrip && trip.invite_code ? (
                    <span style={{
                      backgroundColor: 'rgba(201,168,76,0.1)', color: '#c9a84c',
                      padding: '4px 10px', borderRadius: '8px',
                      fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em',
                    }}>
                      {trip.invite_code}
                    </span>
                  ) : (
                    <span style={{
                      backgroundColor: 'rgba(136,146,164,0.1)', color: '#8892a4',
                      padding: '4px 10px', borderRadius: '8px',
                      fontSize: '0.75rem', fontWeight: '600',
                    }}>
                      Beigetreten
                    </span>
                  )}

                  {/* Countdown */}
                  {countdown && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#c9a84c' }} />
                      <span style={{ color: '#8892a4', fontSize: '0.78rem' }}>{countdown}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Leerer Zustand */}
        {trips.length === 0 && !formularOffen && !beitretenOffen && (
          <div className="fade-in" style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px',
              backgroundColor: '#111827', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}>
              <Globe size={32} color="#c9a84c" />
            </div>
            <p style={{ fontWeight: '700', color: '#fff', marginBottom: '8px', fontSize: '1.1rem' }}>
              Noch keine Reisen
            </p>
            <p style={{ fontSize: '0.9rem', color: '#8892a4', lineHeight: 1.5 }}>
              Tippe auf "+ Neu" um deine<br />erste Reise hinzuzufügen!
            </p>
          </div>
        )}
      </div>

      {/* Bestätigungsdialog Löschen */}
      {loescheTrip && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="fade-in" style={{
            backgroundColor: '#111827', borderRadius: '24px 24px 0 0',
            padding: '32px 24px calc(48px + env(safe-area-inset-bottom))',
            width: '100%', maxWidth: '600px', boxSizing: 'border-box',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{
              width: '40px', height: '4px', backgroundColor: '#1a2235',
              borderRadius: '2px', margin: '0 auto 24px',
            }} />
            <h3 style={{ margin: '0 0 8px', fontWeight: '700', fontSize: '1.2rem' }}>
              Reise löschen?
            </h3>
            <p style={{ color: '#8892a4', margin: '0 0 28px', fontSize: '0.95rem', lineHeight: 1.5 }}>
              <span style={{ color: '#fff', fontWeight: '600' }}>{loescheTrip.name}</span> wird
              unwiderruflich gelöscht – inkl. aller Teilnehmer, Ausgaben und der Packliste.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => reiseEntfernen(loescheTrip.id)} className="btn-press" style={{
                backgroundColor: '#e94560', color: '#fff', border: 'none',
                padding: '14px', borderRadius: '14px', cursor: 'pointer',
                flex: 1, fontWeight: '700', fontSize: '1rem',
              }}>
                Löschen
              </button>
              <button onClick={() => setLoescheTrip(null)} className="btn-press" style={abbrechenButtonStyle}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    <Toast toasts={toasts} setToasts={setToasts} />
    </div>
  )
}

const karteStyle = {
  backgroundColor: '#111827', borderRadius: '20px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  padding: '20px', marginBottom: '12px',
}

const inputStyle = {
  width: '100%', padding: '13px 14px', backgroundColor: '#1a2235',
  border: '1.5px solid rgba(255,255,255,0.06)', borderRadius: '12px',
  color: '#ffffff', fontSize: '1rem', marginBottom: '10px', boxSizing: 'border-box',
}

const speichernButtonStyle = {
  backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
  padding: '13px', borderRadius: '14px', cursor: 'pointer',
  flex: 1, fontWeight: '700', fontSize: '1rem',
}

const abbrechenButtonStyle = {
  backgroundColor: '#1a2235', color: '#fff', border: 'none',
  padding: '13px', borderRadius: '14px', cursor: 'pointer', flex: 1, fontWeight: '600',
}

export default TripsOverview