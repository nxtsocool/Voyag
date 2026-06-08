import { useState } from 'react'
import { supabase } from '../supabase'

function LoginScreen() {
  // State für Eingabefelder
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')

  // Wechselt zwischen Login und Registrieren
  const [isRegistrieren, setIsRegistrieren] = useState(false)

  // Ladeindikator und Fehlermeldung
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')

  // Login oder Registrieren je nach Modus
  const handleSubmit = async () => {
    setLaden(true)
    setFehler('')

    if (isRegistrieren) {
      // Neuen Account erstellen
      const { error } = await supabase.auth.signUp({ email, password: passwort })
      if (error) setFehler(error.message)
    } else {
      // Bestehenden Account einloggen
      const { error } = await supabase.auth.signInWithPassword({ email, password: passwort })
      if (error) setFehler('Email oder Passwort falsch')
    }
    setLaden(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#0a0f1e', // gleicher Hintergrund wie Overview
    }}>
      <div style={{
        backgroundColor: '#111827', borderRadius: '20px',
        border: '1px solid #c9a84c',
        padding: 'clamp(24px, 7vw, 40px)', width: '100%', maxWidth: '400px',
        margin: '0 16px', boxSizing: 'border-box',
      }}>

        {/* Logo */}
        <h1 style={{
          fontSize: '2rem', marginBottom: '5px',
          textAlign: 'center', fontWeight: '700', letterSpacing: '-0.5px',
        }}>
          Voy<span style={{ color: '#c9a84c' }}>ag</span>
        </h1>

        {/* Untertitel je nach Modus */}
        <p style={{ color: '#8892a4', textAlign: 'center', marginBottom: '30px' }}>
          {isRegistrieren ? 'Neuen Account erstellen' : 'Willkommen zurück!'}
        </p>

        {/* Fehlermeldung falls Login/Registrieren fehlschlägt */}
        {fehler && (
          <p style={{ color: '#e94560', marginBottom: '15px', fontSize: '0.9rem' }}>{fehler}</p>
        )}

        {/* Email Eingabe */}
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        {/* Passwort Eingabe – Enter löst Login aus */}
        <input
          placeholder="Passwort"
          type="password"
          value={passwort}
          onChange={(e) => setPasswort(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          style={inputStyle}
        />

        {/* Login / Registrieren Button */}
        <button onClick={handleSubmit} style={{
          backgroundColor: '#c9a84c', color: '#0a0f1e',
          border: 'none', padding: '15px', borderRadius: '12px',
          fontSize: '1rem', fontWeight: '600',
          cursor: 'pointer', width: '100%', marginBottom: '15px',
          opacity: laden ? 0.7 : 1, // Button wird transparent wenn lädt
        }}>
          {laden ? 'Lädt...' : isRegistrieren ? 'Registrieren' : 'Einloggen'}
        </button>

        {/* Zwischen Login und Registrieren wechseln */}
        <p
          onClick={() => setIsRegistrieren(!isRegistrieren)}
          style={{
            color: '#8892a4', textAlign: 'center', cursor: 'pointer', fontSize: '0.9rem',
            padding: '10px 0', margin: 0,
          }}
        >
          {isRegistrieren ? 'Schon einen Account? Einloggen' : 'Noch kein Account? Registrieren'}
        </p>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '12px',
  backgroundColor: '#1a2235',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', color: '#ffffff',
  fontSize: '1rem', marginBottom: '10px',
  boxSizing: 'border-box',
}

export default LoginScreen