import laender from '../data/laender'

// Lokalisierten Ländernamen ermitteln – Intl.DisplayNames liefert native Namen
// für die aktuelle Sprache; Fallback auf die statische (nur deutsche) Liste in
// laender.js, falls der Browser den Code nicht kennt oder Intl.DisplayNames
// fehlt (W11)
export function laenderName(code, sprache) {
  if (!code) return ''
  try {
    const anzeige = new Intl.DisplayNames([sprache], { type: 'region' })
    const name = anzeige.of(code)
    if (name && name !== code) return name
  } catch {
    // Intl.DisplayNames im Browser nicht verfügbar – auf statische Liste zurückfallen
  }
  return laender.find(l => l.code === code)?.name || code
}

// Länderliste mit dem in der aktuellen Sprache angezeigten Namen, alphabetisch
// danach sortiert (W11) – für Auswahllisten/Suchen
export function laenderSortiert(sprache) {
  return laender
    .map(l => ({ ...l, anzeigeName: laenderName(l.code, sprache) }))
    .sort((a, b) => a.anzeigeName.localeCompare(b.anzeigeName, sprache))
}
