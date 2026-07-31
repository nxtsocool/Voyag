import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import { Wallet, Trash2, SquarePen, Plus, Check, Calendar, X, ChevronDown } from 'lucide-react'
import Toast from '../components/Toast'
import useToast from '../hooks/useToast.jsx'
import usePullToRefresh from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'
import { useSettings } from '../context/SettingsContext'
import useWechselkurse from '../hooks/useWechselkurse'
import { WAEHRUNGEN } from '../data/waehrungen'

function TripKosten() {
  const { id } = useParams()
  const { toasts, setToasts, toast } = useToast()
  const { waehrung, t, design } = useSettings()
  const { umrechnen, veraltet } = useWechselkurse()
  // ISO-Code der Heimwährung – Fallback auf EUR falls die Heimwährung nicht umgerechnet werden kann
  const heimISO = WAEHRUNGEN.find(w => w.symbol === waehrung)?.iso || 'EUR'
  const [trip, setTrip] = useState(null)
  const [ausgaben, setAusgaben] = useState([])
  const [teilnehmer, setTeilnehmer] = useState([])
  const [abrechnungen, setAbrechnungen] = useState([]) // bereits beglichene Schulden
  const [laden, setLaden] = useState(true)
  const [formularOffen, setFormularOffen] = useState(false) // Bottom Sheet für neue Ausgabe
  const [bearbeiteAusgabe, setBearbeiteAusgabe] = useState(null)
  const [abrechnenOffen, setAbrechnenOffen] = useState(false)
  // Ob die gesamte Ausgaben-Liste aufgeklappt ist – standardmäßig aufgeklappt
  const [ausgabenOffen, setAusgabenOffen] = useState(true)

  const [neueAusgabe, setNeueAusgabe] = useState({
    beschreibung: '', betrag: '', bezahlt_von: '', fuer: [],
    datum: new Date().toISOString().split('T')[0],
    waehrung: { symbol: '€', iso: 'EUR' },
  })

  useEffect(() => { datenLaden() }, [id])

  // Warnung anzeigen, falls die API nicht erreichbar war und Näherungswerte verwendet werden
  useEffect(() => {
    if (veraltet) toast(t('wechselkurseNichtAktuell'), 'error')
  }, [veraltet])

  const { ziehen, fortschritt, schwellenwert } = usePullToRefresh(datenLaden)

  async function datenLaden() {
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

  const gesamt = ausgaben.reduce((sum, a) => sum + a.betrag, 0)

  // Neue Ausgabe speichern
  const ausgabeHinzufuegen = async () => {
    if (!neueAusgabe.beschreibung || !neueAusgabe.betrag || !neueAusgabe.bezahlt_von) {
      toast(t('bitteAlleFelderAusfuellen'), 'error')
      return
    }

    // Original-Betrag immer in die Heimwährung umrechnen – Saldo/Schulden basieren nur auf betrag
    const betragInHeim = umrechnen(
      parseFloat(neueAusgabe.betrag),
      neueAusgabe.waehrung.iso,
      heimISO
    )

    const { data, error } = await supabase
      .from('ausgaben')
      .insert([{
        beschreibung: neueAusgabe.beschreibung,
        betrag: parseFloat(betragInHeim.toFixed(2)),
        betrag_original: parseFloat(neueAusgabe.betrag),
        waehrung_original: neueAusgabe.waehrung.symbol,
        bezahlt_von: neueAusgabe.bezahlt_von,
        trip_id: id,
        datum: neueAusgabe.datum,
        fuer: neueAusgabe.fuer.length > 0 ? neueAusgabe.fuer : null,
      }])
      .select()

    if (error) {
      console.error('Fehler:', error)
      toast(t('fehlerBeimSpeichern'), 'error')
    } else {
      setAusgaben([data[0], ...ausgaben])
      setNeueAusgabe({
        beschreibung: '', betrag: '', bezahlt_von: '', fuer: [],
        datum: new Date().toISOString().split('T')[0],
        waehrung: { symbol: '€', iso: 'EUR' },
      })
      setFormularOffen(false)
      toast(t('ausgabeHinzugefuegt'), 'success')
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
      toast(t('loeschenFehlgeschlagen'), 'error')
    } else {
      toast(t('ausgabeGeloescht'), 'success')
    }
  }

  const ausgabeBearbeiten = async (ausgabeId, updates) => {
    const { error } = await supabase
      .from('ausgaben')
      .update(updates)
      .eq('id', ausgabeId)

    if (error) {
      console.error('Fehler:', error)
      toast(t('speichernFehlgeschlagen'), 'error')
    } else {
      setAusgaben(ausgaben.map(a => a.id === ausgabeId ? { ...a, ...updates } : a))
      toast(t('gespeichertHaken'), 'success')
    }
  }

  // Anteil einer Person an einer Ausgabe berechnen
  function anteilBerechnen(ausgabe, personName) {
    let fuerArray = ausgabe.fuer
    if (typeof fuerArray === 'string') {
      try { fuerArray = JSON.parse(fuerArray) } catch { fuerArray = null }
    }
    const betroffene = (fuerArray && fuerArray.length > 0) ? fuerArray : teilnehmer.map(p => p.name)
    if (betroffene.includes(personName)) return ausgabe.betrag / betroffene.length
    return 0
  }

  // Wer schuldet wem was – abzüglich bereits Abgerechnetem
  const schuldenBerechnen = () => {
  if (teilnehmer.length === 0 || gesamt === 0) return []
  const schulden = []

  // Saldo für jeden berechnen
  const salden = teilnehmer.map(person => {
    const bezahlt = ausgaben
      .filter(a => a.bezahlt_von === person.name)
      .reduce((sum, a) => sum + a.betrag, 0)
    const anteil = ausgaben.reduce((sum, a) => sum + anteilBerechnen(a, person.name), 0)
    const bereitsAbgerechnetAls = abrechnungen
      .filter(ab => ab.von === person.name)
      .reduce((sum, ab) => sum + ab.betrag, 0)
    const bereitsErhaltenAls = abrechnungen
      .filter(ab => ab.an === person.name)
      .reduce((sum, ab) => sum + ab.betrag, 0)

    return {
      name: person.name,
      saldo: (bezahlt - anteil) + bereitsAbgerechnetAls - bereitsErhaltenAls
    }
  })

  // Schuldner (negativ) und Gläubiger (positiv) trennen
  const schuldner = salden.filter(s => s.saldo < -0.01).map(s => ({ ...s, offen: Math.abs(s.saldo) }))
  const glaeubiger = salden.filter(s => s.saldo > 0.01).map(s => ({ ...s, offen: s.saldo }))

  // Jeden Schuldner gegen alle Gläubiger aufteilen
  for (const schuldnerPerson of schuldner) {
    let nochOffen = schuldnerPerson.offen

    for (const glaeubigerPerson of glaeubiger) {
      if (nochOffen <= 0.01) break
      if (glaeubigerPerson.offen <= 0.01) continue

      // Wie viel kann dieser Gläubiger bekommen?
      const betrag = Math.min(nochOffen, glaeubigerPerson.offen)

      schulden.push({
        von: schuldnerPerson.name,
        an: glaeubigerPerson.name,
        betrag: betrag.toFixed(2),
      })

      nochOffen -= betrag
      glaeubigerPerson.offen -= betrag
    }
  }

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
      toast(t('abrechnenFehlgeschlagen'), 'error')
    } else {
      // Mit echten Daten synchronisieren (korrekte IDs)
      const { data } = await supabase.from('abrechnungen').select('*').eq('trip_id', id)
      setAbrechnungen(data || [])
      toast(t('beglichenHaken'), 'success')
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
    <div style={{ paddingBottom: 'calc(180px + env(safe-area-inset-bottom))' }}>
      <PullToRefreshIndicator ziehen={ziehen} fortschritt={fortschritt} schwellenwert={schwellenwert} />
      <TripNav tripName={trip.name} />

      <div style={{ padding: '0 clamp(14px, 4vw, 20px)', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Kreditkarten-Style Gesamtanzeige – im Light Mode goldenes Gradient, sonst dunkel-navy */}
        <div className="fade-in" style={{
          background: design === 'light'
            ? 'linear-gradient(135deg, #b8922a 0%, #8a6a1e 50%, #c9a84c 100%)'
            : 'linear-gradient(135deg, #1a2235 0%, #0e1724 50%, #111827 100%)',
          borderRadius: '24px', padding: 'clamp(22px, 5vw, 32px)',
          marginBottom: '16px', position: 'relative', overflow: 'hidden',
          boxSizing: 'border-box',
          boxShadow: design === 'light'
            ? '0 10px 40px rgba(184,146,42,0.35)'
            : '0 10px 40px rgba(0,0,0,0.5)',
        }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '140px', height: '140px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.12)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '10px', right: '10px', width: '70px', height: '70px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.08)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>
              {t('gesamtausgaben')}
            </p>
            <Wallet size={18} color="rgba(255,255,255,0.6)" />
          </div>

          <h2 style={{
            fontSize: 'clamp(2.2rem, 9vw, 3.2rem)',
            color: design === 'light' ? 'rgba(255,255,255,0.95)' : 'var(--gold)',
            margin: '0 0 20px',
            fontWeight: '800', letterSpacing: '-1.5px', overflowWrap: 'break-word',
            textShadow: design === 'light' ? '0 2px 12px rgba(0,0,0,0.2)' : '0 0 40px rgba(201,168,76,0.2)',
          }}>
            {gesamt.toFixed(2)}{waehrung}
          </h2>

          {teilnehmer.length > 0 && (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>{t('teilnehmerLabel')}</p>
                <p style={{ color: '#ffffff', fontWeight: '700', margin: 0, fontSize: '0.95rem' }}>{teilnehmer.length}</p>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>{t('proPerson')}</p>
                <p style={{ color: '#ffffff', fontWeight: '700', margin: 0, fontSize: '0.95rem' }}>{(gesamt / teilnehmer.length).toFixed(2)}{waehrung}</p>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>{t('ausgabenLabel')}</p>
                <p style={{ color: '#ffffff', fontWeight: '700', margin: 0, fontSize: '0.95rem' }}>{ausgaben.length}</p>
              </div>
            </div>
          )}
        </div>

        {/* Timeline der Ausgaben – nach Datum gruppiert, gesamte Liste als Block auf-/zuklappbar */}
        {ausgaben.length > 0 && (
          <div className="fade-in-2" style={karteStyle}>
            <div
              onClick={() => setAusgabenOffen(!ausgabenOffen)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', marginBottom: ausgabenOffen ? '20px' : '0',
              }}
            >
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1rem' }}>
                {t('ausgabenLabel')} ({ausgaben.length})
              </h3>
              <ChevronDown
                size={18} color="var(--text-sub)"
                style={{ transform: ausgabenOffen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
              />
            </div>

            {ausgabenOffen && (
              <div className="fade-in">
                {ausgabenNachDatum().map(([datum, ausgabenDesTages], gruppenIndex) => (
                  <div key={datum} style={{ marginBottom: gruppenIndex < ausgabenNachDatum().length - 1 ? '24px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                      <Calendar size={12} color="var(--text-sub)" />
                      <p style={{ color: 'var(--text-sub)', fontSize: '0.72rem', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {datumFormatieren(datum)}
                      </p>
                    </div>

                    {ausgabenDesTages.map((ausgabe, index) => (
                      <div key={ausgabe.id}>
                        {bearbeiteAusgabe?.id === ausgabe.id ? (
                          <div className="fade-in" style={{ marginBottom: '16px' }}>
                            <input value={bearbeiteAusgabe.beschreibung}
                              onChange={(e) => setBearbeiteAusgabe({ ...bearbeiteAusgabe, beschreibung: e.target.value })}
                              style={inputStyle} placeholder={t('beschreibungPlatzhalter')} />
                            <input type="number" value={bearbeiteAusgabe.betrag}
                              onChange={(e) => setBearbeiteAusgabe({ ...bearbeiteAusgabe, betrag: e.target.value })}
                              style={inputStyle} placeholder={t('betragPlatzhalter')} />

                            {/* Währungs-Auswahl – gleicher Style wie beim Hinzufügen */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                              {WAEHRUNGEN.map(w => (
                                <button
                                  key={w.iso}
                                  onClick={() => setBearbeiteAusgabe({ ...bearbeiteAusgabe, waehrung: w })}
                                  className="btn-press"
                                  style={{
                                    flex: 1,
                                    padding: '10px 8px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    fontSize: '0.9rem',
                                    backgroundColor: bearbeiteAusgabe.waehrung.iso === w.iso ? 'var(--gold)' : 'var(--sub)',
                                    color: bearbeiteAusgabe.waehrung.iso === w.iso ? '#0a0f1e' : 'var(--text-sub)',
                                  }}
                                >
                                  {w.symbol}
                                </button>
                              ))}
                            </div>

                            {bearbeiteAusgabe.betrag && bearbeiteAusgabe.waehrung.iso !== heimISO && (
                              <p style={{
                                color: 'var(--text-sub)', fontSize: '0.82rem',
                                marginBottom: '10px', textAlign: 'right',
                              }}>
                                ≈ {umrechnen(parseFloat(bearbeiteAusgabe.betrag), bearbeiteAusgabe.waehrung.iso, heimISO).toFixed(2)}{waehrung}
                              </p>
                            )}

                            <input type="date" value={bearbeiteAusgabe.datum}
                              onChange={(e) => setBearbeiteAusgabe({ ...bearbeiteAusgabe, datum: e.target.value })}
                              style={dateInputStyle} />
                            <select value={bearbeiteAusgabe.bezahlt_von}
                              onChange={(e) => setBearbeiteAusgabe({ ...bearbeiteAusgabe, bezahlt_von: e.target.value })}
                              style={{ ...inputStyle, appearance: 'none' }}>
                              {teilnehmer.map(person => <option key={person.id} value={person.name}>{person.name}</option>)}
                            </select>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={async () => {
                                const betragInHeim = umrechnen(
                                  parseFloat(bearbeiteAusgabe.betrag),
                                  bearbeiteAusgabe.waehrung.iso,
                                  heimISO
                                )
                                await ausgabeBearbeiten(ausgabe.id, {
                                  beschreibung: bearbeiteAusgabe.beschreibung,
                                  betrag: parseFloat(betragInHeim.toFixed(2)),
                                  betrag_original: parseFloat(bearbeiteAusgabe.betrag),
                                  waehrung_original: bearbeiteAusgabe.waehrung.symbol,
                                  bezahlt_von: bearbeiteAusgabe.bezahlt_von,
                                  datum: bearbeiteAusgabe.datum,
                                })
                                setBearbeiteAusgabe(null)
                              }} className="btn-press" style={{ ...speichernButtonStyle, flex: 1 }}>{t('speichern')}</button>
                              <button onClick={() => setBearbeiteAusgabe(null)} className="btn-press" style={{ ...abbrechenButtonStyle, flex: 1 }}>{t('abbrechen')}</button>
                            </div>
                          </div>
                        ) : (
                          <div className={`fade-in-${Math.min(index + 1, 5)}`} style={{
                            display: 'flex', alignItems: 'flex-start', gap: '12px',
                            paddingBottom: index < ausgabenDesTages.length - 1 ? '16px' : '0',
                            marginBottom: index < ausgabenDesTages.length - 1 ? '16px' : '0',
                            borderBottom: index < ausgabenDesTages.length - 1 ? '1px solid var(--border)' : 'none',
                          }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--gold)', marginTop: '6px', flexShrink: 0, boxShadow: '0 0 8px rgba(201,168,76,0.4)' }} />

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <p style={{ fontWeight: '600', margin: '0 0 4px', overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0, fontSize: '0.95rem' }}>
                                  {ausgabe.beschreibung}
                                </p>
                                <span style={{ fontSize: '1.1rem', color: 'var(--gold)', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  {/* Bei Fremdwährung Original + umgerechneten Betrag anzeigen */}
                                  {ausgabe.waehrung_original && ausgabe.waehrung_original !== waehrung
                                    ? `${Number(ausgabe.betrag_original).toFixed(2)}${ausgabe.waehrung_original} (${Number(ausgabe.betrag).toFixed(2)}${waehrung})`
                                    : `${Number(ausgabe.betrag).toFixed(2)}${waehrung}`}
                                </span>
                              </div>
                              <p style={{ color: 'var(--text-sub)', fontSize: '0.78rem', margin: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                                {t('bezahltVonText')(ausgabe.bezahlt_von)}
                                {ausgabe.fuer && ausgabe.fuer.length > 0 && (
                                  <span> · {t('fuerWenText')(Array.isArray(ausgabe.fuer) ? ausgabe.fuer.join(', ') : ausgabe.fuer)}</span>
                                )}
                              </p>
                            </div>

                            <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                              <button onClick={() => setBearbeiteAusgabe({
                                ...ausgabe,
                                datum: ausgabe.datum || new Date().toISOString().split('T')[0],
                                betrag: ausgabe.betrag_original != null ? ausgabe.betrag_original : ausgabe.betrag,
                                waehrung: WAEHRUNGEN.find(w => w.symbol === ausgabe.waehrung_original) || WAEHRUNGEN.find(w => w.iso === heimISO) || WAEHRUNGEN[0],
                              })} className="btn-press" style={ikonButtonStyle}>
                                <SquarePen size={13} color="var(--gold)" />
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
          </div>
        )}

        {ausgaben.length === 0 && (
          <p className="fade-in" style={{ color: 'var(--text-sub)', textAlign: 'center', marginBottom: '16px', fontStyle: 'italic', fontSize: '0.9rem' }}>
            {t('keineAusgaben')}
          </p>
        )}

        {/* Saldo pro Person mit Balken */}
        {teilnehmer.length > 0 && ausgaben.length > 0 && (
          <div className="fade-in-3" style={karteStyle}>
            <h3 style={{ margin: '0 0 18px', fontWeight: '700', fontSize: '1rem' }}>{t('saldoTitel')}</h3>
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
                      {positiv ? '+' : ''}{saldo.toFixed(2)}{waehrung}
                    </p>
                  </div>
                  <div style={{ backgroundColor: 'var(--sub)', borderRadius: '6px', height: '5px', overflow: 'hidden' }}>
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
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1rem' }}>{t('abrechnungTitel')}</h3>
              {schulden.length > 0 && (
                <button onClick={() => setAbrechnenOffen(!abrechnenOffen)} className="btn-press" style={{
                  backgroundColor: 'transparent', border: '1px solid rgba(201,168,76,0.3)',
                  color: 'var(--gold)', padding: '0 12px', minHeight: '44px', boxSizing: 'border-box',
                  borderRadius: '8px', display: 'flex', alignItems: 'center',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
                }}>
                  {abrechnenOffen ? t('fertig') : t('abrechnen')}
                </button>
              )}
            </div>
            {schulden.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '15px' }}>✓</span>
                </div>
                <p style={{ color: '#4caf50', margin: 0, fontWeight: '600' }}>{t('alleQuitt')}</p>
              </div>
            ) : (
              schulden.map((s, index) => (
                <div key={index} style={{
                  backgroundColor: 'var(--sub)', borderRadius: '12px', padding: '12px 14px',
                  marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                }}>
                  <span style={{ color: 'var(--text)', fontWeight: '700', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{s.von}</span>
                  <span style={{ color: 'var(--text-sub)', fontSize: '0.82rem' }}>{t('schuldet')}</span>
                  <span style={{ color: 'var(--text)', fontWeight: '700', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{s.an}</span>
                  <span style={{ color: 'var(--gold)', fontWeight: '800', marginLeft: 'auto' }}>{s.betrag}{waehrung}</span>

                  {abrechnenOffen && (
                    <button onClick={() => schuldAbrechnen(s)} className="btn-press" style={{
                      backgroundColor: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)',
                      color: '#4caf50', padding: '0 10px', minHeight: '44px', boxSizing: 'border-box', borderRadius: '8px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.78rem', fontWeight: '700', width: '100%', justifyContent: 'center', marginTop: '4px',
                    }}>
                      <Check size={13} /> {t('beglichenBtn')}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Floating Action Button – wie bei Splid – bottom berücksichtigt Safe-Area, damit er nicht mit der BottomNav kollidiert */}
      <button
        onClick={() => setFormularOffen(true)}
        className="btn-press"
        style={{
          position: 'fixed', bottom: 'calc(85px + env(safe-area-inset-bottom))', right: '20px',
          width: '58px', height: '58px', borderRadius: '50%',
          backgroundColor: 'var(--gold)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(201,168,76,0.5)',
          zIndex: 200,
        }}
      >
        <Plus size={26} color="#0a0f1e" strokeWidth={2.5} />
      </button>

      {/* Neue Ausgabe – Bottom Sheet Modal – hoher z-index damit das Sheet immer über allem liegt */}
      {formularOffen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 9998,
        }}>
          <div className="fade-in" style={{
            backgroundColor: 'var(--card)', borderRadius: '24px 24px 0 0',
            padding: '24px 20px 32px', width: '100%', maxWidth: '600px',
            maxHeight: '85vh', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box',
            position: 'relative', zIndex: 9999,
          }}>
            {/* Griff oben */}
            <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--sub)', borderRadius: '2px', margin: '0 auto 20px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.2rem' }}>{t('neueAusgabeTitel')}</h3>
              <button onClick={() => setFormularOffen(false)} style={{
                background: 'var(--sub)', border: 'none', borderRadius: '50%',
                width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-sub)',
              }}>
                <X size={16} />
              </button>
            </div>

            <input placeholder={t('beschreibungPlatzhalter')} value={neueAusgabe.beschreibung}
              onChange={(e) => setNeueAusgabe({ ...neueAusgabe, beschreibung: e.target.value })}
              style={inputStyle} />

            <input placeholder={t('betragInWaehrungPlatzhalter')} type="number" value={neueAusgabe.betrag}
              onChange={(e) => setNeueAusgabe({ ...neueAusgabe, betrag: e.target.value })}
              style={inputStyle} />

            {/* Währungs-Auswahl für den eingegebenen Betrag */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              {WAEHRUNGEN.map(w => (
                <button
                  key={w.iso}
                  onClick={() => setNeueAusgabe({ ...neueAusgabe, waehrung: w })}
                  className="btn-press"
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    backgroundColor: neueAusgabe.waehrung.iso === w.iso ? 'var(--gold)' : 'var(--sub)',
                    color: neueAusgabe.waehrung.iso === w.iso ? '#0a0f1e' : 'var(--text-sub)',
                  }}
                >
                  {w.symbol}
                </button>
              ))}
            </div>

            {/* Live-Umrechnung anzeigen, wenn eine Fremdwährung gewählt wurde */}
            {neueAusgabe.betrag && neueAusgabe.waehrung.iso !== heimISO && (
              <p style={{
                color: 'var(--text-sub)', fontSize: '0.82rem',
                marginBottom: '10px', textAlign: 'right',
              }}>
                ≈ {umrechnen(parseFloat(neueAusgabe.betrag), neueAusgabe.waehrung.iso, heimISO).toFixed(2)}{waehrung}
              </p>
            )}

            <input type="date" value={neueAusgabe.datum}
              onChange={(e) => setNeueAusgabe({ ...neueAusgabe, datum: e.target.value })}
              style={dateInputStyle} />

            <select value={neueAusgabe.bezahlt_von}
              onChange={(e) => setNeueAusgabe({ ...neueAusgabe, bezahlt_von: e.target.value })}
              style={{ ...inputStyle, appearance: 'none' }}>
              <option value="">{t('bezahltVonOption')}</option>
              {teilnehmer.map(person => <option key={person.id} value={person.name}>{person.name}</option>)}
            </select>

            <p style={{ color: 'var(--text-sub)', marginBottom: '10px', fontSize: '0.82rem' }}>
              {t('fuerWenLeerAlle')}
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
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', boxSizing: 'border-box',
                  }}
                >
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    backgroundColor: istGewaehlt ? 'var(--gold)' : 'transparent',
                    border: istGewaehlt ? '2px solid var(--gold)' : '1px solid var(--gold)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {istGewaehlt && <span style={{ fontSize: '11px', color: '#0a0f1e', fontWeight: '700' }}>✓</span>}
                  </div>
                  <p style={{ margin: 0, color: 'var(--text)', minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word', fontSize: '0.95rem' }}>
                    {person.name}
                  </p>
                </div>
              )
            })}

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button onClick={ausgabeHinzufuegen} className="btn-press" style={{ ...speichernButtonStyle, flex: 1 }}>{t('speichern')}</button>
              <button onClick={() => setFormularOffen(false)} className="btn-press" style={{ ...abbrechenButtonStyle, flex: 1 }}>{t('abbrechen')}</button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} setToasts={setToasts} />
    </div>
  )
}

const karteStyle = {
  backgroundColor: 'var(--card)', borderRadius: '22px',
  padding: 'clamp(18px, 4vw, 24px)', marginBottom: '16px',
  boxSizing: 'border-box', boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
}

const inputStyle = {
  width: '100%', padding: '13px 14px', backgroundColor: 'var(--input-bg)',
  border: '1px solid var(--input-border)', borderRadius: '12px',
  // min. 16px verhindert Auto-Zoom bei Fokus auf iOS Safari
  color: 'var(--text)', fontSize: '16px', minHeight: '44px',
  marginBottom: '10px', boxSizing: 'border-box',
}

// Eigener Style fürs Datumsfeld – appearance:none entfernt die native Breite
// des Kalender-Widgets, das <input type="date"> sonst über den Screen hinausschieben kann
const dateInputStyle = {
  ...inputStyle,
  maxWidth: '100%',
  appearance: 'none',
  WebkitAppearance: 'none',
}

const speichernButtonStyle = {
  backgroundColor: 'var(--gold)', color: '#0a0f1e', border: 'none',
  padding: '14px', minHeight: '48px', borderRadius: '14px',
  cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem',
  boxSizing: 'border-box', boxShadow: '0 4px 16px rgba(201,168,76,0.3)',
}

const abbrechenButtonStyle = {
  backgroundColor: 'transparent', color: 'var(--text-sub)',
  border: '1px solid var(--border)',
  padding: '14px', minHeight: '48px', borderRadius: '14px',
  cursor: 'pointer', boxSizing: 'border-box', fontWeight: '500',
}

const ikonButtonStyle = {
  backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)',
  cursor: 'pointer', borderRadius: '10px',
  minWidth: '44px', minHeight: '44px', boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const ikonButtonStyleRot = {
  backgroundColor: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.2)',
  cursor: 'pointer', borderRadius: '10px',
  minWidth: '44px', minHeight: '44px', boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

export default TripKosten
