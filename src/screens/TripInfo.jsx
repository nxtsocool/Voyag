import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import { Plane, Hotel, Link, Trash2, NotebookPen, Plus, SquarePen } from 'lucide-react'

function TripInfo() {
  const { id } = useParams()
  const [trip, setTrip] = useState(null)
  const [laden, setLaden] = useState(true)

  // State für Flüge
  const [fluege, setFluege] = useState([])
  const [flugFormularOffen, setFlugFormularOffen] = useState(false)
  const [bearbeiteFlug, setBearbeiteFlug] = useState(null)
  const [neuerFlug, setNeuerFlug] = useState({ titel: '', flugnummer: '', abflug: '', ankunft: '' })

  // State für Unterkünfte
  const [unterkuenfte, setUnterkuenfte] = useState([])
  const [unterkunftFormularOffen, setUnterkunftFormularOffen] = useState(false)
  const [bearbeiteUnterkunft, setBearbeiteUnterkunft] = useState(null)
  const [neueUnterkunft, setNeueUnterkunft] = useState({ titel: '', name: '', adresse: '', checkin: '', checkout: '' })

  // State für Links
  const [links, setLinks] = useState([])
  const [neuerLink, setNeuerLink] = useState({ titel: '', url: '' })
  const [linkFormularOffen, setLinkFormularOffen] = useState(false)

  // State für Notizen
  const [notizen, setNotizen] = useState('')
  const [notizenBearbeiten, setNotizenBearbeiten] = useState(false)

  useEffect(() => {
    const datenLaden = async () => {
      const { data: tripData } = await supabase
        .from('trips').select('*').eq('id', id).single()
      setTrip(tripData)
      if (tripData.notizen) setNotizen(tripData.notizen)
      else setNotizen('')

      const { data: fluegeData } = await supabase
        .from('trip_fluege').select('*').eq('trip_id', id)
      setFluege(fluegeData || [])

      const { data: unterkuenfteData } = await supabase
        .from('trip_unterkuenfte').select('*').eq('trip_id', id)
      setUnterkuenfte(unterkuenfteData || [])

      const { data: linksData } = await supabase
        .from('trip_links').select('*').eq('trip_id', id)
      setLinks(linksData || [])

      setLaden(false)
    }
    datenLaden()
  }, [id])

  // Flug hinzufügen
  const flugHinzufuegen = async () => {
    if (!neuerFlug.titel) return
    const { data, error } = await supabase
      .from('trip_fluege')
      .insert([{ ...neuerFlug, trip_id: id }])
      .select()
    if (error) console.error('Fehler:', error)
    else {
      setFluege([...fluege, data[0]])
      setNeuerFlug({ titel: '', flugnummer: '', abflug: '', ankunft: '' })
      setFlugFormularOffen(false)
    }
  }

  // Flug speichern
  const flugSpeichern = async () => {
    if (!bearbeiteFlug) return
    const { error } = await supabase
      .from('trip_fluege')
      .update({
        titel: bearbeiteFlug.titel,
        flugnummer: bearbeiteFlug.flugnummer,
        abflug: bearbeiteFlug.abflug,
        ankunft: bearbeiteFlug.ankunft,
      })
      .eq('id', bearbeiteFlug.id)
    if (error) console.error('Fehler:', error)
    else {
      setFluege(fluege.map(f => f.id === bearbeiteFlug.id ? bearbeiteFlug : f))
      setBearbeiteFlug(null)
    }
  }

  // Flug löschen
  const flugLoeschen = async (flugId) => {
    await supabase.from('trip_fluege').delete().eq('id', flugId)
    setFluege(fluege.filter(f => f.id !== flugId))
  }

  // Unterkunft hinzufügen
  const unterkunftHinzufuegen = async () => {
    if (!neueUnterkunft.titel) return
    const { data, error } = await supabase
      .from('trip_unterkuenfte')
      .insert([{ ...neueUnterkunft, trip_id: id }])
      .select()
    if (error) console.error('Fehler:', error)
    else {
      setUnterkuenfte([...unterkuenfte, data[0]])
      setNeueUnterkunft({ titel: '', name: '', adresse: '', checkin: '', checkout: '' })
      setUnterkunftFormularOffen(false)
    }
  }

  // Unterkunft speichern
  const unterkunftSpeichern = async () => {
    if (!bearbeiteUnterkunft) return
    const { error } = await supabase
      .from('trip_unterkuenfte')
      .update({
        titel: bearbeiteUnterkunft.titel,
        name: bearbeiteUnterkunft.name,
        adresse: bearbeiteUnterkunft.adresse,
        checkin: bearbeiteUnterkunft.checkin,
        checkout: bearbeiteUnterkunft.checkout,
      })
      .eq('id', bearbeiteUnterkunft.id)
    if (error) console.error('Fehler:', error)
    else {
      setUnterkuenfte(unterkuenfte.map(u => u.id === bearbeiteUnterkunft.id ? bearbeiteUnterkunft : u))
      setBearbeiteUnterkunft(null)
    }
  }

  // Unterkunft löschen
  const unterkunftLoeschen = async (unterkunftId) => {
    await supabase.from('trip_unterkuenfte').delete().eq('id', unterkunftId)
    setUnterkuenfte(unterkuenfte.filter(u => u.id !== unterkunftId))
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

  // Notizen speichern
  const notizenSpeichern = async () => {
    await supabase.from('trips').update({ notizen: notizen || null }).eq('id', id)
    setNotizenBearbeiten(false)
  }

  if (laden) return <p style={{ color: '#fff', padding: '20px' }}>Lädt...</p>

  return (
    <div style={{ paddingBottom: '40px' }}>
      <TripNav tripName={trip.name} />

      <div style={{ padding: '0 clamp(14px, 4vw, 20px)', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Flüge */}
        <div style={karteStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plane size={18} color="#c9a84c" />
              <h3 style={{ margin: 0, fontWeight: '600' }}>Flüge</h3>
            </div>
            <button onClick={() => setFlugFormularOffen(!flugFormularOffen)} style={editButtonStyle}>
              {flugFormularOffen ? 'Abbrechen' : '+ Flug'}
            </button>
          </div>

          {/* Flug Formular */}
          {flugFormularOffen && (
            <div style={{ marginBottom: '12px' }}>
              <input placeholder="Titel (z.B. Hinflug)" value={neuerFlug.titel}
                onChange={(e) => setNeuerFlug({ ...neuerFlug, titel: e.target.value })}
                style={inputStyle} />
              <input placeholder="Flugnummer (z.B. FR1234)" value={neuerFlug.flugnummer}
                onChange={(e) => setNeuerFlug({ ...neuerFlug, flugnummer: e.target.value })}
                style={inputStyle} />
              <input placeholder="Abflug (z.B. 06:30 MUC)" value={neuerFlug.abflug}
                onChange={(e) => setNeuerFlug({ ...neuerFlug, abflug: e.target.value })}
                style={inputStyle} />
              <input placeholder="Ankunft (z.B. 09:45 ATH)" value={neuerFlug.ankunft}
                onChange={(e) => setNeuerFlug({ ...neuerFlug, ankunft: e.target.value })}
                style={inputStyle} />
              <button onClick={flugHinzufuegen} style={speichernButtonStyle}>Hinzufügen</button>
            </div>
          )}

          {/* Flüge Liste */}
          {fluege.length === 0 ? (
            <p style={{ color: '#8892a4', fontSize: '0.9rem', margin: 0 }}>
              Noch keine Flüge – tippe auf "+ Flug"!
            </p>
          ) : (
            fluege.map(flug => (
              <div key={flug.id} style={{ marginBottom: '12px' }}>
                {bearbeiteFlug?.id === flug.id ? (
                  <div>
                    <input placeholder="Titel" value={bearbeiteFlug.titel}
                      onChange={(e) => setBearbeiteFlug({ ...bearbeiteFlug, titel: e.target.value })}
                      style={inputStyle} />
                    <input placeholder="Flugnummer" value={bearbeiteFlug.flugnummer}
                      onChange={(e) => setBearbeiteFlug({ ...bearbeiteFlug, flugnummer: e.target.value })}
                      style={inputStyle} />
                    <input placeholder="Abflug" value={bearbeiteFlug.abflug}
                      onChange={(e) => setBearbeiteFlug({ ...bearbeiteFlug, abflug: e.target.value })}
                      style={inputStyle} />
                    <input placeholder="Ankunft" value={bearbeiteFlug.ankunft}
                      onChange={(e) => setBearbeiteFlug({ ...bearbeiteFlug, ankunft: e.target.value })}
                      style={inputStyle} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={flugSpeichern} style={{
                        ...speichernButtonStyle, flex: 1, padding: '10px',
                      }}>Speichern</button>
                      <button onClick={() => setBearbeiteFlug(null)} style={{
                        flex: 1, padding: '10px', backgroundColor: 'transparent',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff', borderRadius: '12px', cursor: 'pointer',
                      }}>Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#1a2235', borderRadius: '10px', padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <p style={{ fontWeight: '600', margin: 0, color: '#c9a84c', minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>{flug.titel}</p>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setBearbeiteFlug(flug)} style={ikonButtonStyle('#c9a84c', 'rgba(201,168,76,0.2)')}>
                          <SquarePen size={14} />
                        </button>
                        <button onClick={() => flugLoeschen(flug.id)} style={ikonButtonStyle('#e94560', 'rgba(233,69,96,0.2)')}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {flug.flugnummer && <InfoZeile label="Flugnummer" wert={flug.flugnummer} />}
                    {flug.abflug && <InfoZeile label="Abflug" wert={flug.abflug} />}
                    {flug.ankunft && <InfoZeile label="Ankunft" wert={flug.ankunft} />}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Unterkünfte */}
        <div style={karteStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Hotel size={18} color="#c9a84c" />
              <h3 style={{ margin: 0, fontWeight: '600' }}>Unterkünfte</h3>
            </div>
            <button onClick={() => setUnterkunftFormularOffen(!unterkunftFormularOffen)} style={editButtonStyle}>
              {unterkunftFormularOffen ? 'Abbrechen' : '+ Unterkunft'}
            </button>
          </div>

          {/* Unterkunft Formular */}
          {unterkunftFormularOffen && (
            <div style={{ marginBottom: '12px' }}>
              <input placeholder="Titel (z.B. Hotel Woche 1)" value={neueUnterkunft.titel}
                onChange={(e) => setNeueUnterkunft({ ...neueUnterkunft, titel: e.target.value })}
                style={inputStyle} />
              <input placeholder="Name (z.B. Hotel Miramare)" value={neueUnterkunft.name}
                onChange={(e) => setNeueUnterkunft({ ...neueUnterkunft, name: e.target.value })}
                style={inputStyle} />
              <input placeholder="Adresse" value={neueUnterkunft.adresse}
                onChange={(e) => setNeueUnterkunft({ ...neueUnterkunft, adresse: e.target.value })}
                style={inputStyle} />
              <input placeholder="Check-in (z.B. 14:00)" value={neueUnterkunft.checkin}
                onChange={(e) => setNeueUnterkunft({ ...neueUnterkunft, checkin: e.target.value })}
                style={inputStyle} />
              <input placeholder="Check-out (z.B. 11:00)" value={neueUnterkunft.checkout}
                onChange={(e) => setNeueUnterkunft({ ...neueUnterkunft, checkout: e.target.value })}
                style={inputStyle} />
              <button onClick={unterkunftHinzufuegen} style={speichernButtonStyle}>Hinzufügen</button>
            </div>
          )}

          {/* Unterkünfte Liste */}
          {unterkuenfte.length === 0 ? (
            <p style={{ color: '#8892a4', fontSize: '0.9rem', margin: 0 }}>
              Noch keine Unterkünfte – tippe auf "+ Unterkunft"!
            </p>
          ) : (
            unterkuenfte.map(unterkunft => (
              <div key={unterkunft.id} style={{ marginBottom: '12px' }}>
                {bearbeiteUnterkunft?.id === unterkunft.id ? (
                  <div>
                    <input placeholder="Titel" value={bearbeiteUnterkunft.titel}
                      onChange={(e) => setBearbeiteUnterkunft({ ...bearbeiteUnterkunft, titel: e.target.value })}
                      style={inputStyle} />
                    <input placeholder="Name" value={bearbeiteUnterkunft.name}
                      onChange={(e) => setBearbeiteUnterkunft({ ...bearbeiteUnterkunft, name: e.target.value })}
                      style={inputStyle} />
                    <input placeholder="Adresse" value={bearbeiteUnterkunft.adresse}
                      onChange={(e) => setBearbeiteUnterkunft({ ...bearbeiteUnterkunft, adresse: e.target.value })}
                      style={inputStyle} />
                    <input placeholder="Check-in" value={bearbeiteUnterkunft.checkin}
                      onChange={(e) => setBearbeiteUnterkunft({ ...bearbeiteUnterkunft, checkin: e.target.value })}
                      style={inputStyle} />
                    <input placeholder="Check-out" value={bearbeiteUnterkunft.checkout}
                      onChange={(e) => setBearbeiteUnterkunft({ ...bearbeiteUnterkunft, checkout: e.target.value })}
                      style={inputStyle} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={unterkunftSpeichern} style={{
                        ...speichernButtonStyle, flex: 1, padding: '10px',
                      }}>Speichern</button>
                      <button onClick={() => setBearbeiteUnterkunft(null)} style={{
                        flex: 1, padding: '10px', backgroundColor: 'transparent',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff', borderRadius: '12px', cursor: 'pointer',
                      }}>Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#1a2235', borderRadius: '10px', padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <p style={{ fontWeight: '600', margin: 0, color: '#c9a84c', minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>{unterkunft.titel}</p>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setBearbeiteUnterkunft(unterkunft)} style={ikonButtonStyle('#c9a84c', 'rgba(201,168,76,0.2)')}>
                          <SquarePen size={14} />
                        </button>
                        <button onClick={() => unterkunftLoeschen(unterkunft.id)} style={ikonButtonStyle('#e94560', 'rgba(233,69,96,0.2)')}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {unterkunft.name && <InfoZeile label="Name" wert={unterkunft.name} />}
                    {unterkunft.adresse && <InfoZeile label="Adresse" wert={unterkunft.adresse} />}
                    {unterkunft.checkin && <InfoZeile label="Check-in" wert={unterkunft.checkin} />}
                    {unterkunft.checkout && <InfoZeile label="Check-out" wert={unterkunft.checkout} />}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Links */}
        <div style={karteStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
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
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                backgroundColor: '#1a2235', borderRadius: '10px',
                padding: '10px 14px', marginBottom: '8px',
              }}>
                <a href={link.url} target="_blank" rel="noreferrer" style={{
                  color: '#c9a84c', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500',
                  minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word',
                }}>
                  {link.titel}
                </a>
                <button onClick={() => linkLoeschen(link.id)} style={{
                  background: 'none', border: 'none', color: '#8892a4',
                  cursor: 'pointer', padding: '10px', margin: '-10px',
                  minWidth: '40px', minHeight: '40px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Notizen */}
        <div style={karteStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <NotebookPen size={18} color="#c9a84c" />
              <h3 style={{ margin: 0, fontWeight: '600' }}>Notizen</h3>
            </div>
            <button onClick={() => setNotizenBearbeiten(!notizenBearbeiten)} style={editButtonStyle}>
              {notizenBearbeiten ? 'Abbrechen' : 'Bearbeiten'}
            </button>
          </div>

          {notizenBearbeiten ? (
            <>
              <textarea value={notizen}
                onChange={(e) => setNotizen(e.target.value)}
                placeholder="Notizen zur Reise..."
                rows={5}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
              <button onClick={notizenSpeichern} style={speichernButtonStyle}>Speichern</button>
            </>
          ) : (
            <p style={{
              color: notizen ? '#ffffff' : '#8892a4',
              fontSize: '0.9rem', margin: 0, whiteSpace: 'pre-wrap',
            }}>
              {notizen || 'Noch keine Notizen – tippe auf Bearbeiten!'}
            </p>
          )}
        </div>

      </div>
    </div>
  )
}

function InfoZeile({ label, wert }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px 12px',
      padding: '6px 0', borderBottom: '1px solid #111827',
    }}>
      <span style={{ color: '#8892a4', fontSize: '0.85rem', flexShrink: 0 }}>{label}</span>
      <span style={{
        color: '#ffffff', fontSize: '0.85rem', fontWeight: '500',
        textAlign: 'right', overflowWrap: 'break-word', wordBreak: 'break-word',
      }}>{wert}</span>
    </div>
  )
}

const karteStyle = {
  backgroundColor: '#111827', borderRadius: '15px',
  border: '1px solid rgba(201,168,76,0.15)',
  padding: 'clamp(14px, 4vw, 20px)', marginBottom: '15px', boxSizing: 'border-box',
}

const inputStyle = {
  width: '100%', padding: '12px', backgroundColor: '#1a2235',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
  color: '#ffffff', fontSize: '1rem', marginBottom: '10px', boxSizing: 'border-box',
}

const editButtonStyle = {
  backgroundColor: 'transparent', border: '1px solid rgba(201,168,76,0.3)',
  color: '#c9a84c', padding: '10px 14px', minHeight: '40px', borderRadius: '8px',
  cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
  display: 'flex', alignItems: 'center', boxSizing: 'border-box',
}

const speichernButtonStyle = {
  backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
  padding: '14px', minHeight: '44px', borderRadius: '12px', cursor: 'pointer',
  width: '100%', fontWeight: '600', fontSize: '1rem', boxSizing: 'border-box',
}

const ikonButtonStyle = (color, border) => ({
  backgroundColor: 'transparent', border: `1px solid ${border}`,
  color, cursor: 'pointer', padding: '6px', borderRadius: '8px',
  minWidth: '40px', minHeight: '40px', boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})

export default TripInfo