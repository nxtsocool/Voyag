// Reine Funktionen für Salden- und Schuldenberechnung – arbeiten ausschließlich
// mit Teilnehmer-IDs (bezahlt_von_id, fuer_ids, von_id, an_id), nicht mit Namen,
// damit Umbenennungen und Namensgleichheit die Kostenaufteilung nicht verfälschen.

// Anteil eines Teilnehmers an einer Ausgabe – leeres/fehlendes fuer_ids heißt "für alle"
function anteilBerechnen(ausgabe, teilnehmerId, alleIds) {
  const betroffene = ausgabe.fuer_ids && ausgabe.fuer_ids.length > 0 ? ausgabe.fuer_ids : alleIds
  if (!betroffene.includes(teilnehmerId)) return 0
  return ausgabe.betrag / betroffene.length
}

// Saldo jedes Teilnehmers (positiv = bekommt Geld zurück, negativ = schuldet Geld).
// Rundung auf Cent; der Restcent aus der Rundung wandert zum größten Gläubiger
// (bzw. zum am wenigsten verschuldeten Teilnehmer), damit die Summe exakt 0 ergibt.
export function saldenBerechnen(teilnehmer, ausgaben, abrechnungen) {
  const alleIds = teilnehmer.map(p => p.id)

  const rohSalden = teilnehmer.map(person => {
    const bezahlt = ausgaben
      .filter(a => a.bezahlt_von_id === person.id)
      .reduce((sum, a) => sum + a.betrag, 0)
    const anteil = ausgaben.reduce((sum, a) => sum + anteilBerechnen(a, person.id, alleIds), 0)
    const bereitsAbgerechnetAls = abrechnungen
      .filter(ab => ab.von_id === person.id)
      .reduce((sum, ab) => sum + ab.betrag, 0)
    const bereitsErhaltenAls = abrechnungen
      .filter(ab => ab.an_id === person.id)
      .reduce((sum, ab) => sum + ab.betrag, 0)

    return {
      id: person.id,
      name: person.name,
      saldo: (bezahlt - anteil) + bereitsAbgerechnetAls - bereitsErhaltenAls,
    }
  })

  const gerundet = rohSalden.map(s => ({ ...s, saldo: Math.round(s.saldo * 100) / 100 }))
  const restCent = Math.round(gerundet.reduce((sum, s) => sum + s.saldo, 0) * 100)
  if (restCent !== 0 && gerundet.length > 0) {
    const groessterGlaeubiger = gerundet.reduce((max, s) => (s.saldo > max.saldo ? s : max), gerundet[0])
    groessterGlaeubiger.saldo = Math.round((groessterGlaeubiger.saldo - restCent / 100) * 100) / 100
  }

  return gerundet
}

// Wer schuldet wem was, ausgehend von den Salden – teilt jeden Schuldner
// nacheinander auf die offenen Gläubiger auf
export function schuldenBerechnen(teilnehmer, ausgaben, abrechnungen) {
  const salden = saldenBerechnen(teilnehmer, ausgaben, abrechnungen)
  const schulden = []

  const schuldner = salden.filter(s => s.saldo < -0.01).map(s => ({ ...s, offen: Math.abs(s.saldo) }))
  const glaeubiger = salden.filter(s => s.saldo > 0.01).map(s => ({ ...s, offen: s.saldo }))

  for (const schuldnerPerson of schuldner) {
    let nochOffen = schuldnerPerson.offen

    for (const glaeubigerPerson of glaeubiger) {
      if (nochOffen <= 0.01) break
      if (glaeubigerPerson.offen <= 0.01) continue

      const betrag = Math.min(nochOffen, glaeubigerPerson.offen)

      schulden.push({
        vonId: schuldnerPerson.id,
        von: schuldnerPerson.name,
        anId: glaeubigerPerson.id,
        an: glaeubigerPerson.name,
        betrag: betrag.toFixed(2),
      })

      nochOffen -= betrag
      glaeubigerPerson.offen -= betrag
    }
  }

  return schulden
}
