// Prüft die reinen Hilfsfunktionen aus utils/datum.js und utils/kosten.js
// gegen ein paar Randfälle, die im Testbericht explizit genannt wurden:
// laufende Reise, letzter Reisetag, 00:30-Zeitzonengrenze, Saldo-Summe bei
// ungleicher 3-Personen-Teilaufteilung, Fremdwährungs-Ausgabe.
//
// Aufruf: node scripts/check-utils.mjs
// Exit-Code 0 = alle Checks grün, 1 = mindestens ein Check fehlgeschlagen.

import { parseDatum, reiseStatus, tageBis, heuteISO } from '../src/utils/datum.js'
import { saldenBerechnen, schuldenBerechnen, anteilBerechnen } from '../src/utils/kosten.js'

let fehlgeschlagen = 0

function check(beschreibung, istOk) {
  if (istOk) {
    console.log(`  OK   ${beschreibung}`)
  } else {
    console.log(`  FEHLER  ${beschreibung}`)
    fehlgeschlagen++
  }
}

// ISO-String ("YYYY-MM-DD") für "heute + n Tage" liefern, lokal berechnet
// (keine new Date('YYYY-MM-DD')-UTC-Falle)
function isoOffset(tageOffset) {
  const d = new Date()
  d.setDate(d.getDate() + tageOffset)
  const jahr = d.getFullYear()
  const monat = String(d.getMonth() + 1).padStart(2, '0')
  const tag = String(d.getDate()).padStart(2, '0')
  return `${jahr}-${monat}-${tag}`
}

console.log('── utils/datum.js ──')

// 1) Laufende Reise: Start vor heute, Ende nach heute
{
  const trip = { start_datum: isoOffset(-2), end_datum: isoOffset(3) }
  check('Reise die gerade läuft → Status "laufend"', reiseStatus(trip) === 'laufend')
}

// 2) Letzter Reisetag zählt noch als "laufend", nicht als "vergangen"
{
  const trip = { start_datum: isoOffset(-5), end_datum: isoOffset(0) }
  check('Letzter Reisetag (Ende = heute) → Status "laufend"', reiseStatus(trip) === 'laufend')
}

// 2b) Tag nach dem letzten Reisetag ist "vergangen"
{
  const trip = { start_datum: isoOffset(-5), end_datum: isoOffset(-1) }
  check('Tag nach dem letzten Reisetag → Status "vergangen"', reiseStatus(trip) === 'vergangen')
}

// 2c) Reise die erst morgen beginnt ist "kommend"
{
  const trip = { start_datum: isoOffset(1), end_datum: isoOffset(5) }
  check('Reise die morgen beginnt → Status "kommend"', reiseStatus(trip) === 'kommend')
}

// 3) 00:30-Zeitzonengrenze: Die Status-/Tage-Berechnung arbeitet unabhängig von
// der aktuellen Uhrzeit rein auf Kalendertagen – unabhängig davon ob das Skript
// z.B. um 00:30 (kurz nach Mitternacht) läuft, darf "gestern" nie als "heute"
// oder "morgen" durchgehen und umgekehrt
{
  const gestern = parseDatum(isoOffset(-1))
  const heute = parseDatum(isoOffset(0))
  const morgen = parseDatum(isoOffset(1))
  check('tageBis(gestern) < 0, unabhängig von der Uhrzeit', tageBis(gestern) < 0)
  check('tageBis(heute) === 0, unabhängig von der Uhrzeit', tageBis(heute) === 0)
  check('tageBis(morgen) === 1, unabhängig von der Uhrzeit', tageBis(morgen) === 1)
}

// 3b) parseDatum baut das Datum aus Jahr/Monat/Tag zusammen statt per
// new Date(stringISO) – das verschiebt in UTC-negativen Zeitzonen sonst den Tag
{
  const d = parseDatum('2026-01-15')
  check(
    'parseDatum liefert exakt den 15.01.2026 lokal (keine UTC-Verschiebung)',
    d.getFullYear() === 2026 && d.getMonth() === 0 && d.getDate() === 15
  )
}

// 3c) heuteISO() entspricht genau dem lokalen "heute"-Offset
{
  check('heuteISO() === isoOffset(0)', heuteISO() === isoOffset(0))
}

console.log('── utils/kosten.js ──')

// 4) 3-Personen-Teilaufteilung mit ungerade teilbaren Beträgen – die
// Saldo-Summe muss exakt auf 0.00 abgerundet werden (Restcent-Ausgleich)
{
  const teilnehmer = [{ id: 1, name: 'Anna' }, { id: 2, name: 'Ben' }, { id: 3, name: 'Clara' }]
  const ausgaben = [
    // 10.00€ zwischen Anna und Ben aufgeteilt (nicht alle drei) → 5.00 je Person
    { bezahlt_von_id: 1, betrag: 10.00, fuer_ids: [1, 2] },
    // 10.01€ zwischen allen drei aufgeteilt → 3.336...€ je Person, muss gerundet werden
    { bezahlt_von_id: 2, betrag: 10.01, fuer_ids: [1, 2, 3] },
    // 7.00€ nur für Clara allein (fuer_ids mit einem einzigen Eintrag)
    { bezahlt_von_id: 3, betrag: 7.00, fuer_ids: [3] },
  ]
  const salden = saldenBerechnen(teilnehmer, ausgaben, [])
  const summe = Math.round(salden.reduce((sum, s) => sum + s.saldo, 0) * 100) / 100
  check('Saldo-Summe bei ungleicher 3-Personen-Teilaufteilung ergibt exakt 0.00', summe === 0)

  const schulden = schuldenBerechnen(teilnehmer, ausgaben, [])
  const schuldenSumme = schulden.reduce((sum, s) => sum + parseFloat(s.betrag), 0)
  const glaeubigerSumme = salden.filter(s => s.saldo > 0).reduce((sum, s) => sum + s.saldo, 0)
  check(
    'Summe der berechneten Schulden entspricht der Summe aller positiven Salden',
    Math.abs(schuldenSumme - glaeubigerSumme) < 0.01
  )
}

// 4b) Leeres/fehlendes fuer_ids heißt "für alle" – Anteil wird durch alleIds geteilt
{
  const ausgabe = { betrag: 30, fuer_ids: null }
  const alleIds = [1, 2, 3]
  check('anteilBerechnen ohne fuer_ids teilt gleichmäßig durch alle Teilnehmer', anteilBerechnen(ausgabe, 1, alleIds) === 10)
}

// 4c) Teilnehmer außerhalb von fuer_ids bekommt Anteil 0
{
  const ausgabe = { betrag: 30, fuer_ids: [1, 2] }
  check('anteilBerechnen für nicht beteiligten Teilnehmer ist 0', anteilBerechnen(ausgabe, 3, [1, 2, 3]) === 0)
}

// 5) Fremdwährungs-Ausgabe: saldenBerechnen arbeitet ausschließlich mit
// betrag (bereits in Trip-Währung umgerechnet), nicht mit betrag_original –
// sonst würde eine in USD erfasste Ausgabe falsch in die Salden einfließen
{
  const teilnehmer = [{ id: 1, name: 'Anna' }, { id: 2, name: 'Ben' }]
  const ausgaben = [
    // 90 USD wurden zu 100 EUR (Trip-Währung) umgerechnet – betrag ist die
    // massgebliche Zahl für die Kostenaufteilung, betrag_original nur Anzeige
    { bezahlt_von_id: 1, betrag: 100, betrag_original: 90, waehrung_original: 'USD', fuer_ids: [1, 2] },
  ]
  const salden = saldenBerechnen(teilnehmer, ausgaben, [])
  const anna = salden.find(s => s.id === 1)
  const ben = salden.find(s => s.id === 2)
  check('Fremdwährungs-Ausgabe: Saldo basiert auf betrag (100), nicht betrag_original (90)', anna.saldo === 50 && ben.saldo === -50)
}

console.log('')
if (fehlgeschlagen > 0) {
  console.log(`${fehlgeschlagen} Check(s) fehlgeschlagen.`)
  process.exit(1)
} else {
  console.log('Alle Checks erfolgreich.')
  process.exit(0)
}
