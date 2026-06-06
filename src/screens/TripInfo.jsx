import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import { Plane, Hotel, Link, Plus, Trash2 } from 'lucide-react'

function TripInfo() {
  const { id } = useParams()
  const [trip, setTrip] = useState(null)
  const [laden, setLaden] = useState(true)

  // State für Links
  const [links, setLinks] = useState([])
  const [neuerLink, setNeuerLink] = useState({ titel: '', url: '' })
  const [linkFormularOffen, setLinkFormularOffen] = useState(false)

  // State für Fluginfos
  const [flug, setFlug] = useState({ flugnummer: '', abflug: '', ankunft: '' })
  const [flugBearbeiten, setFlugBearbeiten] = useState(false)

  // State für Hotelinfos
  const [hotel, setHotel] = useState({ name: '', adresse: '', checkin: '', checkout: '' })
  const [hotelBearbeiten, setHotelBearbeiten] = useState(false)

  useEffect(() => {
    const datenLaden = async () => {
      const { data: tripData } = await supabase
        .from('trips').select('*').eq('id', id).single()
      setTrip(tripData)

      // Gespeicherte Infos laden falls vorhanden
      if (tripData.flug) setFlug(tripData.flug)
      if (tripData.hotel) setHotel(tripData.hotel)

      // Links laden
      const { data: linksData } = await supabase
        .from('trip_links').select('*').eq('trip_id', id)
      setLinks(linksData || [])

      setLaden(false)
    }
    datenLaden()
  }, [id])

  // Fluginfos speichern
  const flugSpeichern = async () => {
    await supabase.from('trips').update({ flug }).eq('id', id)
    setFlugBearbeiten(false)
  }

  // Hotelinfos speichern
  const hotelSpeichern = async () => {
    await supabase.from('trips').update({ hotel }).eq('id', id)
    setHotelBearbeiten(false)
  }

  // Link hinzufügen
  const linkHinzufuegen = async () => {
    if (!neuerLink.titel || !neuerLink.url) return
    const url = neuerLink.url.startsWith('http') ? neuerLink.url : `https://${neuerLink.url}`
    const { data, error } = await supabase
      .from('trip_links')
      .insert([{ trip_id: id, titel: neuerLink.titel, url }])
      .select()
    if (error) console.error('Fehler:', error)
    else {
      setLinks([...links, data[0]])
      setNeuerLink({ titel: '', url: '' })
      setLinkFormularOffen(false)
    }
  }

  // Link löschen
  const linkLoeschen = async (linkId) => {
    await supabase.from('trip_links').delete().eq('id', linkId)
    setLinks(links.filter(l => l.id !== linkId))
  }

  if (laden) return <p style={{ color: '#fff', padding: '20px' }}>Lädt...</p>

  return (
    <div style={{ paddingBottom: '40px' }}>
      <TripNav tripName={trip.name} />

      <div style={{ padding: '0 20px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Fluginfos */}
        <div style={karteStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plane size={18} color="#c9a84c" />
              <h3 style={{ margin: 0, fontWeight: '600' }}>Flug</h3>
            </div>
            <button onClick={() => setFlugBearbeiten(!flugBearbeiten)} style={editButtonStyle}>
              {flugBearbeiten ? 'Abbrechen' : 'Bearbeiten'}
            </button>
          </div>

          {flugBearbeiten ? (
            <>
              <input placeholder="Flugnummer (z.B. FR1234)" value={flug.flugnummer}
                onChange={(e) => setFlug({ ...flug, flugnummer: e.target.value })}
                style={inputStyle} />
              <input placeholder="Abflug (z.B. 06:30 MUC)" value={flug.abflug}
                onChange={(e) => setFlug({ ...flug, abflug: e.target.value })}
                style={inputStyle} />
              <input placeholder="Ankunft (z.B. 09:45 ATH)" value={flug.ankunft}
                onChange={(e) => setFlug({ ...flug, ankunft: e.target.value })}
                style={inputStyle} />
              <button onClick={flugSpeichern} style={speichernButtonStyle}>Speichern</button>
            </>
          ) : (
            <>
              {flug.flugnummer || flug.abflug || flug.ankunft ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {flug.flugnummer && <InfoZeile label="Flugnummer" wert={flug.flugnummer} />}
                  {flug.abflug && <InfoZeile label="Abflug" wert={flug.abflug} />}
                  {flug.ankunft && <InfoZeile label="Ankunft" wert={flug.ankunft} />}
                </div>
              ) : (
                <p style={{ color: '#8892a4', fontSize: '0.9rem', margin: 0 }}>
                  Noch keine Fluginfos – tippe auf Bearbeiten!
                </p>
              )}
            </>
          )}
        </div>

        {/* Hotelinfos */}
        <div style={karteStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Hotel size={18} color="#c9a84c" />
              <h3 style={{ margin: 0, fontWeight: '600' }}>Unterkunft</h3>
            </div>
            <button onClick={() => setHotelBearbeiten(!hotelBearbeiten)} style={editButtonStyle}>
              {hotelBearbeiten ? 'Abbrechen' : 'Bearbeiten'}
            </button>
          </div>

          {hotelBearbeiten ? (
            <>
              <input placeholder="Name (z.B. Hotel Miramare)" value={hotel.name}
                onChange={(e) => setHotel({ ...hotel, name: e.target.value })}
                style={inputStyle} />
              <input placeholder="Adresse" value={hotel.adresse}
                onChange={(e) => setHotel({ ...hotel, adresse: e.target.value })}
                style={inputStyle} />
              <input placeholder="Check-in (z.B. 14:00)" value={hotel.checkin}
                onChange={(e) => setHotel({ ...hotel, checkin: e.target.value })}
                style={inputStyle} />
              <input placeholder="Check-out (z.B. 11:00)" value={hotel.checkout}
                onChange={(e) => setHotel({ ...hotel, checkout: e.target.value })}
                style={inputStyle} />
              <button onClick={hotelSpeichern} style={speichernButtonStyle}>Speichern</button>
            </>
          ) : (
            <>
              {hotel.name || hotel.adresse ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {hotel.name && <InfoZeile label="Name" wert={hotel.name} />}
                  {hotel.adresse && <InfoZeile label="Adresse" wert={hotel.adresse} />}
                  {hotel.checkin && <InfoZeile label="Check-in" wert={hotel.checkin} />}
                  {hotel.checkout && <InfoZeile label="Check-out" wert={hotel.checkout} />}
                </div>
              ) : (
                <p style={{ color: '#8892a4', fontSize: '0.9rem', margin: 0 }}>
                  Noch keine Unterkunft – tippe auf Bearbeiten!
                </p>
              )}
            </>
          )}
        </div>

        {/* Links */}
        <div style={karteStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link size={18} color="#c9a84c" />
              <h3 style={{ margin: 0, fontWeight: '600' }}>Links</h3>
            </div>
            <button onClick={() => setLinkFormularOffen(!linkFormularOffen)} style={editButtonStyle}>
              {linkFormularOffen ? 'Abbrechen' : '+ Link'}
            </button>
          </div>

          {linkFormularOffen && (
            <div style={{ marginBottom: '12px' }}>
              <input placeholder="Titel (z.B. Hotel Booking)" value={neuerLink.titel}
                onChange={(e) => setNeuerLink({ ...neuerLink, titel: e.target.value })}
                style={inputStyle} />
              <input placeholder="URL (z.B. booking.com/...)" value={neuerLink.url}
                onChange={(e) => setNeuerLink({ ...neuerLink, url: e.target.value })}
                style={inputStyle} />
              <button onClick={linkHinzufuegen} style={speichernButtonStyle}>Hinzufügen</button>
            </div>
          )}

          {links.length === 0 ? (
            <p style={{ color: '#8892a4', fontSize: '0.9rem', margin: 0 }}>
              Noch keine Links gespeichert
            </p>
          ) : (
            links.map(link => (
              <div key={link.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: '#1a2235', borderRadius: '10px',
                padding: '10px 14px', marginBottom: '8px',
              }}>
                <a href={link.url} target="_blank" rel="noreferrer" style={{
                  color: '#c9a84c', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500',
                }}>
                  {link.titel}
                </a>
                <button onClick={() => linkLoeschen(link.id)} style={{
                  background: 'none', border: 'none', color: '#8892a4',
                  cursor: 'pointer', padding: 0,
                }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}

// Wiederverwendbare Info-Zeile
function InfoZeile({ label, wert }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a2235' }}>
      <span style={{ color: '#8892a4', fontSize: '0.9rem' }}>{label}</span>
      <span style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '500' }}>{wert}</span>
    </div>
  )
}

const karteStyle = {
  backgroundColor: '#111827', borderRadius: '15px',
  border: '1px solid rgba(201,168,76,0.15)',
  padding: '20px', marginBottom: '15px',
}

const inputStyle = {
  width: '100%', padding: '12px', backgroundColor: '#1a2235',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
  color: '#ffffff', fontSize: '1rem', marginBottom: '10px', boxSizing: 'border-box',
}

const editButtonStyle = {
  backgroundColor: 'transparent', border: '1px solid rgba(201,168,76,0.3)',
  color: '#c9a84c', padding: '6px 12px', borderRadius: '8px',
  cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
}

const speichernButtonStyle = {
  backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
  padding: '12px', borderRadius: '12px', cursor: 'pointer',
  width: '100%', fontWeight: '600', fontSize: '1rem',
}

export default TripInfo