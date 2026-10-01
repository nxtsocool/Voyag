import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import { Wallet, Trash2, SquarePen, Plus, Check, Calendar, X, ChevronDown } from 'lucide-react'
import Toast from '../components/Toast'
import useUndoLoeschen from '../hooks/useUndoLoeschen'
import usePullToRefresh from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'
import useBodyScrollLock from '../hooks/useBodyScrollLock'
import TripNichtGefunden from '../components/TripNichtGefunden'
import { useSettings } from '../context/useSettings'
import useWechselkurse from '../hooks/useWechselkurse'
import { WAEHRUNGEN, symbolOderIsoZuIso } from '../data/waehrungen'
import { saldenBerechnen, schuldenBerechnen, anteilBerechnen } from '../utils/kosten'
import { heuteISO, parseDatum, formatDatum } from '../utils/datum'

function TripKosten() {
  const { id } = useParams()
  const { toasts, setToasts, toast, loeschenMitUndo } = useUndoLoeschen()
  const { waehrungISO: heimISO, t, design, sprache } = useSettings()
  const { umrechnen, veraltet } = useWechselkurse()
  const [trip, setTrip] = useState(null)
  const [ausgaben, setAusgaben] = useState([])
  const [teilnehmer, setTeilnehmer] = useState([])
  const [abrechnungen, setAbrechnungen] = useState([]) // bereits beglichene Schulden
  const [currentUserId, setCurrentUserId] = useState(null)
  const [laden, setLaden] = useState(true)
  // Ein Bottom-Sheet für Neu + Bearbeiten (W9) – bearbeiteAusgabe null = neu anlegen,
  // sonst die Original-Ausgabe, die gerade bearbeitet wird
  const [formularOffen, setFormularOffen] = useState(false)
  const [bearbeiteAusgabe, setBearbeiteAusgabe] = useState(null)
  const [abrechnenOffen, setAbrechnenOffen] = useState(false)
  // Ob die gesamte Ausgaben-Liste aufgeklappt ist – standardmäßig aufgeklappt
  const [ausgabenOffen, setAusgabenOffen] = useState(true)
  // Schützt gegen doppeltes Anlegen/Speichern einer Ausgabe durch schnelles Doppel-Tippen
  const [speichernLaeuft, setSpeichernLaeuft] = useState(false)
  // Schützt gegen doppeltes Abrechnen durch schnelles Doppel-Tippen – als Set
  // (nicht ein einzelner Boolean), da mehrere Schulden unabhängig voneinander
  // gleichzeitig in der Liste abrechenbar sind
  const [abrechnenLaeuft, setAbrechnenLaeuft] = useState(new Set())

  const [formDaten, setFormDaten] = useState({
    beschreibung: '', betrag: '', bezahlt_von: '', fuer: [],
    datum: heuteISO(),
    waehrung: { symbol: '€', iso: 'EUR' },
  })

  const datenLaden = async () => {
    // Alle Queries hängen nur von der Trip-ID (bzw. dem eingeloggten User) ab,
    // nicht voneinander – parallel laden
    const [tripRes, ausgabenRes, teilnehmerRes, abrechnungenRes, authRes] = await Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase.from('ausgaben').select('*').eq('trip_id', id).order('datum', { ascending: false }),
      supabase.from('teilnehmer').select('*').eq('trip_id', id),
      supabase.from('abrechnungen').select('*').eq('trip_id', id),
      supabase.auth.getUser(),
    ])

    if (tripRes.error) console.error('Fehler beim Laden des Trips:', tripRes.error)
    setTrip(tripRes.data)

    if (!tripRes.data) { setLaden(false); return }

    if (ausgabenRes.error || teilnehmerRes.error || abrechnungenRes.error) {
      console.error('Fehler beim Laden der Trip-Daten:', ausgabenRes.error || teilnehmerRes.error || abrechnungenRes.error)
      toast(t('verbindungsfehler'), 'error')
    }

    setAusgaben(ausgabenRes.data || [])
    setTeilnehmer(teilnehmerRes.data || [])
    setAbrechnungen(abrechnungenRes.data || [])
    setCurrentUserId(authRes.data?.user?.id || null)

    setLaden(false)
  }

  // Lint-Regel react-hooks/set-state-in-effect schlägt hier fälschlich Alarm:
  // datenLaden() wird bewusst auch von usePullToRefresh wiederverwendet (Pull-to-Refresh),
  // daher kein rein effect-lokaler Daten-Fetch wie in TripOrte.jsx/TripPackliste.jsx
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { datenLaden() }, [id])
  useBodyScrollLock(formularOffen)

  // Alle Beträge sind ab jetzt immer in Trip-Währung (K1) – die Heimwährung
  // des Betrachters (heimISO) dient nur noch für eine optionale Zusatzzeile
  const tripISO = trip?.waehrung || 'EUR'
  const tripWaehrungObj = WAEHRUNGEN.find(w => w.iso === tripISO) || WAEHRUNGEN[0]
  const tripSymbol = tripWaehrungObj.symbol

  // Warnung anzeigen, falls die API nicht erreichbar war und Näherungswerte verwendet werden
  useEffect(() => {
    if (veraltet) toast(t('wechselkurseNichtAktuell'), 'error')
  }, [veraltet])

  const { ziehen, fortschritt, schwellenwert } = usePullToRefresh(datenLaden)

  const gesamt = ausgaben.reduce((sum, a) => sum + a.betrag, 0)

  // Der mit dem eingeloggten User verknüpfte Teilnehmer dieser Reise (U2) –
  // dient als Vorbelegung für "Bezahlt von" und für die "Dein Anteil"/Saldo-Zeile
  const eigenerTeilnehmer = teilnehmer.find(p => p.user_id === currentUserId) || null

  // Namen eines Teilnehmers anhand seiner ID auflösen (Anzeige in der Ausgaben-Liste)
  const teilnehmerName = (teilnehmerId) =>
    teilnehmer.find(p => p.id === teilnehmerId)?.name || t('unbekannterTeilnehmer')

  // Pflichtfeld-Hinweis (W3) – welches Feld fehlt noch fürs Speichern
  const formFehlendesFeld = !formDaten.beschreibung.trim() ? t('beschreibungPlatzhalter')
    : !formDaten.betrag ? t('betragPlatzhalter')
    : !formDaten.bezahlt_von ? t('bezahltVonOption')
    : null

  // Sheet öffnen – leer (mit sinnvollen Vorbelegungen) für Neu, vorausgefüllt
  // für Bearbeiten; ein einziges Bottom-Sheet für beide Fälle (W9)
  const sheetOeffnen = (ausgabe = null) => {
    setBearbeiteAusgabe(ausgabe)
    if (ausgabe) {
      setFormDaten({
        beschreibung: ausgabe.beschreibung,
        betrag: String(ausgabe.betrag_original != null ? ausgabe.betrag_original : ausgabe.betrag),
        bezahlt_von: String(ausgabe.bezahlt_von_id),
        fuer: ausgabe.fuer_ids || [],
        datum: ausgabe.datum || heuteISO(),
        // waehrung_original kann (vor K1) noch ein Symbol statt eines ISO-Codes sein
        waehrung: (ausgabe.waehrung_original && WAEHRUNGEN.find(w => w.iso === symbolOderIsoZuIso(ausgabe.waehrung_original)))
          || tripWaehrungObj,
      })
    } else {
      setFormDaten({
        beschreibung: '', betrag: '',
        bezahlt_von: eigenerTeilnehmer ? String(eigenerTeilnehmer.id) : '',
        fuer: [],
        datum: heuteISO(),
        waehrung: tripWaehrungObj,
      })
    }
    setFormularOffen(true)
  }

  const sheetSchliessen = () => {
    setFormularOffen(false)
    setBearbeiteAusgabe(null)
  }

  // Ausgabe speichern – je nach Modus Insert oder Update (W9: ein Formular für beides)
  const ausgabeSpeichern = async () => {
    // Schnelles Doppel-Tippen auf den Speichern-Button würde sonst die Ausgabe doppelt anlegen/speichern
    if (speichernLaeuft) return

    if (!formDaten.beschreibung || !formDaten.betrag || !formDaten.bezahlt_von) {
      toast(t('bitteAlleFelderAusfuellen'), 'error')
      return
    }

    setSpeichernLaeuft(true)
    try {
      // Betrag immer in die Trip-Währung umrechnen – Saldo/Schulden basieren
      // nur auf betrag, das für alle Mitreisenden dieselbe kanonische Zahl ist
      const betragInTrip = umrechnen(
        parseFloat(formDaten.betrag),
        formDaten.waehrung.iso,
        tripISO
      )

      const payload = {
        beschreibung: formDaten.beschreibung,
        betrag: parseFloat(betragInTrip.toFixed(2)),
        betrag_original: parseFloat(formDaten.betrag),
        waehrung_original: formDaten.waehrung.iso,
        bezahlt_von_id: Number(formDaten.bezahlt_von),
        datum: formDaten.datum,
        fuer_ids: formDaten.fuer.length > 0 ? formDaten.fuer : null,
      }

      if (bearbeiteAusgabe) {
        const { error } = await supabase.from('ausgaben').update(payload).eq('id', bearbeiteAusgabe.id)
        if (error) { console.error('Fehler:', error); toast(t('speichernFehlgeschlagen'), 'error'); return }
        setAusgaben(ausgaben.map(a => a.id === bearbeiteAusgabe.id ? { ...a, ...payload } : a))
        toast(t('gespeichertHaken'), 'success')
      } else {
        const { data, error } = await supabase.from('ausgaben').insert([{ ...payload, trip_id: id }]).select()
        if (error) { console.error('Fehler:', error); toast(t('fehlerBeimSpeichern'), 'error'); return }
        setAusgaben([data[0], ...ausgaben])
        toast(t('ausgabeHinzugefuegt'), 'success')
      }
      sheetSchliessen()
    } finally {
      setSpeichernLaeuft(false)
    }
  }

  // Ausgabe löschen – mit Rückgängig-Option (W4) statt sofortigem Löschen
  const ausgabeLoeschen = (ausgabeId) => {
    const vorherigeAusgaben = ausgaben
    loeschenMitUndo(ausgabeId, {
      entfernenLokal: () => setAusgaben(ausgaben.filter(a => a.id !== ausgabeId)),
      wiederherstellenLokal: () => setAusgaben(vorherigeAusgaben),
      ausfuehren: async () => {
        const { error } = await supabase
          .from('ausgaben')
          .delete()
          .eq('id', ausgabeId)
        if (error) {
          console.error('Fehler beim Löschen:', error)
          // Bei Fehler die Ausgabe wieder zurückholen
          setAusgaben(vorherigeAusgaben)
          toast(t('loeschenFehlgeschlagen'), 'error')
        }
      },
      nachricht: t('ausgabeGeloescht'),
      rueckgaengigLabel: t('rueckgaengig'),
    })
  }


  // Salden/Schulden werden ID-basiert in utils/kosten.js berechnet (K6) –
  // Namensgleichheit oder Umbenennungen können die Kostenaufteilung damit
  // nicht mehr verfälschen
  const salden = saldenBerechnen(teilnehmer, ausgaben, abrechnungen)
  const schulden = schuldenBerechnen(teilnehmer, ausgaben, abrechnungen)

  // Schuld als bezahlt markieren – mit optimistic update gegen Doppelklicks
  const schuldAbrechnen = async (schuld) => {
    const schuldKey = `${schuld.vonId}|${schuld.anId}`
    if (abrechnenLaeuft.has(schuldKey)) return
    setAbrechnenLaeuft(prev => new Set(prev).add(schuldKey))

    const neueAbrechnung = { trip_id: id, von_id: schuld.vonId, an_id: schuld.anId, betrag: parseFloat(schuld.betrag) }

    // Sofort lokal hinzufügen – Schuld verschwindet sofort aus der Liste,
    // verhindert dass durch Doppelklick zweimal abgerechnet wird
    setAbrechnungen(prev => [...prev, neueAbrechnung])

    try {
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
    } finally {
      setAbrechnenLaeuft(prev => { const next = new Set(prev); next.delete(schuldKey); return next })
    }
  }

  // Interner Gruppierungsschlüssel für Ausgaben ohne Datum – die Anzeige läuft
  // über t('ohneDatum'), damit der Text sprachabhängig ist (W11)
  const OHNE_DATUM_KEY = '__ohne_datum__'

  // Ausgaben nach Datum gruppieren
  const ausgabenNachDatum = () => {
    const gruppen = {}
    ausgaben.forEach(a => {
      const datum = a.datum || OHNE_DATUM_KEY
      if (!gruppen[datum]) gruppen[datum] = []
      gruppen[datum].push(a)
    })
    return Object.entries(gruppen).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const datumFormatieren = (datumStr) => {
    if (datumStr === OHNE_DATUM_KEY) return t('ohneDatum')
    return formatDatum(parseDatum(datumStr), sprache)
  }

  const maxSaldo = Math.max(...salden.map(s => Math.abs(s.saldo)), 0.01)

  // Eigener Saldo-Text für die Kopfzeile (U2) – zeigt bei genau einem Gläubiger
  // dessen Namen, sonst die Gesamtsumme
  const eigenerSaldoText = () => {
    if (!eigenerTeilnehmer) return null
    const eigenerSaldo = salden.find(s => s.id === eigenerTeilnehmer.id)?.saldo || 0
    if (Math.abs(eigenerSaldo) < 0.01) return t('duBistQuitt')
    if (eigenerSaldo > 0) return t('duBekommst')(`${eigenerSaldo.toFixed(2)}${tripSymbol}`)
    const eigeneSchulden = schulden.filter(s => s.vonId === eigenerTeilnehmer.id)
    if (eigeneSchulden.length === 1) {
      return t('duSchuldest')(eigeneSchulden[0].an, `${eigeneSchulden[0].betrag}${tripSymbol}`)
    }
    return t('duSchuldestMehreren')(`${Math.abs(eigenerSaldo).toFixed(2)}${tripSymbol}`)
  }

  if (laden) return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ padding: '0 20px', maxWidth: '600px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '160px', borderRadius: '24px', marginBottom: '16px', marginTop: 'calc(20px + env(safe-area-inset-top))' }} />
        <div className="skeleton" style={{ height: '240px', borderRadius: '22px' }} />
      </div>
    </div>
  )

  if (!trip) return <TripNichtGefunden />

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
            {gesamt.toFixed(2)}{tripSymbol}
          </h2>

          {teilnehmer.length > 0 && (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>{t('teilnehmerLabel')}</p>
                <p style={{ color: '#ffffff', fontWeight: '700', margin: 0, fontSize: '0.95rem' }}>{teilnehmer.length}</p>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              {eigenerTeilnehmer ? (
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>{t('deinAnteil')}</p>
                  <p style={{ color: '#ffffff', fontWeight: '700', margin: 0, fontSize: '0.95rem' }}>
                    {ausgaben.reduce((sum, a) => sum + anteilBerechnen(a, eigenerTeilnehmer.id, teilnehmer.map(p => p.id)), 0).toFixed(2)}{tripSymbol}
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>{t('proPerson')}</p>
                  <p style={{ color: '#ffffff', fontWeight: '700', margin: 0, fontSize: '0.95rem' }}>{(gesamt / teilnehmer.length).toFixed(2)}{tripSymbol}</p>
                </div>
              )}
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>{t('ausgabenLabel')}</p>
                <p style={{ color: '#ffffff', fontWeight: '700', margin: 0, fontSize: '0.95rem' }}>{ausgaben.length}</p>
              </div>
            </div>
          )}

          {/* Eigener Saldo (U2) */}
          {eigenerTeilnehmer && eigenerSaldoText() && (
            <p style={{
              color: design === 'light' ? 'rgba(255,255,255,0.9)' : 'var(--gold)',
              fontWeight: '700', fontSize: '0.88rem', margin: '16px 0 0',
            }}>
              {eigenerSaldoText()}
            </p>
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
                        <div className={`fade-in-${Math.min(index + 1, 5)}`} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '12px',
                          paddingBottom: index < ausgabenDesTages.length - 1 ? '16px' : '0',
                          marginBottom: index < ausgabenDesTages.length - 1 ? '16px' : '0',
                          borderBottom: index < ausgabenDesTages.length - 1 ? '1px solid var(--border)' : 'none',
                        }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--gold)', marginTop: '6px', flexShrink: 0, boxShadow: '0 0 8px rgba(201,168,76,0.4)' }} />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <p style={{ fontWeight: '600', margin: '0 0 4px', wordBreak: 'normal', overflowWrap: 'anywhere', hyphens: 'auto', minWidth: 0, fontSize: '0.95rem' }}>
                                {ausgabe.beschreibung}
                              </p>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <span style={{ fontSize: '1.1rem', color: 'var(--gold)', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                  {/* Betrag ist immer in Trip-Währung; bei Fremdwährungs-Eintrag zusätzlich der Original-Betrag */}
                                  {ausgabe.waehrung_original && symbolOderIsoZuIso(ausgabe.waehrung_original) !== tripISO
                                    ? `${Number(ausgabe.betrag_original).toFixed(2)}${WAEHRUNGEN.find(w => w.iso === symbolOderIsoZuIso(ausgabe.waehrung_original))?.symbol || ''} (${Number(ausgabe.betrag).toFixed(2)}${tripSymbol})`
                                    : `${Number(ausgabe.betrag).toFixed(2)}${tripSymbol}`}
                                </span>
                                {/* Optionale Zusatzzeile in der Heimwährung des Betrachters, wenn sie von der Trip-Währung abweicht */}
                                {heimISO !== tripISO && (
                                  <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>
                                    ≈ {umrechnen(ausgabe.betrag, tripISO, heimISO).toFixed(2)}{WAEHRUNGEN.find(w => w.iso === heimISO)?.symbol}
                                  </p>
                                )}
                              </div>
                            </div>
                            <p style={{ color: 'var(--text-sub)', fontSize: '0.78rem', margin: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                              {t('bezahltVonText')(teilnehmerName(ausgabe.bezahlt_von_id))}
                              {(() => {
                                const fuerArr = ausgabe.fuer_ids || []
                                const alleBetroffen = fuerArr.length === 0 || fuerArr.length === teilnehmer.length
                                return (
                                  <span> · {alleBetroffen ? t('fuerAlleText') : t('fuerWenText')(fuerArr.map(teilnehmerName).join(', '))}</span>
                                )
                              })()}
                            </p>
                          </div>

                          <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                            <button onClick={() => sheetOeffnen(ausgabe)} className="btn-press" style={ikonButtonStyle}>
                              <SquarePen size={13} color="var(--gold)" />
                            </button>
                            <button onClick={() => ausgabeLoeschen(ausgabe.id)} className="btn-press" style={ikonButtonStyleRot}>
                              <Trash2 size={13} color="#e94560" />
                            </button>
                          </div>
                        </div>
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
              const saldo = salden.find(s => s.id === person.id)?.saldo || 0
              const balkenBreite = Math.min((Math.abs(saldo) / maxSaldo) * 100, 100)
              const positiv = saldo >= 0

              return (
                <div key={person.id} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                    <p style={{ fontWeight: '600', margin: 0, fontSize: '0.92rem', overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0, flex: 1 }}>
                      {person.name}
                    </p>
                    <p style={{ fontWeight: '700', margin: 0, whiteSpace: 'nowrap', marginLeft: '8px', color: positiv ? '#4caf50' : '#e94560', fontSize: '0.95rem' }}>
                      {positiv ? '+' : ''}{saldo.toFixed(2)}{tripSymbol}
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
                  <span style={{ color: 'var(--gold)', fontWeight: '800', marginLeft: 'auto' }}>{s.betrag}{tripSymbol}</span>

                  {abrechnenOffen && (
                    <button onClick={() => schuldAbrechnen(s)} disabled={abrechnenLaeuft.has(`${s.von}|${s.an}`)} className="btn-press" style={{
                      backgroundColor: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)',
                      color: '#4caf50', padding: '0 10px', minHeight: '44px', boxSizing: 'border-box', borderRadius: '8px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.78rem', fontWeight: '700', width: '100%', justifyContent: 'center', marginTop: '4px',
                      opacity: abrechnenLaeuft.has(`${s.von}|${s.an}`) ? 0.6 : 1,
                    }}>
                      <Check size={13} /> {abrechnenLaeuft.has(`${s.von}|${s.an}`) ? t('wirdGespeichert') : t('beglichenBtn')}
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
        onClick={() => sheetOeffnen()}
        className="btn-press"
        style={{
          position: 'fixed', bottom: 'calc(20px + env(safe-area-inset-bottom))', right: '20px',
          width: '58px', height: '58px', borderRadius: '50%',
          backgroundColor: 'var(--gold)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(201,168,76,0.5)',
          zIndex: 200,
        }}
      >
        <Plus size={26} color="#0a0f1e" strokeWidth={2.5} />
      </button>

      {/* Neue Ausgabe – Bottom Sheet Modal */}
      {formularOffen && (
        <div onClick={sheetSchliessen} style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 9998,
        }}>
          <div onClick={(e) => e.stopPropagation()} className="fade-in" style={{
            backgroundColor: 'var(--card)', borderRadius: '24px 24px 0 0',
            width: '100%', maxWidth: '600px',
            maxHeight: 'calc(100dvh - env(safe-area-inset-top) - 24px)', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box',
            padding: '24px 20px calc(32px + env(safe-area-inset-bottom))',
            zIndex: 9999,
          }}>
            {/* Griff oben */}
            <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--sub)', borderRadius: '2px', margin: '0 auto 20px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.2rem' }}>
                {bearbeiteAusgabe ? t('ausgabeBearbeitenTitel') : t('neueAusgabeTitel')}
              </h3>
              <button onClick={sheetSchliessen} style={{
                background: 'var(--sub)', border: 'none', borderRadius: '50%',
                width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-sub)',
              }}>
                <X size={16} />
              </button>
            </div>

            <input placeholder={t('beschreibungPlatzhalter')} value={formDaten.beschreibung}
              onChange={(e) => setFormDaten({ ...formDaten, beschreibung: e.target.value })}
              style={inputStyle} />

            <input placeholder={t('betragInWaehrungPlatzhalter')} type="number" value={formDaten.betrag}
              onChange={(e) => setFormDaten({ ...formDaten, betrag: e.target.value })}
              style={inputStyle} />

            {/* Währungs-Auswahl für den eingegebenen Betrag */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              {WAEHRUNGEN.map(w => (
                <button
                  key={w.iso}
                  onClick={() => setFormDaten({ ...formDaten, waehrung: w })}
                  className="btn-press"
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    backgroundColor: formDaten.waehrung.iso === w.iso ? 'var(--gold)' : 'var(--sub)',
                    color: formDaten.waehrung.iso === w.iso ? '#0a0f1e' : 'var(--text-sub)',
                  }}
                >
                  {w.symbol}
                </button>
              ))}
            </div>

            {/* Live-Umrechnung anzeigen, wenn eine Fremdwährung gewählt wurde */}
            {formDaten.betrag && formDaten.waehrung.iso !== tripISO && (
              <p style={{
                color: 'var(--text-sub)', fontSize: '0.82rem',
                marginBottom: '10px', textAlign: 'right',
              }}>
                ≈ {umrechnen(parseFloat(formDaten.betrag), formDaten.waehrung.iso, tripISO).toFixed(2)}{tripSymbol}
              </p>
            )}

            <input type="date" value={formDaten.datum}
              onChange={(e) => setFormDaten({ ...formDaten, datum: e.target.value })}
              style={dateInputStyle} />

            <select value={formDaten.bezahlt_von}
              onChange={(e) => setFormDaten({ ...formDaten, bezahlt_von: e.target.value })}
              style={{ ...inputStyle, appearance: 'none' }}>
              <option value="">{t('bezahltVonOption')}</option>
              {teilnehmer.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>

            <p style={{ color: 'var(--text-sub)', marginBottom: '10px', fontSize: '0.82rem' }}>
              {t('fuerWenLeerAlle')}
            </p>
            {teilnehmer.map(person => {
              const istGewaehlt = formDaten.fuer.includes(person.id)
              return (
                <div key={person.id}
                  onClick={() => {
                    const aktuell = formDaten.fuer
                    const neu = aktuell.includes(person.id)
                      ? aktuell.filter(p => p !== person.id)
                      : [...aktuell, person.id]
                    setFormDaten({ ...formDaten, fuer: neu })
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

            {formFehlendesFeld && (
              <p style={{ color: 'var(--text-sub)', fontSize: '0.78rem', margin: '10px 0 0' }}>
                {t('pflichtfeldFehlt')(formFehlendesFeld)}
              </p>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button onClick={ausgabeSpeichern} disabled={speichernLaeuft || !!formFehlendesFeld} className="btn-press" style={{ ...speichernButtonStyle, flex: 1, opacity: speichernLaeuft || formFehlendesFeld ? 0.6 : 1 }}>
                {speichernLaeuft ? t('wirdGespeichert') : t('speichern')}
              </button>
              <button onClick={sheetSchliessen} className="btn-press" style={{ ...abbrechenButtonStyle, flex: 1 }}>{t('abbrechen')}</button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} setToasts={setToasts} />
    </div>
  )
}

const karteStyle = {
  backgroundColor: 'var(--card)', borderRadius: '20px',
  padding: 'clamp(18px, 4vw, 24px)', marginBottom: '16px',
  boxSizing: 'border-box', boxShadow: 'var(--shadow)',
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
