import { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import TripsOverview from './screens/TripsOverview'
import LoginScreen from './screens/LoginScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import BottomNav from './components/BottomNav'
import OfflineBanner from './components/OfflineBanner'
import { SettingsProvider, useSettings } from './context/SettingsContext'
import useToast from './hooks/useToast.jsx'
import Toast from './components/Toast'
import useBodyScrollLock from './hooks/useBodyScrollLock'
import { einladungSpeichern, einladungLesen } from './utils/einladung'

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

// Leitet nach dem Login/Onboarding automatisch zu einem gemerkten Einladungslink weiter
function PendingInviteRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    const code = einladungLesen()
    if (code) navigate(`/join/${code}`, { replace: true })
  }, [navigate])
  return null
}

// Bottom-Sheet "Neues Passwort festlegen" – erscheint app-weit, wenn Supabase
// nach einem Klick auf den Passwort-Reset-Link das Event PASSWORD_RECOVERY
// feuert (K13). Rendert innerhalb von SettingsProvider, damit t()/Toast nutzbar sind.
function PasswortRecoverySheet({ offen, onFertig }) {
  const { t } = useSettings()
  const { toasts, setToasts, toast } = useToast()
  const [neuesPasswort, setNeuesPasswort] = useState('')
  const [bestaetigung, setBestaetigung] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState('')
  useBodyScrollLock(offen)

  if (!offen) return null

  const speichern = async () => {
    if (laeuft) return
    setFehler('')
    if (!neuesPasswort || neuesPasswort.length < 8) { setFehler(t('passwortMindestens8Zeichen')); return }
    if (neuesPasswort !== bestaetigung) { setFehler(t('passwortNichtUebereinstimmend')); return }

    setLaeuft(true)
    const { error } = await supabase.auth.updateUser({ password: neuesPasswort })
    setLaeuft(false)

    if (error) { setFehler(error.message); return }
    setNeuesPasswort('')
    setBestaetigung('')
    toast(t('passwortGeaendert'), 'success')
    onFertig()
  }

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 9998,
      }}>
        <div className="fade-in" style={{
          backgroundColor: 'var(--card)', borderRadius: '24px 24px 0 0',
          width: '100%', maxWidth: '600px',
          maxHeight: 'calc(100dvh - env(safe-area-inset-top) - 24px)', overflowY: 'auto', overflowX: 'hidden',
          boxSizing: 'border-box',
          padding: '24px 20px calc(32px + env(safe-area-inset-bottom))',
          zIndex: 9999,
        }}>
          <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--sub)', borderRadius: '2px', margin: '0 auto 24px' }} />
          <h3 style={{ margin: '0 0 8px', fontWeight: '700', fontSize: '1.2rem' }}>{t('neuesPasswortTitel')}</h3>
          <p style={{ color: 'var(--text-sub)', margin: '0 0 20px', fontSize: '0.9rem', lineHeight: 1.5 }}>
            {t('neuesPasswortText')}
          </p>

          {fehler && (
            <div style={{
              backgroundColor: 'rgba(233,69,96,0.12)', border: '1px solid rgba(233,69,96,0.3)',
              borderRadius: '12px', padding: '10px 14px', marginBottom: '14px',
            }}>
              <p style={{ color: '#e94560', margin: 0, fontSize: '0.85rem' }}>{fehler}</p>
            </div>
          )}

          <input
            type="password" autoComplete="new-password"
            placeholder={t('neuesPasswortPlatzhalter')}
            value={neuesPasswort}
            onChange={(e) => setNeuesPasswort(e.target.value)}
            style={recoveryInputStyle}
          />
          <input
            type="password" autoComplete="new-password"
            placeholder={t('passwortBestaetigenPlatzhalter')}
            value={bestaetigung}
            onChange={(e) => setBestaetigung(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && speichern()}
            style={recoveryInputStyle}
          />

          <button onClick={speichern} disabled={laeuft} className="btn-press" style={{
            backgroundColor: 'var(--gold)', color: '#0a0f1e', border: 'none',
            padding: '14px', minHeight: '48px', boxSizing: 'border-box', borderRadius: '14px',
            cursor: 'pointer', width: '100%', fontWeight: '700', fontSize: '0.95rem',
            opacity: laeuft ? 0.6 : 1, marginTop: '4px',
          }}>
            {laeuft ? t('wirdGespeichert') : t('speichern')}
          </button>
        </div>
      </div>
      <Toast toasts={toasts} setToasts={setToasts} />
    </>
  )
}

const recoveryInputStyle = {
  width: '100%', padding: '13px 14px', backgroundColor: 'var(--input-bg)',
  border: '1px solid var(--input-border)', borderRadius: '12px',
  color: 'var(--text)', fontSize: '16px', marginBottom: '10px', boxSizing: 'border-box',
}

function App() {
  const [user, setUser] = useState(null)
  const [laden, setLaden] = useState(true)
  const [emailNichtBestaetigt, setEmailNichtBestaetigt] = useState(false)
  const [onboardingNoetig, setOnboardingNoetig] = useState(false)
  // Passwort-Reset (K13): Supabase feuert PASSWORD_RECOVERY, wenn der Nutzer
  // über den Link aus der Reset-Email in der App landet
  const [passwortRecoveryOffen, setPasswortRecoveryOffen] = useState(false)

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
      if (event === 'PASSWORD_RECOVERY') setPasswortRecoveryOffen(true)
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
      einladungSpeichern(match[1])
      window.history.replaceState(null, '', '/')
    }
  }, [laden, user])

  if (laden) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg)' }}>
      <div className="skeleton" style={{ width: '120px', height: '28px', borderRadius: '10px' }} />
    </div>
  )

  return (
    <SettingsProvider>
      <OfflineBanner />
      <PasswortRecoverySheet offen={passwortRecoveryOffen} onFertig={() => setPasswortRecoveryOffen(false)} />
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
