// Zentrale Datums-Hilfsfunktionen für die ganze App.
//
// Wichtig: `new Date('YYYY-MM-DD')` interpretiert den String als UTC-Mitternacht,
// nicht als lokale Zeit – das verschiebt das Datum je nach Zeitzone um einen Tag
// (die "UTC-Falle"). Alle Funktionen hier bauen Date-Objekte deshalb explizit aus
// Jahr/Monat/Tag zusammen (`new Date(jahr, monat - 1, tag)`), was immer lokal ist.

// Parst ein ISO-Datum "YYYY-MM-DD" (z. B. aus <input type="date"> oder
// start_datum/end_datum) als lokales Datum
export function parseDatum(iso) {
  if (!iso) return null
  const [jahr, monat, tag] = iso.split('-').map(Number)
  if (!jahr || !monat || !tag) return null
  return new Date(jahr, monat - 1, tag)
}

// Parst das alte Textformat "DD.MM.YYYY" als lokales Datum
function parseDatumDE(text) {
  if (!text) return null
  const [tag, monat, jahr] = text.trim().split('.').map(Number)
  if (!tag || !monat || !jahr) return null
  return new Date(jahr, monat - 1, tag)
}

// Liest Start-/Enddatum einer Reise: bevorzugt die echten Datumsfelder
// start_datum/end_datum, fällt sonst auf das alte Textfeld "datum"
// (Format "DD.MM.YYYY - DD.MM.YYYY") zurück
export function reiseZeitraum(trip) {
  if (!trip) return { start: null, ende: null }

  let start = trip.start_datum ? parseDatum(trip.start_datum) : null
  let ende = trip.end_datum ? parseDatum(trip.end_datum) : null

  if ((!start || !ende) && trip.datum) {
    const [startText, endeText] = trip.datum.split(' - ')
    if (!start) start = parseDatumDE(startText)
    if (!ende) ende = parseDatumDE(endeText)
  }

  return { start, ende }
}

// 'kommend' | 'laufend' | 'vergangen' – Start zählt ab 00:00 lokal, Ende bis
// 23:59:59 lokal (der letzte Reisetag zählt noch als "laufend")
export function reiseStatus(trip) {
  const { start, ende } = reiseZeitraum(trip)
  if (!start || !ende) return 'kommend'

  const heute = new Date()
  const startTag = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0)
  const endeTag = new Date(ende.getFullYear(), ende.getMonth(), ende.getDate(), 23, 59, 59, 999)

  if (heute < startTag) return 'kommend'
  if (heute > endeTag) return 'vergangen'
  return 'laufend'
}

// Differenz in lokalen Kalendertagen (nicht in 24h-Blöcken – wichtig nahe
// Mitternacht/Zeitumstellung), positiv = liegt in der Zukunft
export function tageBis(datum) {
  if (!datum) return null
  const heute = new Date()
  const heuteTag = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate())
  const zielTag = new Date(datum.getFullYear(), datum.getMonth(), datum.getDate())
  return Math.round((zielTag - heuteTag) / (1000 * 60 * 60 * 24))
}

// Heutiges Datum als lokales "YYYY-MM-DD" (für <input type="date"> Defaults)
export function heuteISO() {
  const heute = new Date()
  const jahr = heute.getFullYear()
  const monat = String(heute.getMonth() + 1).padStart(2, '0')
  const tag = String(heute.getDate()).padStart(2, '0')
  return `${jahr}-${monat}-${tag}`
}

// Formatiert ein Date-Objekt sprachabhängig ausgeschrieben, z. B. "3. Oktober 2026"
export function formatDatum(date, sprache) {
  if (!date) return ''
  const locale = sprache === 'en' ? 'en-GB' : 'de-DE'
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}
