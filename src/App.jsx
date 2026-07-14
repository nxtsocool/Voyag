import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './supabase'
import TripsOverview from './screens/TripsOverview'
import MapScreen from './screens/MapScreen'
import SettingsScreen from './screens/SettingsScreen'
import LoginScreen from './screens/LoginScreen'
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

  useEffect(() => {
    const benutzerVerarbeiten = async (event, session) => {
      const currentUser = session?.user ?? null

      // Email noch nicht bestätigt
      if (currentUser && !currentUser.email_confirmed_at) {
        await supabase.auth.signOut()
        setEmailNichtBestaetigt(true) // ← merken dass wir auf Bestätigung warten
        setUser(null)
        setLaden(false)
        return
      }

      // Email bestätigt oder kein User
      setEmailNichtBestaetigt(false)

      if (event === 'SIGNED_IN' && currentUser) {
        const { data: profil } = await supabase
          .from('profiles').select('id').eq('id', currentUser.id).maybeSingle()

        if (!profil) {
          await supabase.from('profiles').insert([{
            id: currentUser.id,
            email: currentUser.email,
            name: '',
            bio: '',
          }])
        }
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