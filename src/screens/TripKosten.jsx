import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import { Wallet } from 'lucide-react'

function TripKosten() {
  const { id } = useParams()

  const [trip, setTrip] = useState(null)
  const [ausgaben, setAusgaben] = useState([])
  const [teilnehmer, setTeilnehmer] = useState([])
  const [laden, setLaden] = useState(true)
  const [formularOffen, setFormularOffen] = useState(false)

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

  // Hilfsfunktion – berechnet den Anteil einer Person an einer Ausgabe
    const anteilBerechnen = (ausgabe, personName) => {
  // fuer als Array parsen – Supabase gibt es manchmal als String zurück
  let fuerArray = ausgabe.fuer
  if (typeof fuerArray === 'string') {
    try { fuerArray = JSON.parse(fuerArray) } catch { fuerArray = null }
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

      <div style={{ padding: '0 20px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Gesamtbetrag Karte */}
        <div style={karteStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Wallet size={18} color="#c9a84c" />
            <p style={{ color: '#8892a4', margin: 0 }}>Gesamtausgaben</p>
          </div>
          <h2 style={{ fontSize: '2.5rem', color: '#c9a84c', margin: '0 0 8px' }}>
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
            <div key={ausgabe.id} style={{
              ...karteStyle,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontWeight: '600', margin: '0 0 4px' }}>{ausgabe.beschreibung}</p>
                <p style={{ color: '#8892a4', fontSize: '0.85rem', margin: 0 }}>
                  bezahlt von {ausgabe.bezahlt_von}
                  {/* Zeigt für wen die Ausgabe ist */}
                  {ausgabe.fuer && ausgabe.fuer.length > 0 && (
                    <span> · für {Array.isArray(ausgabe.fuer) ? ausgabe.fuer.join(', ') : ausgabe.fuer}</span>
                  )}
                </p>
              </div>
              <p style={{ fontSize: '1.2rem', color: '#c9a84c', margin: 0 }}>{ausgabe.betrag}€</p>
            </div>
          ))
        )}

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
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid #1a2235',
                }}>
                  <p style={{ fontWeight: '600', margin: 0 }}>{person.name}</p>
                  <p style={{
                    fontWeight: '600', margin: 0,
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
                <p key={index} style={{ color: '#8892a4', marginBottom: '8px' }}>
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
                    padding: '10px 0', borderBottom: '1px solid #1a2235',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '6px',
                    backgroundColor: istGewaehlt ? '#c9a84c' : '#1a2235',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {istGewaehlt && <span style={{ fontSize: '12px', color: '#0a0f1e' }}>✓</span>}
                  </div>
                  <p style={{ margin: 0, color: '#ffffff' }}>{person.name}</p>
                </div>
              )
            })}

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={ausgabeHinzufuegen} style={{
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

        {!formularOffen && (
          <button onClick={() => setFormularOffen(true)} style={{
            backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
            padding: '15px', borderRadius: '12px', fontSize: '1rem',
            fontWeight: '600', cursor: 'pointer', marginTop: '10px', width: '100%',
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
  padding: '20px', marginBottom: '15px',
}

const inputStyle = {
  width: '100%', padding: '12px', backgroundColor: '#1a2235',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
  color: '#ffffff', fontSize: '1rem', marginBottom: '10px', boxSizing: 'border-box',
}

export default TripKosten