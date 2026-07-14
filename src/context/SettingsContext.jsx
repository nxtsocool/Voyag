import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { translations } from '../data/translations'

const SettingsContext = createContext()

export function useSettings() {
  return useContext(SettingsContext)
}

export function SettingsProvider({ children }) {
  const [waehrung, setWaehrung] = useState('€')
  const [sprache, setSprache] = useState('de')
  const [design, setDesign] = useState('light')
  const [geladen, setGeladen] = useState(false)

  // Profil-Einstellungen (inkl. Sprache) aus Supabase laden
  const profilLaden = async (userId) => {
    const { data } = await supabase
      .from('profiles').select('waehrung, sprache, design').eq('id', userId).single()

    if (data) {
      setWaehrung(data.waehrung || '€')
      setSprache(data.sprache || 'de')
      setDesign(data.design || 'light')
    }
  }

  // Theme sofort auf das <html>-Element anwenden – kein Seiten-Reload nötig
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', design)
  }, [design])

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
    <SettingsContext.Provider value={{ waehrung, setWaehrung, sprache, setSprache, design, setDesign, geladen, t }}>
      {children}
    </SettingsContext.Provider>
  )
}