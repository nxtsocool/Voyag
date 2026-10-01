import { useState, useRef, useEffect } from 'react'
import { WAEHRUNGEN } from '../data/waehrungen'
import { heuteISO } from '../utils/datum'

const CACHE_PREFIX = 'voyag_wechselkurse_'
const CACHE_DAUER_HEUTE = 60 * 60 * 1000 // 1 Stunde – nur der heutige Kurs kann sich noch ändern
// Warnung nur einmal pro Browser-Session zeigen, nicht bei jedem Mount einer
// Komponente die diesen Hook nutzt erneut (O7)
const WARNUNG_SESSION_KEY = 'voyag_wechselkurs_warnung_gezeigt'

// Fallback-Kurse falls die API nicht erreichbar ist (grobe Näherungswerte)
const FALLBACK_KURSE = {
  EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.95, JPY: 163,
  CZK: 25.3, HUF: 390, PLN: 4.3, SEK: 11.3, NOK: 11.7,
  DKK: 7.46, TRY: 34, THB: 38, AUD: 1.65, CAD: 1.47,
}

const ISO_SYMBOLE = WAEHRUNGEN.filter(w => w.iso !== 'EUR').map(w => w.iso).join(',')

export default function useWechselkurse() {
  // Kurse pro Datum statt eines einzelnen globalen Snapshots (O7) – jede
  // Ausgabe rechnet mit dem Kurs ihres eigenen Datums statt immer mit "heute"
  const [kurseProDatum, setKurseProDatum] = useState({})
  const [veraltet, setVeraltet] = useState(false)
  // Verhindert parallele Mehrfach-Fetches für dasselbe Datum (z.B. wenn
  // mehrere Ausgaben am selben Tag gleichzeitig gerendert werden)
  const ladendeDatenRef = useRef(new Set())

  const kurseFuerDatumLaden = async (datum) => {
    if (kurseProDatum[datum] || ladendeDatenRef.current.has(datum)) return
    ladendeDatenRef.current.add(datum)

    const istHeute = datum === heuteISO()
    const cacheKey = `${CACHE_PREFIX}${datum}`
    const gecacht = localStorage.getItem(cacheKey)
    if (gecacht) {
      const { daten, zeitstempel } = JSON.parse(gecacht)
      // Historische Kurse ändern sich nicht mehr und bleiben unbegrenzt gültig;
      // der heutige Kurs nur für eine Stunde, da er sich noch aktualisieren kann
      if (!istHeute || Date.now() - zeitstempel < CACHE_DAUER_HEUTE) {
        setKurseProDatum(prev => ({ ...prev, [datum]: daten }))
        ladendeDatenRef.current.delete(datum)
        return
      }
    }

    try {
      const endpoint = istHeute ? 'latest' : datum
      const res = await fetch(`https://api.frankfurter.app/${endpoint}?base=EUR&symbols=${ISO_SYMBOLE}`)
      if (!res.ok) throw new Error('Wechselkurse konnten nicht geladen werden')
      const data = await res.json()
      const neuKurse = { EUR: 1, ...data.rates }
      setKurseProDatum(prev => ({ ...prev, [datum]: neuKurse }))
      localStorage.setItem(cacheKey, JSON.stringify({ daten: neuKurse, zeitstempel: Date.now() }))
    } catch {
      // API nicht erreichbar – Fallback nutzen
      setKurseProDatum(prev => ({ ...prev, [datum]: FALLBACK_KURSE }))
      if (!sessionStorage.getItem(WARNUNG_SESSION_KEY)) {
        sessionStorage.setItem(WARNUNG_SESSION_KEY, '1')
        setVeraltet(true)
      }
    }
    ladendeDatenRef.current.delete(datum)
  }

  // Kurse für heute initial laden, damit Umrechnungen ohne explizites Datum
  // (z.B. die Trip-Währungsänderung in TripsOverview.jsx) sofort funktionieren.
  // react-hooks/set-state-in-effect schlägt hier wie in MapScreen.jsx/TripHome.jsx/
  // TripKosten.jsx fälschlich Alarm, da kurseFuerDatumLaden auch von umrechnen()
  // außerhalb dieses Effects wiederverwendet wird (siehe O4-Begründung dort)
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { kurseFuerDatumLaden(heuteISO()) }, [])

  // Betrag von einer Währung in eine andere umrechnen – datum optional, nutzt
  // den Kurs des jeweiligen Tages (Default: heute). Ist der Kurs für dieses
  // Datum noch nicht geladen, wird er angefragt und bis dahin der Kurs von
  // heute bzw. der Fallback als Näherung verwendet
  const umrechnen = (betrag, von, nach, datum = heuteISO()) => {
    if (von === nach) return betrag
    const kurse = kurseProDatum[datum] || kurseProDatum[heuteISO()] || FALLBACK_KURSE
    if (!kurseProDatum[datum]) kurseFuerDatumLaden(datum)
    // Erst in EUR umrechnen, dann in die Zielwährung
    const inEur = betrag / (kurse[von] || 1)
    return inEur * (kurse[nach] || 1)
  }

  return { umrechnen, veraltet }
}
