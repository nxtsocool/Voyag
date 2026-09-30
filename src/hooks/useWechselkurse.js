import { useState, useEffect } from 'react'
import { WAEHRUNGEN } from '../data/waehrungen'

const CACHE_KEY = 'voyag_wechselkurse'
const CACHE_DAUER = 60 * 60 * 1000 // 1 Stunde

// Fallback-Kurse falls die API nicht erreichbar ist (grobe Näherungswerte)
const FALLBACK_KURSE = {
  EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.95, JPY: 163,
  CZK: 25.3, HUF: 390, PLN: 4.3, SEK: 11.3, NOK: 11.7,
  DKK: 7.46, TRY: 34, THB: 38, AUD: 1.65, CAD: 1.47,
}

const ISO_SYMBOLE = WAEHRUNGEN.filter(w => w.iso !== 'EUR').map(w => w.iso).join(',')

export default function useWechselkurse() {
  const [kurse, setKurse] = useState(FALLBACK_KURSE)
  const [laden, setLaden] = useState(true)
  const [veraltet, setVeraltet] = useState(false) // true = Fallback-Kurse werden verwendet

  useEffect(() => {
    const kurseHolen = async () => {
      // Cache prüfen
      const gecacht = localStorage.getItem(CACHE_KEY)
      if (gecacht) {
        const { daten, zeitstempel } = JSON.parse(gecacht)
        if (Date.now() - zeitstempel < CACHE_DAUER) {
          setKurse(daten)
          setLaden(false)
          return
        }
      }
      // Neue Kurse laden
      try {
        const res = await fetch(`https://api.frankfurter.app/latest?base=EUR&symbols=${ISO_SYMBOLE}`)
        if (!res.ok) throw new Error('Wechselkurse konnten nicht geladen werden')
        const data = await res.json()
        const neuKurse = { EUR: 1, ...data.rates }
        setKurse(neuKurse)
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          daten: neuKurse,
          zeitstempel: Date.now(),
        }))
      } catch {
        // API nicht erreichbar – Fallback nutzen
        setKurse(FALLBACK_KURSE)
        setVeraltet(true)
      }
      setLaden(false)
    }
    kurseHolen()
  }, [])

  // Betrag von einer Währung in eine andere umrechnen
  const umrechnen = (betrag, von, nach) => {
    if (von === nach) return betrag
    // Erst in EUR umrechnen, dann in die Zielwährung
    const inEur = betrag / (kurse[von] || 1)
    return inEur * (kurse[nach] || 1)
  }

  return { kurse, laden, umrechnen, veraltet }
}
