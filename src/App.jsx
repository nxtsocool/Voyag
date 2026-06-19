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

function App() {
  const [user, setUser] = useState(null)
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLaden(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (laden) return <p style={{ color: '#fff', padding: '20px' }}>Lädt...</p>
  if (!user) return <LoginScreen />

  return (
    <BrowserRouter>
      {/* BottomNav nur auf Hauptscreens anzeigen */}
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
      </Routes>
    </BrowserRouter>
  )
}

export default App