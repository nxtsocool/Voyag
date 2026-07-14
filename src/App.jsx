import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './supabase'
import TripsOverview from './screens/TripsOverview'
import MapScreen from './screens/MapScreen'
import SettingsScreen from './screens/SettingsScreen'
import LoginScreen from './screens/LoginScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import BottomNav from './components/BottomNav'
import TripHome from './screens/TripHome'
import TripInfo from './screens/TripInfo'
import TripPersonen from './screens/TripPersonen'
import TripPackliste from './screens/TripPackliste'
import TripKosten from './screens/TripKosten'
import TripFotos from './screens/TripFotos'
import TripOrte from './screens/TripOrte'
import { SettingsProvider } from './context/SettingsContext'


function App() {
  const [user, setUser] = useState(null)
  const [laden, setLaden] = useState(true)
  const [emailNichtBestaetigt, setEmailNichtBestaetigt] = useState(false)
  const [onboardingNoetig, setOnboardingNoetig] = useState(false)

  useEffect(() => {
    const benutzerVerarbeiten = async (event, session) => {
      const currentUser = session?.user ?? null

      // Email noch nicht bestätigt → ausloggen und Hinweis merken
      if (currentUser && !currentUser.email_confirmed_at) {
        await supabase.auth.signOut()
        setEmailNichtBestaetigt(true)
        setUser(null)
        setLaden(false)
        return
      }

      setEmailNichtBestaetigt(false)

      if (currentUser) {
        // Profil laden und Onboarding-Status prüfen
        const { data: profil } = await supabase
          .from('profiles')
          .select('id, onboarding_done')
          .eq('id', currentUser.id)
          .maybeSingle()

        if (!profil) {
          // Kein Profil vorhanden → mit Namen aus user_metadata anlegen, Onboarding starten
          const metaName = currentUser.user_metadata?.name || ''
          await supabase.from('profiles').insert([{
            id: currentUser.id,
            email: currentUser.email,
            name: metaName,
            bio: '',
            onboarding_done: false,
          }])
          setOnboardingNoetig(true)
        } else {
          setOnboardingNoetig(!profil.onboarding_done)
        }
      } else {
        setOnboardingNoetig(false)
      }

      setUser(currentUser)
      setLaden(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      benutzerVerarbeiten('INITIAL', session).finally(() => setLaden(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      benutzerVerarbeiten(event, session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (laden) return <p style={{ color: '#fff', padding: '20px' }}>Lädt...</p>

  return (
    <SettingsProvider>
      {!user ? (
        <LoginScreen emailNichtBestaetigt={emailNichtBestaetigt} />
      ) : onboardingNoetig ? (
        <OnboardingScreen user={user} onComplete={() => setOnboardingNoetig(false)} />
      ) : (
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<><TripsOverview /><BottomNav /></>} />
            <Route path="/map" element={<><MapScreen /><BottomNav /></>} />
            <Route path="/settings" element={<><SettingsScreen /><BottomNav /></>} />
            <Route path="/trip/:id" element={<TripHome />} />
            <Route path="/trip/:id/info" element={<TripInfo />} />
            <Route path="/trip/:id/personen" element={<TripPersonen />} />
            <Route path="/trip/:id/packliste" element={<TripPackliste />} />
            <Route path="/trip/:id/kosten" element={<TripKosten />} />
            <Route path="/trip/:id/fotos" element={<TripFotos />} />
            <Route path="/trip/:id/orte" element={<TripOrte />} />
          </Routes>
        </BrowserRouter>
      )}
    </SettingsProvider>
  )
}

export default App