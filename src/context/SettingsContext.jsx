import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { translations } from '../data/translations'
import { WAEHRUNGEN, symbolOderIsoZuIso } from '../data/waehrungen'

const SettingsContext = createContext()

export function useSettings() {
  return useContext(SettingsContext)
}

export function SettingsProvider({ children }) {
  // waehrungISO ist der kanonische, gespeicherte Wert (K1); waehrung bleibt das
  // daraus abgeleitete Symbol, damit bestehende Anzeige-Stellen (`${betrag}${waehrung}`)
  // unveraendert weiterfunktionieren
  const [waehrungISO, setWaehrungISO] = useState('EUR')
  const waehrung = WAEHRUNGEN.find(w => w.iso === waehrungISO)?.symbol || '€'
  const [sprache, setSprache] = useState('de')
  const [design, setDesign] = useState('light')
  const [geladen, setGeladen] = useState(false)

  // setWaehrung erwartet ab jetzt einen ISO-Code
  const setWaehrung = (iso) => setWaehrungISO(symbolOderIsoZuIso(iso))

  // Profil-Einstellungen (inkl. Sprache) aus Supabase laden
  const profilLaden = async (userId) => {
    const { data } = await supabase
      .from('profiles').select('waehrung, sprache, design').eq('id', userId).single()

    if (data) {
      // Alte Bestandsdaten hatten ein Symbol statt eines ISO-Codes gespeichert
      setWaehrungISO(symbolOderIsoZuIso(data.waehrung))
      setSprache(data.sprache || 'de')
      setDesign(data.design || 'light')
    }
  }

  // Theme sofort auf das <html>-Element anwenden – kein Seiten-Reload nötig
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', design)
  }, [design])

  // lang-Attribut passend zur Sprache setzen – wichtig für hyphens:'auto'
  // (korrekte Trennregeln) und Screenreader (W7/W11)
  useEffect(() => {
    document.documentElement.setAttribute('lang', sprache)
  }, [sprache])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await profilLaden(user.id)
      setGeladen(true)
    }
    init()

    // Nach Login/Registrierung: gespeicherte Profil-Sprache überschreibt die
    // lokale Auswahl, die der User eventuell schon auf dem LoginScreen getroffen hat
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) profilLaden(session.user.id)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Übersetzungsfunktion – t('speichern') gibt 'Save' oder 'Speichern' zurück.
  // Manche Einträge sind Funktionen statt Strings (z.B. für Pluralformen mit Zahlen),
  // in diesem Fall gibt t(key) die Funktion zurück, die dann mit den Werten aufgerufen wird: t('key')(n)
  const t = (key) => {
    return translations[sprache]?.[key] || translations.de[key] || key
  }

  return (
    <SettingsContext.Provider value={{ waehrung, waehrungISO, setWaehrung, sprache, setSprache, design, setDesign, geladen, t }}>
      {children}
    </SettingsContext.Provider>
  )
}