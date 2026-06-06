import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import laender from '../data/laender'
import { Trash2, Plane } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { de } from 'date-fns/locale'

function TripsOverview() {
  const navigate = useNavigate()

  // State für Reisen und Ladeindikator
  const [trips, setTrips] = useState([])
  const [laden, setLaden] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)

  // State für Formulare
  const [formularOffen, setFormularOffen] = useState(false)
  const [beitretenOffen, setBeitretenOffen] = useState(false)

  // Eingabefelder neue Reise
  const [neueReise, setNeueReise] = useState({
    name: '', land_code: '', startDatum: null, endDatum: null
  })

  // Eingabefeld Einladungscode
  const [einladungsCode, setEinladungsCode] = useState('')

  // Beim ersten Laden alle Reisen holen
  useEffect(() => {
    tripsLaden()
  }, [])

  // Eigene + beigetretene Reisen aus Supabase laden
  const tripsLaden = async () => {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    setCurrentUser(user)

    // Eigene Reisen laden
    const { data: eigeneTrips } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)

    // Beigetretene Reisen über trip_members laden
    const { data: members } = await supabase
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', user.id)

    let beigetreteneTrips = []
    if (members && members.length > 0) {
      const tripIds = members.map(m => m.trip_id)
      const { data } = await supabase
        .from('trips')
        .select('*')
        .in('id', tripIds)
      beigetreteneTrips = data || []
    }

    // Beide Listen zusammenführen
    const alleTrips = [...(eigeneTrips || []), ...beigetreteneTrips]
    setTrips(alleTrips)
    setLaden(false)
  }

  // Neue Reise erstellen + Land auf Karte markieren
  const reiseHinzufuegen = async () => {
    if (!neueReise.name || !neueReise.land_code || !neueReise.startDatum || !neueReise.endDatum) return

    // Datum formatieren z.B. "12.07 - 19.07"
    const formatDatum = (date) =>
    `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`
    const datumText = `${formatDatum(neueReise.startDatum)} - ${formatDatum(neueReise.endDatum)}`

    // User holen
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    // Zufälligen 6-stelligen Einladungscode generieren
    const code = (() => {
      const zeichen = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let result = ''
      for (let i = 0; i < 6; i++) {
        result += zeichen.charAt(Math.floor(Math.random() * zeichen.length))
      }
      return result
    })()

    // Trip in Datenbank speichern
    const { data: tripData, error } = await supabase
      .from('trips')
      .insert([{
        name: neueReise.name,
        land_code: neueReise.land_code,
        datum: datumText,
        user_id: user.id,
        invite_code: code,
      }])
      .select()

    if (error) console.error('Fehler:', error)
    else {
      setTrips([...trips, tripData[0]])

      // Land automatisch auf der Karte markieren
      await supabase.from('visited_countries').insert([{
        user_id: user.id,
        country_code: neueReise.land_code,
        trip_id: tripData[0].id,
      }])

      setNeueReise({ name: '', land_code: '', startDatum: null, endDatum: null })
      setFormularOffen(false)
    }
  }

  // Einer Reise per Einladungscode beitreten
  const reiseBeitreten = async () => {
    if (!einladungsCode) return

    // Trip mit diesem Code suchen
    const { data: trip, error } = await supabase
      .from('trips')
      .select('*')
      .eq('invite_code', einladungsCode.toUpperCase())
      .single()

    if (error || !trip) {
      alert('Code nicht gefunden – bitte prüfe den Code!')
      return
    }

    // User holen
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    // Als Mitglied hinzufügen
    await supabase.from('trip_members').insert([{
      trip_id: trip.id,
      user_id: user.id,
    }])

    // Land automatisch auf der Karte markieren
    await supabase.from('visited_countries').insert([{
      user_id: user.id,
      country_code: trip.land_code,
      trip_id: trip.id,
    }])

    setEinladungsCode('')
    setBeitretenOffen(false)

    // Liste automatisch neu laden
    await tripsLaden()
  }

  // Eigene Reise + alle zugehörigen Daten löschen
  const reiseEntfernen = async (tripId) => {
  await supabase.from('ausgaben').delete().eq('trip_id', tripId)
  await supabase.from('visited_countries').delete().eq('trip_id', tripId)
  await supabase.from('teilnehmer').delete().eq('trip_id', tripId)
  await supabase.from('packliste').delete().eq('trip_id', tripId)
  await supabase.from('trip_links').delete().eq('trip_id', tripId)
  await supabase.from('trip_members').delete().eq('trip_id', tripId)
  const { error } = await supabase.from('trips').delete().eq('id', tripId)
  if (error) console.error('Fehler:', error)
  else setTrips(trips.filter(t => t.id !== tripId))
  }

  // Beigetretene Reise verlassen
  const reiseVerlassen = async (tripId) => {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    // Aus trip_members entfernen
    await supabase.from('trip_members').delete()
      .eq('trip_id', tripId).eq('user_id', user.id)

    // Land von der Karte entfernen
    await supabase.from('visited_countries').delete()
      .eq('trip_id', tripId).eq('user_id', user.id)

    // Sofort aus der Liste entfernen
    setTrips(trips.filter(t => t.id !== tripId))
  }

  if (laden) return <p style={{ color: '#fff', padding: '20px' }}>Lädt...</p>

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', minHeight: '100vh' }}>

      {/* Header mit Logo und Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', letterSpacing: '-0.5px', margin: 0 }}>
          Voy<span style={{ color: '#c9a84c' }}>ag</span>
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setBeitretenOffen(true)} style={{
            backgroundColor: 'transparent', color: '#c9a84c',
            border: '1px solid #c9a84c', padding: '8px 16px',
            borderRadius: '12px', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: '600',
          }}>Beitreten</button>
          <button onClick={() => setFormularOffen(true)} style={{
            backgroundColor: '#c9a84c', color: '#0a0f1e',
            border: 'none', padding: '8px 16px',
            borderRadius: '12px', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: '600',
          }}>+ Neu</button>
        </div>
      </div>

      {/* Section Label */}
      <p style={{
        fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em',
        color: '#8892a4', textTransform: 'uppercase', marginBottom: '16px',
      }}>Meine Reisen</p>

      <div style={{ paddingBottom: '90px' }}>

        {/* Beitreten Formular */}
        {beitretenOffen && (
          <div style={{
            backgroundColor: '#111827', borderRadius: '15px',
            border: '1px solid rgba(201,168,76,0.3)',
            padding: '20px', marginBottom: '12px',
          }}>
            <h3 style={{ marginBottom: '15px', fontWeight: '600' }}>Reise beitreten</h3>
            <input
              placeholder="Einladungscode (z.B. XKQT82)"
              value={einladungsCode}
              onChange={(e) => setEinladungsCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && reiseBeitreten()}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={reiseBeitreten} style={{
                backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
                padding: '12px', borderRadius: '12px', cursor: 'pointer',
                flex: 1, fontWeight: '600',
              }}>Beitreten</button>
              <button onClick={() => setBeitretenOffen(false)} style={{
                backgroundColor: 'transparent', color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '12px', borderRadius: '12px', cursor: 'pointer', flex: 1,
              }}>Abbrechen</button>
            </div>
          </div>
        )}

        {/* Formular für neue Reise */}
        {formularOffen && (
          <div style={{
            backgroundColor: '#111827', borderRadius: '15px',
            border: '1px solid #c9a84c',
            padding: '20px', marginBottom: '12px',
          }}>
            <h3 style={{ marginBottom: '15px', fontWeight: '600' }}>Neue Reise</h3>

            <input
              placeholder="Name (z.B. Mallorca 2025)"
              value={neueReise.name}
              onChange={(e) => setNeueReise({ ...neueReise, name: e.target.value })}
              style={inputStyle}
            />

            {/* Länder Dropdown alphabetisch sortiert */}
            <select
              value={neueReise.land_code}
              onChange={(e) => setNeueReise({ ...neueReise, land_code: e.target.value })}
              style={inputStyle}
            >
              <option value="">Land auswählen...</option>
              {laender.map(land => (
                <option key={land.code} value={land.code}>{land.name}</option>
              ))}
            </select>

            {/* Startdatum Kalender */}
            <DatePicker
              selected={neueReise.startDatum}
              onChange={(date) => setNeueReise({ ...neueReise, startDatum: date })}
              selectsStart
              startDate={neueReise.startDatum}
              endDate={neueReise.endDatum}
              placeholderText="Startdatum"
              locale={de}
              dateFormat="dd.MM.yyyy"
              customInput={<input style={inputStyle} />}
            />

            {/* Enddatum Kalender */}
            <DatePicker
              selected={neueReise.endDatum}
              onChange={(date) => setNeueReise({ ...neueReise, endDatum: date })}
              selectsEnd
              startDate={neueReise.startDatum}
              endDate={neueReise.endDatum}
              minDate={neueReise.startDatum}
              placeholderText="Enddatum"
              locale={de}
              dateFormat="dd.MM.yyyy"
              customInput={<input style={inputStyle} />}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
              <button onClick={reiseHinzufuegen} style={{
                backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
                padding: '12px', borderRadius: '12px', cursor: 'pointer',
                flex: 1, fontWeight: '600',
              }}>Speichern</button>
              <button onClick={() => setFormularOffen(false)} style={{
                backgroundColor: 'transparent', color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '12px', borderRadius: '12px', cursor: 'pointer', flex: 1,
              }}>Abbrechen</button>
            </div>
          </div>
        )}

        {/* Trip Karten */}
        {trips.map(trip => (
          <div key={trip.id} style={{ position: 'relative' }}>
            <div
              onClick={() => navigate(`/trip/${trip.id}`)}
              style={{
                backgroundColor: '#111827', borderRadius: '15px',
                border: '1px solid rgba(201,168,76,0.3)',
                padding: '20px', marginBottom: '12px', cursor: 'pointer',
              }}
            >
              <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: '600' }}>
                {trip.name}
              </h2>
              <p style={{ color: '#8892a4', margin: '0 0 8px', fontSize: '0.9rem' }}>
                {laender.find(l => l.code === trip.land_code)?.name || trip.ort} · {trip.datum}
              </p>

              {/* Einladungscode – nur bei eigenen Reisen */}
              {trip.user_id === currentUser?.id && trip.invite_code && (
                <span style={{
                  backgroundColor: '#1a2235', color: '#c9a84c',
                  padding: '3px 10px', borderRadius: '8px',
                  fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.1em',
                }}>
                  {trip.invite_code}
                </span>
              )}

              {/* Badge für beigetretene Reisen */}
              {trip.user_id !== currentUser?.id && (
                <span style={{
                  backgroundColor: '#1a2235', color: '#8892a4',
                  padding: '3px 10px', borderRadius: '8px',
                  fontSize: '0.8rem', fontWeight: '600',
                }}>
                  Beigetreten
                </span>
              )}
            </div>

            {/* Löschen bei eigener Reise, Verlassen bei beigetretener */}
            {trip.user_id === currentUser?.id ? (
              <button
                onClick={(e) => { e.stopPropagation(); reiseEntfernen(trip.id) }}
                style={{
                  position: 'absolute', top: '12px', right: '12px',
                  backgroundColor: 'transparent', border: 'none',
                  color: '#8892a4', padding: '4px', cursor: 'pointer',
                }}
              >
                <Trash2 size={16} />
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); reiseVerlassen(trip.id) }}
                style={{
                  position: 'absolute', top: '12px', right: '12px',
                  backgroundColor: 'transparent', border: 'none',
                  color: '#8892a4', padding: '4px', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: '600',
                }}
              >
                Verlassen
              </button>
            )}
          </div>
        ))}

        {/* Leerer Zustand */}
        {trips.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8892a4' }}>
            <p style={{ marginBottom: '12px' }}><Plane size={48} /></p>
            <p style={{ fontWeight: '600', color: '#fff', marginBottom: '8px' }}>
              Noch keine Reisen
            </p>
            <p style={{ fontSize: '0.9rem' }}>
              Tippe auf "+ Neu" um deine erste Reise hinzuzufügen!
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '12px',
  backgroundColor: '#1a2235',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', color: '#ffffff',
  fontSize: '1rem', marginBottom: '10px',
  boxSizing: 'border-box',
}

export default TripsOverview