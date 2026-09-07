// Ermittelt, welcher unverknüpfte Teilnehmer beim Beitreten einer Reise als
// Vorauswahl im Verknüpfungs-Modal markiert werden soll: bei eindeutigem
// Namens-Match (getrimmt, case-insensitive) dieser; gibt es keinen Match,
// aber insgesamt nur einen einzigen unverknüpften Teilnehmer, auch diesen
// – spart einen Klick, ohne bei mehreren Kandidaten zu raten.
export function findeVorauswahl(unverknuepfte, eigenerName) {
  const nameNormalisiert = eigenerName?.trim().toLowerCase()
  const namensTreffer = nameNormalisiert
    ? unverknuepfte.filter(p => p.name?.trim().toLowerCase() === nameNormalisiert)
    : []

  return namensTreffer.length === 1
    ? namensTreffer[0]
    : (unverknuepfte.length === 1 ? unverknuepfte[0] : null)
}
