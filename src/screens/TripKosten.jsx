import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import { Wallet, Trash2, SquarePen, Plus, Check, Calendar, X } from 'lucide-react'
import Toast from '../components/Toast'
import useToast from '../hooks/useToast.jsx'

function TripKosten() {
  const { id } = useParams()
  const { toasts, setToasts, toast } = useToast()

  const [trip, setTrip] = useState(null)
  const [ausgaben, setAusgaben] = useState([])
  const [teilnehmer, setTeilnehmer] = useState([])
  const [abrechnungen, setAbrechnungen] = useState([]) // bereits beglichene Schulden
  const [laden, setLaden] = useState(true)
  const [formularOffen, setFormularOffen] = useState(false) // Bottom Sheet für neue Ausgabe
  const [bearbeiteAusgabe, setBearbeiteAusgabe] = useState(null)
  const [abrechnenOffen, setAbrechnenOffen] = useState(false)

  const [neueAusgabe, setNeueAusgabe] = useState({
    beschreibung: '', betrag: '', bezahlt_von: '', fuer: [],
    datum: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    const datenLaden = async () => {
      const { data: tripData } = await supabase
        .from('trips').select('*').eq('id', id).single()
      setTrip(tripData)

      const { data: ausgabenData } = await supabase
        .from('ausgaben').select('*').eq('trip_id', id)
        .order('datum', { ascending: false })
      setAusgaben(ausgabenData || [])

      const { data: teilnehmerData } = await supabase
        .from('teilnehmer').select('*').eq('trip_id', id)
      setTeilnehmer(teilnehmerData || [])

      const { data: abrechnungenData } = await supabase
        .from('abrechnungen').select('*').eq('trip_id', id)
      setAbrechnungen(abrechnungenData || [])

      setLaden(false)
    }
    datenLaden()
  }, [id])

  const gesamt = ausgaben.reduce((sum, a) => sum + a.betrag, 0)

  // Neue Ausgabe speichern
  const ausgabeHinzufuegen = async () => {
    if (!neueAusgabe.beschreibung || !neueAusgabe.betrag || !neueAusgabe.bezahlt_von) {
      toast('Bitte alle Felder ausfüllen!', 'error')
      return
    }

    const { data, error } = await supabase
      .from('ausgaben')
      .insert([{
        beschreibung: neueAusgabe.beschreibung,
        betrag: parseFloat(neueAusgabe.betrag),
        bezahlt_von: neueAusgabe.bezahlt_von,
        trip_id: id,
        datum: neueAusgabe.datum,
        fuer: neueAusgabe.fuer.length > 0 ? neueAusgabe.fuer : null,
      }])
      .select()

    if (error) {
      console.error('Fehler:', error)
      toast('Fehler beim Speichern!', 'error')
    } else {
      setAusgaben([data[0], ...ausgaben])
      setNeueAusgabe({
        beschreibung: '', betrag: '', bezahlt_von: '', fuer: [],
        datum: new Date().toISOString().split('T')[0],
      })
      setFormularOffen(false)
      toast('Ausgabe hinzugefügt! ✅', 'success')
    }
  }

  // Ausgabe löschen – mit optimistic update + Fehlerbehandlung
  const ausgabeLoeschen = async (ausgabeId) => {
    // Sofort lokal entfernen für schnelles Feedback
    const vorherigeAusgaben = ausgaben
    setAusgaben(ausgaben.filter(a => a.id !== ausgabeId))

    const { error } = await supabase
      .from('ausgaben')
      .delete()
      .eq('id', ausgabeId)

    if (error) {
      console.error('Fehler beim Löschen:', error)
      // Bei Fehler die Ausgabe wieder zurückholen
      setAusgaben(vorherigeAusgaben)
      toast('Löschen fehlgeschlagen!', 'error')
    } else {
      toast('Ausgabe gelöscht', 'success')
    }
  }

  const ausgabeBearbeiten = async (ausgabeId, updates) => {
    const { error } = await supabase
      .from('ausgaben')
      .update(updates)
      .eq('id', ausgabeId)

    if (error) {
      console.error('Fehler:', error)
      toast('Speichern fehlgeschlagen!', 'error')
    } else {
      setAusgaben(ausgaben.map(a => a.id === ausgabeId ? { ...a, ...updates } : a))
      toast('Gespeichert! ✅', 'success')
    }
  }

  // Anteil einer Person an einer Ausgabe berechnen
  function anteilBerechnen(ausgabe, personName) {
    let fuerArray = ausgabe.fuer
    if (typeof fuerArray === 'string') {
      try { fuerArray = JSON.parse(fuerArray) } catch { fuerArray = null }
    }
    const betroffene = (fuerArray && fuerArray.length > 0) ? fuerArray : teilnehmer.map(t => t.name)
    if (betroffene.includes(personName)) return ausgabe.betrag / betroffene.length
    return 0
  }

  // Wer schuldet wem was – abzüglich bereits Abgerechnetem
  const schuldenBerechnen = () => {
    if (teilnehmer.length === 0 || gesamt === 0) return []
    const schulden = []

    teilnehmer.forEach(person => {
      const bezahlt = ausgaben.filter(a => a.bezahlt_von === person.name).reduce((sum, a) => sum + a.betrag, 0)
      const anteil = ausgaben.reduce((sum, a) => sum + anteilBerechnen(a, person.name), 0)
      const differenz = bezahlt - anteil

      if (differenz < -0.01) {
        const glaeubiger = teilnehmer.find(p => {
          const pBezahlt = ausgaben.filter(a => a.bezahlt_von === p.name).reduce((sum, a) => sum + a.betrag, 0)
          const pAnteil = ausgaben.reduce((sum, a) => sum + anteilBerechnen(a, p.name), 0)
          return pBezahlt - pAnteil > 0.01
        })
        if (glaeubiger) {
          const bereitsAbgerechnet = abrechnungen
            .filter(ab => ab.von === person.name && ab.an === glaeubiger.name)
            .reduce((sum, ab) => sum + ab.betrag, 0)

          const offenerBetrag = Math.abs(differenz) - bereitsAbgerechnet

          if (offenerBetrag > 0.01) {
            schulden.push({ von: person.name, an: glaeubiger.name, betrag: offenerBetrag.toFixed(2) })
          }
        }
      }
    })
    return schulden
  }

  const schulden = schuldenBerechnen()

  // Schuld als bezahlt markieren – mit optimistic update gegen Doppelklicks
  const schuldAbrechnen = async (schuld) => {
    const neueAbrechnung = { trip_id: id, von: schuld.von, an: schuld.an, betrag: parseFloat(schuld.betrag) }

    // Sofort lokal hinzufügen – Schuld verschwindet sofort aus der Liste,
    // verhindert dass durch Doppelklick zweimal abgerechnet wird
    setAbrechnungen(prev => [...prev, neueAbrechnung])

    const { error } = await supabase.from('abrechnungen').insert([neueAbrechnung])

    if (error) {
      console.error('Fehler:', error)
      // Bei Fehler rückgängig machen
      setAbrechnungen(prev => prev.filter(a => a !== neueAbrechnung))
      toast('Abrechnen fehlgeschlagen!', 'error')
    } else {
      // Mit echten Daten synchronisieren (korrekte IDs)
      const { data } = await supabase.from('abrechnungen').select('*').eq('trip_id', id)
      setAbrechnungen(data || [])
      toast('Beglichen! ✅', 'success')
    }
  }

  // Ausgaben nach Datum gruppieren
  const ausgabenNachDatum = () => {
    const gruppen = {}
    ausgaben.forEach(a => {
      const datum = a.datum || 'Ohne Datum'
      if (!gruppen[datum]) gruppen[datum] = []
      gruppen[datum].push(a)
    })
    return Object.entries(gruppen).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const datumFormatieren = (datumStr) => {
    if (datumStr === 'Ohne Datum') return datumStr
    const datum = new Date(datumStr)
    return datum.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  // Saldo inkl. Abrechnungen berechnen
  const saldoBerechnen = (person) => {
    const bezahlt = ausgaben.filter(a => a.bezahlt_von === person.name).reduce((sum, a) => sum + a.betrag, 0)
    const anteil = ausgaben.reduce((sum, a) => sum + anteilBerechnen(a, person.name), 0)
    const beglichenAlsSchuldner = abrechnungen.filter(ab => ab.von === person.name).reduce((sum, ab) => sum + ab.betrag, 0)
    const beglichenAlsGlaeubiger = abrechnungen.filter(ab => ab.an === person.name).reduce((sum, ab) => sum + ab.betrag, 0)
    return (bezahlt - anteil) + beglichenAlsSchuldner - beglichenAlsGlaeubiger
  }

  const maxSaldo = Math.max(...teilnehmer.map(person => Math.abs(saldoBerechnen(person))), 0.01)

  if (laden) return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ padding: '0 20px', maxWidth: '600px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '160px', borderRadius: '24px', marginBottom: '16px', marginTop: '20px' }} />
        <div className="skeleton" style={{ height: '240px', borderRadius: '22px' }} />
      </div>
    </div>
  )

  return (
    <div style={{ paddingBottom: '110px' }}>
      <TripNav tripName={trip.name} />

      <div style={{ padding: '0 clamp(14px, 4vw, 20px)', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Kreditkarten-Style Gesamtanzeige */}
        <div className="fade-in" style={{
          background: 'linear-gradient(135deg, #1a2235 0%, #0e1724 50%, #111827 100%)',
          borderRadius: '24px', padding: 'clamp(22px, 5vw, 32px)',
          marginBottom: '16px', position: 'relative', overflow: 'hidden',
          boxSizing: 'border-box', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '140px', height: '140px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.12)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '10px', right: '10px', width: '70px', height: '70px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.08)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
            <p style={{ color: '#8892a4', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>
              Gesamtausgaben
            </p>
            <Wallet size={18} color="rgba(201,168,76,0.5)" />
          </div>

          <h2 style={{
            fontSize: 'clamp(2.2rem, 9vw, 3.2rem)', color: '#c9a84c', margin: '0 0 20px',
            fontWeight: '800', letterSpacing: '-1.5px', overflowWrap: 'break-word',
            textShadow: '0 0 40px rgba(201,168,76,0.2)',
          }}>
            {gesamt.toFixed(2)}€
          </h2>

          {teilnehmer.length > 0 && (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: '#8892a4', fontSize: '0.65rem', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>Teilnehmer</p>
                <p style={{ color: '#fff', fontWeight: '700', margin: 0, fontSize: '0.95rem' }}>{teilnehmer.length}</p>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <p style={{ color: '#8892a4', fontSize: '0.65rem', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>Pro Person</p>
                <p style={{ color: '#fff', fontWeight: '700', margin: 0, fontSize: '0.95rem' }}>{(gesamt / teilnehmer.length).toFixed(2)}€</p>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <p style={{ color: '#8892a4', fontSize: '0.65rem', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>Ausgaben</p>
                <p style={{ color: '#fff', fontWeight: '700', margin: 0, fontSize: '0.95rem' }}>{ausgaben.length}</p>
              </div>
            </div>
          )}
        </div>

        {/* Timeline der Ausgaben – nach Datum gruppiert */}
        {ausgaben.length > 0 && (
          <div className="fade-in-2" style={karteStyle}>
            <h3 style={{ margin: '0 0 20px', fontWeight: '700', fontSize: '1rem' }}>Ausgaben</h3>

            {ausgabenNachDatum().map(([datum, ausgabenDesTages], gruppenIndex) => (
              <div key={datum} style={{ marginBottom: gruppenIndex < ausgabenNachDatum().length - 1 ? '24px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <Calendar size={12} color="#8892a4" />
                  <p style={{ color: '#8892a4', fontSize: '0.72rem', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {datumFormatieren(datum)}
                  </p>
                </div>

                {ausgabenDesTages.map((ausgabe, index) => (
                  <div key={ausgabe.id}>
                    {bearbeiteAusgabe?.id === ausgabe.id ? (
                      <div className="fade-in" style={{ marginBottom: '16px' }}>
                        <input value={bearbeiteAusgabe.beschreibung}
                          onChange={(e) => setBearbeiteAusgabe({ ...bearbeiteAusgabe, beschreibung: e.target.value })}
                          style={inputStyle} placeholder="Beschreibung" />
                        <input type="number" value={bearbeiteAusgabe.betrag}
                          onChange={(e) => setBearbeiteAusgabe({ ...bearbeiteAusgabe, betrag: e.target.value })}
                          style={inputStyle} placeholder="Betrag" />
                        <input type="date" value={bearbeiteAusgabe.datum}
                          onChange={(e) => setBearbeiteAusgabe({ ...bearbeiteAusgabe, datum: e.target.value })}
                          style={inputStyle} />
                        <select value={bearbeiteAusgabe.bezahlt_von}
                          onChange={(e) => setBearbeiteAusgabe({ ...bearbeiteAusgabe, bezahlt_von: e.target.value })}
                          style={{ ...inputStyle, appearance: 'none' }}>
                          {teilnehmer.map(person => <option key={person.id} value={person.name}>{person.name}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={async () => {
                            await ausgabeBearbeiten(ausgabe.id, {
                              beschreibung: bearbeiteAusgabe.beschreibung,
                              betrag: parseFloat(bearbeiteAusgabe.betrag),
                              bezahlt_von: bearbeiteAusgabe.bezahlt_von,
                              datum: bearbeiteAusgabe.datum,
                            })
                            setBearbeiteAusgabe(null)
                          }} className="btn-press" style={{ ...speichernButtonStyle, flex: 1 }}>Speichern</button>
                          <button onClick={() => setBearbeiteAusgabe(null)} className="btn-press" style={{ ...abbrechenButtonStyle, flex: 1 }}>Abbrechen</button>
                        </div>
                      </div>
                    ) : (
                      <div className={`fade-in-${Math.min(index + 1, 5)}`} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                        paddingBottom: index < ausgabenDesTages.length - 1 ? '16px' : '0',
                        marginBottom: index < ausgabenDesTages.length - 1 ? '16px' : '0',
                        borderBottom: index < ausgabenDesTages.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#c9a84c', marginTop: '6px', flexShrink: 0, boxShadow: '0 0 8px rgba(201,168,76,0.4)' }} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <p style={{ fontWeight: '600', margin: '0 0 4px', overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0, fontSize: '0.95rem' }}>
                              {ausgabe.beschreibung}
                            </p>
                            <span style={{ fontSize: '1.1rem', color: '#c9a84c', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {Number(ausgabe.betrag).toFixed(2)}€
                            </span>
                          </div>
                          <p style={{ color: '#8892a4', fontSize: '0.78rem', margin: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                            von {ausgabe.bezahlt_von}
                            {ausgabe.fuer && ausgabe.fuer.length > 0 && (
                              <span> · für {Array.isArray(ausgabe.fuer) ? ausgabe.fuer.join(', ') : ausgabe.fuer}</span>
                            )}
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                          <button onClick={() => setBearbeiteAusgabe({ ...ausgabe, datum: ausgabe.datum || new Date().toISOString().split('T')[0] })} className="btn-press" style={ikonButtonStyle}>
                            <SquarePen size={13} color="#c9a84c" />
                          </button>
                          <button onClick={() => ausgabeLoeschen(ausgabe.id)} className="btn-press" style={ikonButtonStyleRot}>
                            <Trash2 size={13} color="#e94560" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {ausgaben.length === 0 && (
          <p className="fade-in" style={{ color: '#8892a4', textAlign: 'center', marginBottom: '16px', fontStyle: 'italic', fontSize: '0.9rem' }}>
            Noch keine Ausgaben – tippe unten rechts auf "+"!
          </p>
        )}

        {/* Saldo pro Person mit Balken */}
        {teilnehmer.length > 0 && ausgaben.length > 0 && (
          <div className="fade-in-3" style={karteStyle}>
            <h3 style={{ margin: '0 0 18px', fontWeight: '700', fontSize: '1rem' }}>Saldo</h3>
            {teilnehmer.map(person => {
              const saldo = saldoBerechnen(person)
              const balkenBreite = Math.min((Math.abs(saldo) / maxSaldo) * 100, 100)
              const positiv = saldo >= 0

              return (
                <div key={person.id} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                    <p style={{ fontWeight: '600', margin: 0, fontSize: '0.92rem', overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0, flex: 1 }}>
                      {person.name}
                    </p>
                    <p style={{ fontWeight: '700', margin: 0, whiteSpace: 'nowrap', marginLeft: '8px', color: positiv ? '#4caf50' : '#e94560', fontSize: '0.95rem' }}>
                      {positiv ? '+' : ''}{saldo.toFixed(2)}€
                    </p>
                  </div>
                  <div style={{ backgroundColor: '#0d1525', borderRadius: '6px', height: '5px', overflow: 'hidden' }}>
                    <div style={{
                      height: '5px', borderRadius: '6px', width: `${balkenBreite}%`,
                      backgroundColor: positiv ? '#4caf50' : '#e94560',
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: positiv ? '0 0 8px rgba(76,175,80,0.4)' : '0 0 8px rgba(233,69,96,0.4)',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Abrechnung */}
        {ausgaben.length > 0 && (
          <div className="fade-in-4" style={karteStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1rem' }}>Abrechnung</h3>
              {schulden.length > 0 && (
                <button onClick={() => setAbrechnenOffen(!abrechnenOffen)} className="btn-press" style={{
                  backgroundColor: 'transparent', border: '1px solid rgba(201,168,76,0.3)',
                  color: '#c9a84c', padding: '6px 12px', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
                }}>
                  {abrechnenOffen ? 'Fertig' : 'Abrechnen'}
                </button>
              )}
            </div>
            {schulden.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '15px' }}>✓</span>
                </div>
                <p style={{ color: '#4caf50', margin: 0, fontWeight: '600' }}>Alle quitt!</p>
              </div>
            ) : (
              schulden.map((s, index) => (
                <div key={index} style={{
                  backgroundColor: '#1a2235', borderRadius: '12px', padding: '12px 14px',
                  marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                }}>
                  <span style={{ color: '#fff', fontWeight: '700', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{s.von}</span>
                  <span style={{ color: '#8892a4', fontSize: '0.82rem' }}>schuldet</span>
                  <span style={{ color: '#fff', fontWeight: '700', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{s.an}</span>
                  <span style={{ color: '#c9a84c', fontWeight: '800', marginLeft: 'auto' }}>{s.betrag}€</span>

                  {abrechnenOffen && (
                    <button onClick={() => schuldAbrechnen(s)} className="btn-press" style={{
                      backgroundColor: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)',
                      color: '#4caf50', padding: '6px 10px', borderRadius: '8px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.78rem', fontWeight: '700', width: '100%', justifyContent: 'center', marginTop: '4px',
                    }}>
                      <Check size={13} /> Beglichen
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Floating Action Button – wie bei Splid */}
      <button
        onClick={() => setFormularOffen(true)}
        className="btn-press"
        style={{
          position: 'fixed', bottom: '92px', right: '20px',
          width: '58px', height: '58px', borderRadius: '50%',
          backgroundColor: '#c9a84c', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(201,168,76,0.5)',
          zIndex: 90,
        }}
      >
        <Plus size={26} color="#0a0f1e" strokeWidth={2.5} />
      </button>

      {/* Neue Ausgabe – Bottom Sheet Modal */}
      {formularOffen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="fade-in" style={{
            backgroundColor: '#111827', borderRadius: '24px 24px 0 0',
            padding: '24px 20px 32px', width: '100%', maxWidth: '600px',
            maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box',
          }}>
            {/* Griff oben */}
            <div style={{ width: '40px', height: '4px', backgroundColor: '#1a2235', borderRadius: '2px', margin: '0 auto 20px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.2rem' }}>Neue Ausgabe</h3>
              <button onClick={() => setFormularOffen(false)} style={{
                background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#8892a4',
              }}>
                <X size={16} />
              </button>
            </div>

            <input placeholder="Beschreibung" value={neueAusgabe.beschreibung}
              onChange={(e) => setNeueAusgabe({ ...neueAusgabe, beschreibung: e.target.value })}
              style={inputStyle} />

            <input placeholder="Betrag in €" type="number" value={neueAusgabe.betrag}
              onChange={(e) => setNeueAusgabe({ ...neueAusgabe, betrag: e.target.value })}
              style={inputStyle} />

            <input type="date" value={neueAusgabe.datum}
              onChange={(e) => setNeueAusgabe({ ...neueAusgabe, datum: e.target.value })}
              style={inputStyle} />

            <select value={neueAusgabe.bezahlt_von}
              onChange={(e) => setNeueAusgabe({ ...neueAusgabe, bezahlt_von: e.target.value })}
              style={{ ...inputStyle, appearance: 'none' }}>
              <option value="">Bezahlt von...</option>
              {teilnehmer.map(person => <option key={person.id} value={person.name}>{person.name}</option>)}
            </select>

            <p style={{ color: '#8892a4', marginBottom: '10px', fontSize: '0.82rem' }}>
              Für wen? – leer lassen = für alle
            </p>
            {teilnehmer.map(person => {
              const istGewaehlt = neueAusgabe.fuer.includes(person.name)
              return (
                <div key={person.id}
                  onClick={() => {
                    const aktuell = neueAusgabe.fuer
                    const neu = aktuell.includes(person.name)
                      ? aktuell.filter(p => p !== person.name)
                      : [...aktuell, person.name]
                    setNeueAusgabe({ ...neueAusgabe, fuer: neu })
                  }}
                  className="btn-press"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 0', minHeight: '44px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer', boxSizing: 'border-box',
                  }}
                >
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    backgroundColor: istGewaehlt ? '#c9a84c' : 'transparent',
                    border: istGewaehlt ? '2px solid #c9a84c' : '2px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {istGewaehlt && <span style={{ fontSize: '11px', color: '#0a0f1e', fontWeight: '700' }}>✓</span>}
                  </div>
                  <p style={{ margin: 0, color: '#ffffff', minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word', fontSize: '0.95rem' }}>
                    {person.name}
                  </p>
                </div>
              )
            })}

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button onClick={ausgabeHinzufuegen} className="btn-press" style={{ ...speichernButtonStyle, flex: 1 }}>Speichern</button>
              <button onClick={() => setFormularOffen(false)} className="btn-press" style={{ ...abbrechenButtonStyle, flex: 1 }}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} setToasts={setToasts} />
    </div>
  )
}

const karteStyle = {
  backgroundColor: '#111827', borderRadius: '22px',
  padding: 'clamp(18px, 4vw, 24px)', marginBottom: '16px',
  boxSizing: 'border-box', boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
}

const inputStyle = {
  width: '100%', padding: '13px 14px', backgroundColor: '#1a2235',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
  color: '#ffffff', fontSize: '0.95rem', marginBottom: '10px', boxSizing: 'border-box',
}

const speichernButtonStyle = {
  backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
  padding: '14px', minHeight: '48px', borderRadius: '14px',
  cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem',
  boxSizing: 'border-box', boxShadow: '0 4px 16px rgba(201,168,76,0.3)',
}

const abbrechenButtonStyle = {
  backgroundColor: 'transparent', color: '#8892a4',
  border: '1px solid rgba(255,255,255,0.12)',
  padding: '14px', minHeight: '48px', borderRadius: '14px',
  cursor: 'pointer', boxSizing: 'border-box', fontWeight: '500',
}

const ikonButtonStyle = {
  backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)',
  cursor: 'pointer', padding: '7px', borderRadius: '10px',
  minWidth: '34px', minHeight: '34px', boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const ikonButtonStyleRot = {
  backgroundColor: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.2)',
  cursor: 'pointer', padding: '7px', borderRadius: '10px',
  minWidth: '34px', minHeight: '34px', boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

export default TripKosten