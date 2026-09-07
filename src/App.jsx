import { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import TripsOverview from './screens/TripsOverview'
import LoginScreen from './screens/LoginScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import BottomNav from './components/BottomNav'
import OfflineBanner from './components/OfflineBanner'
import { SettingsProvider } from './context/SettingsContext'

// Direkt beim Start benötigte Screens (Login/Onboarding/Übersicht) bleiben eager
// importiert; alle anderen Screens erst per Code-Splitting laden, sobald die
// jeweilige Route besucht wird – reduziert den initialen JS-Chunk deutlich,
// v.a. wegen MapScreen (D3 + topojson)
const MapScreen = lazy(() => import('./screens/MapScreen'))
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'))
const TripHome = lazy(() => import('./screens/TripHome'))
const TripInfo = lazy(() => import('./screens/TripInfo'))
const TripPersonen = lazy(() => import('./screens/TripPersonen'))
const TripPackliste = lazy(() => import('./screens/TripPackliste'))
const TripKosten = lazy(() => import('./screens/TripKosten'))
const TripOrte = lazy(() => import('./screens/TripOrte'))
const JoinScreen = lazy(() => import('./screens/JoinScreen'))

// Key unter dem ein Einladungscode zwischengespeichert wird, wenn ein
// nicht eingeloggter Nutzer über einen /join/:code Link in die App kommt
export const PENDING_INVITE_KEY = 'voyag_pending_invite'

// Leitet nach dem Login/Onboarding automatisch zu einem gemerkten Einladungslink weiter
function PendingInviteRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    const code = sessionStorage.getItem(PENDING_INVITE_KEY)
    if (code) navigate(`/join/${code}`, { replace: true })
  }, [navigate])
  return null
}

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

  // Solange nicht eingeloggt: einen /join/:code Link merken und die URL bereinigen,
  // da ohne aktive Session noch kein Router gemountet ist (siehe unten)
  useEffect(() => {
    if (laden || user) return
    const match = window.location.pathname.match(/^\/join\/([^/]+)/)
    if (match) {
      sessionStorage.setItem(PENDING_INVITE_KEY, match[1])
      window.history.replaceState(null, '', '/')
    }
  }, [laden, user])

  if (laden) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#080d1a' }}>
      <div className="skeleton" style={{ width: '120px', height: '28px', borderRadius: '10px' }} />
    </div>
  )

  return (
    <SettingsProvider>
      <OfflineBanner />
      {!user ? (
        <LoginScreen emailNichtBestaetigt={emailNichtBestaetigt} />
      ) : onboardingNoetig ? (
        <OnboardingScreen user={user} onComplete={() => setOnboardingNoetig(false)} />
      ) : (
        <BrowserRouter>
          <PendingInviteRedirect />
          <Suspense fallback={
            <div style={{ minHeight: '100vh', padding: '24px', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>
              <div className="skeleton" style={{ height: '200px', borderRadius: '24px' }} />
            </div>
          }>
            <Routes>
              <Route path="/" element={<><TripsOverview /><BottomNav /></>} />
              <Route path="/map" element={<><MapScreen /><BottomNav /></>} />
              <Route path="/settings" element={<><SettingsScreen /><BottomNav /></>} />
              <Route path="/trip/:id" element={<TripHome />} />
              <Route path="/trip/:id/info" element={<TripInfo />} />
              <Route path="/trip/:id/personen" element={<TripPersonen />} />
              <Route path="/trip/:id/packliste" element={<TripPackliste />} />
              <Route path="/trip/:id/kosten" element={<TripKosten />} />
              <Route path="/trip/:id/orte" element={<TripOrte />} />
              <Route path="/join/:code" element={<JoinScreen />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      )}
    </SettingsProvider>
  )
}

export default App