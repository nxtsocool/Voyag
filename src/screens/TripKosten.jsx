import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import { Wallet, Trash2, SquarePen } from 'lucide-react'

function TripKosten() {
  const { id } = useParams()

  const [trip, setTrip] = useState(null)
  const [ausgaben, setAusgaben] = useState([])
  const [teilnehmer, setTeilnehmer] = useState([])
  const [laden, setLaden] = useState(true)
  const [formularOffen, setFormularOffen] = useState(false)
  const [bearbeiteAusgabe, setBearbeiteAusgabe] = useState(null)

  // Eingabefelder für neue Ausgabe
  const [neueAusgabe, setNeueAusgabe] = useState({
    beschreibung: '', betrag: '', bezahlt_von: '', fuer: []
  })

  // Trip, Ausgaben und Teilnehmer aus Supabase laden
  useEffect(() => {
    const datenLaden = async () => {
      const { data: tripData } = await supabase
        .from('trips').select('*').eq('id', id).single()
      setTrip(tripData)

      const { data: ausgabenData } = await supabase
        .from('ausgaben').select('*').eq('trip_id', id)
      setAusgaben(ausgabenData || [])

      const { data: teilnehmerData } = await supabase
        .from('teilnehmer').select('*').eq('trip_id', id)
      setTeilnehmer(teilnehmerData || [])

      setLaden(false)
    }
    datenLaden()
  }, [id])

  // Gesamtbetrag aller Ausgaben berechnen
  const gesamt = ausgaben.reduce((sum, a) => sum + a.betrag, 0)

  // Neue Ausgabe in Supabase speichern
  const ausgabeHinzufuegen = async () => {
    if (!neueAusgabe.beschreibung || !neueAusgabe.betrag || !neueAusgabe.bezahlt_von) return

    const { data, error } = await supabase
      .from('ausgaben')
      .insert([{
        beschreibung: neueAusgabe.beschreibung,
        betrag: parseFloat(neueAusgabe.betrag),
        bezahlt_von: neueAusgabe.bezahlt_von,
        trip_id: id,
        // null = für alle, sonst nur für ausgewählte Personen
        fuer: neueAusgabe.fuer.length > 0 ? neueAusgabe.fuer : null,
      }])
      .select()

    if (error) console.error('Fehler:', error)
    else {
      setAusgaben([...ausgaben, data[0]])
      setNeueAusgabe({ beschreibung: '', betrag: '', bezahlt_von: '', fuer: [] })
      setFormularOffen(false)
    }
  }

  //Ausgabe löschen 
  const ausgabeLoeschen = async (id) => {
    const { error } = await supabase
      .from('ausgaben')
      .delete()
      .eq('id', id)

    if (error) console.error('Fehler:', error)
    else setAusgaben(ausgaben.filter(a => a.id !== id))
  }

  //Ausgabe bearbeiten 
  const ausgabeBearbeiten = async (id, updates) => {
    const { error } = await supabase
      .from('ausgaben')
      .update(updates)
      .eq('id', id)

    if (error) console.error('Fehler:', error)
    else {
      setAusgaben(ausgaben.map(a => a.id === id ? { ...a, ...updates } : a))
    }
  }

  // Hilfsfunktion – berechnet den Anteil einer Person an einer Ausgabe
    function anteilBerechnen(ausgabe, personName) {
    // fuer als Array parsen – Supabase gibt es manchmal als String zurück
    let fuerArray = ausgabe.fuer
    if (typeof fuerArray === 'string') {
      try { fuerArray = JSON.parse(fuerArray)}  catch { fuerArray = null} 
    }

    // Wenn fuer null/leer → für alle Teilnehmer
    const betroffene = (fuerArray && fuerArray.length > 0)
      ? fuerArray
      : teilnehmer.map(t => t.name)

    if (betroffene.includes(personName)) {
      return ausgabe.betrag / betroffene.length
    }
    return 0
  }

  // Berechnet wer wem wie viel schuldet
  const schuldenBerechnen = () => {
    if (teilnehmer.length === 0 || gesamt === 0) return []
    const schulden = []

    teilnehmer.forEach(person => {
      // Was hat diese Person bezahlt?
      const bezahlt = ausgaben
        .filter(a => a.bezahlt_von === person.name)
        .reduce((sum, a) => sum + a.betrag, 0)

      // Was ist der Anteil dieser Person?
      const anteil = ausgaben.reduce((sum, a) => 
        sum + anteilBerechnen(a, person.name), 0)

      const differenz = bezahlt - anteil

      if (differenz < -0.01) {
        // Person hat zu wenig bezahlt → suche Gläubiger
        const glaeubiger = teilnehmer.find(p => {
          const pBezahlt = ausgaben
            .filter(a => a.bezahlt_von === p.name)
            .reduce((sum, a) => sum + a.betrag, 0)
          const pAnteil = ausgaben.reduce((sum, a) => 
            sum + anteilBerechnen(a, p.name), 0)
          return pBezahlt - pAnteil > 0.01
        })
        if (glaeubiger) {
          schulden.push({
            von: person.name,
            an: glaeubiger.name,
            betrag: Math.abs(differenz).toFixed(2)
          })
        }
      }
    })
    return schulden
  }

  const schulden = schuldenBerechnen()

  if (laden) return <p style={{ color: '#fff', padding: '20px' }}>Lädt...</p>

  return (
    <div style={{ paddingBottom: '40px' }}>
      <TripNav tripName={trip.name} />

      <div style={{ padding: '0 clamp(14px, 4vw, 20px)', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Gesamtbetrag Karte */}
        <div style={karteStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Wallet size={18} color="#c9a84c" />
            <p style={{ color: '#8892a4', margin: 0 }}>Gesamtausgaben</p>
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 9vw, 2.5rem)', color: '#c9a84c', margin: '0 0 8px', overflowWrap: 'break-word' }}>
            {gesamt.toFixed(2)}€
          </h2>
          {teilnehmer.length > 0 && (
            <p style={{ color: '#8892a4', fontSize: '0.85rem', margin: 0 }}>
              {teilnehmer.length} Teilnehmer · {(gesamt / teilnehmer.length).toFixed(2)}€ pro Person
            </p>
          )}
        </div>

        {/* Ausgaben Liste */}
        {ausgaben.length === 0 ? (
          <p style={{ color: '#8892a4', textAlign: 'center', marginBottom: '15px' }}>
            Noch keine Ausgaben – füge die erste hinzu!
          </p>
        ) : (
          ausgaben.map(ausgabe => (
            <div key={ausgabe.id} style={{ ...karteStyle }}>             
              {/* Bearbeiten Formular */}
              {bearbeiteAusgabe?.id === ausgabe.id ? (
                <div>
                  <input
                    value={bearbeiteAusgabe.beschreibung}
                    onChange={(e) => setBearbeiteAusgabe({ ...bearbeiteAusgabe, beschreibung: e.target.value })}
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    value={bearbeiteAusgabe.betrag}
                    onChange={(e) => setBearbeiteAusgabe({ ...bearbeiteAusgabe, betrag: e.target.value })}
                    style={inputStyle}
                  />
                  <select
                    value={bearbeiteAusgabe.bezahlt_von}
                    onChange={(e) => setBearbeiteAusgabe({ ...bearbeiteAusgabe, bezahlt_von: e.target.value })}
                    style={inputStyle}
                  >
                    {teilnehmer.map(person => (
                      <option key={person.id} value={person.name}>{person.name}</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button onClick={async () => {
                      await ausgabeBearbeiten(ausgabe.id, {
                        beschreibung: bearbeiteAusgabe.beschreibung,
                        betrag: parseFloat(bearbeiteAusgabe.betrag),
                        bezahlt_von: bearbeiteAusgabe.bezahlt_von,
                      })
                      setBearbeiteAusgabe(null)
                    }} style={{
                      backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
                      padding: '12px', minHeight: '44px', borderRadius: '10px', cursor: 'pointer',
                      flex: 1, fontWeight: '600', boxSizing: 'border-box',
                    }}>Speichern</button>
                    <button onClick={() => setBearbeiteAusgabe(null)} style={{
                      backgroundColor: 'transparent', color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      padding: '12px', minHeight: '44px', borderRadius: '10px', cursor: 'pointer',
                      flex: 1, boxSizing: 'border-box',
                    }}>Abbrechen</button>
                  </div>
                </div>
              ) : (
                /* Normale Ansicht */
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <p style={{ fontWeight: '600', margin: '0 0 4px', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{ausgabe.beschreibung}</p>
                    <p style={{ color: '#8892a4', fontSize: '0.85rem', margin: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                      bezahlt von {ausgabe.bezahlt_von}
                      {ausgabe.fuer && ausgabe.fuer.length > 0 && (
                        <span> · für {Array.isArray(ausgabe.fuer) ? ausgabe.fuer.join(', ') : ausgabe.fuer}</span>
                      )}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>
                    <p style={{ fontSize: '1.1rem', color: '#c9a84c', margin: 0, fontWeight: '600', whiteSpace: 'nowrap' }}>
                      {ausgabe.betrag}€
                    </p>
                    <button onClick={() => ausgabeLoeschen(ausgabe.id)} style={{
                      backgroundColor: 'transparent', border: '1px solid rgba(233,69,96,0.2)',
                      color: '#e94560', cursor: 'pointer', padding: '6px',
                      minWidth: '40px', minHeight: '40px', boxSizing: 'border-box',
                      borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Trash2 size={14} />
                    </button>
                    {/* Bearbeiten öffnet das Formular */}
                    <button onClick={() => setBearbeiteAusgabe(ausgabe)} style={{
                      backgroundColor: 'transparent', border: '1px solid rgba(201,168,76,0.2)',
                      color: '#8892a4', cursor: 'pointer', padding: '6px',
                      minWidth: '40px', minHeight: '40px', boxSizing: 'border-box',
                      borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <SquarePen size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )))}

        {/* Saldo pro Person */}
        {teilnehmer.length > 0 && ausgaben.length > 0 && (
          <div style={karteStyle}>
            <h3 style={{ marginBottom: '15px', fontWeight: '600' }}>Saldo</h3>
            {teilnehmer.map(person => {
              const bezahlt = ausgaben
                .filter(a => a.bezahlt_von === person.name)
                .reduce((sum, a) => sum + a.betrag, 0)
              const anteil = ausgaben.reduce((sum, a) =>
                sum + anteilBerechnen(a, person.name), 0)
              const saldo = bezahlt - anteil
              return (
                <div key={person.id} style={{
                  display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px 12px',
                  padding: '10px 0', borderBottom: '1px solid #1a2235',
                }}>
                  <p style={{ fontWeight: '600', margin: 0, minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>{person.name}</p>
                  <p style={{
                    fontWeight: '600', margin: 0, whiteSpace: 'nowrap',
                    color: saldo >= 0 ? '#4caf50' : '#e94560',
                  }}>
                    {saldo >= 0 ? '+' : ''}{saldo.toFixed(2)}€
                  </p>
                </div>
              )
            })}
            
          </div>
        )}

        {/* Abrechnung */}
        {ausgaben.length > 0 && (
          <div style={karteStyle}>
            <h3 style={{ marginBottom: '15px', fontWeight: '600' }}>Abrechnung</h3>
            {schulden.length === 0 ? (
              <p style={{ color: '#8892a4' }}>Alle quitt! ✅</p>
            ) : (
              schulden.map((s, index) => (
                <p key={index} style={{ color: '#8892a4', marginBottom: '8px', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                  <span style={{ color: '#fff', fontWeight: '600' }}>{s.von}</span>
                  {' '}schuldet{' '}
                  <span style={{ color: '#fff', fontWeight: '600' }}>{s.an}</span>
                  {' '}
                  <span style={{ color: '#c9a84c', fontWeight: '600' }}>{s.betrag}€</span>
                </p>
              ))
            )}
          </div>
        )}

        {/* Formular für neue Ausgabe */}
        {formularOffen && (
          <div style={karteStyle}>
            <h3 style={{ marginBottom: '15px', fontWeight: '600' }}>Neue Ausgabe</h3>

            <input placeholder="Beschreibung" value={neueAusgabe.beschreibung}
              onChange={(e) => setNeueAusgabe({ ...neueAusgabe, beschreibung: e.target.value })}
              style={inputStyle} />

            <input placeholder="Betrag in €" type="number" value={neueAusgabe.betrag}
              onChange={(e) => setNeueAusgabe({ ...neueAusgabe, betrag: e.target.value })}
              style={inputStyle} />

            {/* Dropdown – wer hat bezahlt */}
            <select value={neueAusgabe.bezahlt_von}
              onChange={(e) => setNeueAusgabe({ ...neueAusgabe, bezahlt_von: e.target.value })}
              style={inputStyle}>
              <option value="">Bezahlt von...</option>
              {teilnehmer.map(person => (
                <option key={person.id} value={person.name}>{person.name}</option>
              ))}
            </select>

            {/* Checkboxen – für wen ist die Ausgabe */}
            <p style={{ color: '#8892a4', marginBottom: '12px', fontSize: '0.9rem' }}>
              Für wen? – leer lassen = für alle
            </p>
            {teilnehmer.map(person => {
              const istGewaehlt = neueAusgabe.fuer.includes(person.name)
              return (
                <div
                  key={person.id}
                  onClick={() => {
                    const aktuell = neueAusgabe.fuer
                    const neu = aktuell.includes(person.name)
                      ? aktuell.filter(p => p !== person.name)
                      : [...aktuell, person.name]
                    setNeueAusgabe({ ...neueAusgabe, fuer: neu })
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 0', minHeight: '44px', borderBottom: '1px solid #1a2235',
                    cursor: 'pointer', boxSizing: 'border-box',
                  }}
                >
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '6px',
                    backgroundColor: istGewaehlt ? '#c9a84c' : '#1a2235',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {istGewaehlt && <span style={{ fontSize: '12px', color: '#0a0f1e' }}>✓</span>}
                  </div>
                  <p style={{ margin: 0, color: '#ffffff', minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>{person.name}</p>
                </div>
              )
            })}

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={ausgabeHinzufuegen} style={{
                backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
                padding: '14px', minHeight: '44px', borderRadius: '12px', cursor: 'pointer',
                flex: 1, fontWeight: '600', boxSizing: 'border-box',
              }}>Speichern</button>
              <button onClick={() => setFormularOffen(false)} style={{
                backgroundColor: 'transparent', color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '14px', minHeight: '44px', borderRadius: '12px', cursor: 'pointer',
                flex: 1, boxSizing: 'border-box',
              }}>Abbrechen</button>
            </div>
          </div>
        )}

        {!formularOffen && (
          <button onClick={() => setFormularOffen(true)} style={{
            backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
            padding: '15px', minHeight: '48px', borderRadius: '12px', fontSize: '1rem',
            fontWeight: '600', cursor: 'pointer', marginTop: '10px', width: '100%',
            boxSizing: 'border-box',
          }}>
            + Ausgabe hinzufügen
          </button>
        )}


      </div>
      
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

export default TripKosten