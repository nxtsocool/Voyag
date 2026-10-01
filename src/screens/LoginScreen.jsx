import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Mail, Lock, Eye, EyeOff, ChevronLeft, User } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'
import { einladungLesen } from '../utils/einladung'

// Passwort-Stärke berechnen: schwach / mittel / stark
const passwortStaerkeBerechnen = (pw) => {
  if (!pw) return null
  if (pw.length < 6) return 'schwach'
  if (pw.length > 10 || /[^a-zA-Z0-9]/.test(pw)) return 'stark'
  return 'mittel'
}

// Bekannte Supabase-Auth-Fehlermeldungen auf übersetzte Texte abbilden (W13) –
// unbekannte Meldungen bekommen einen generischen Fallback statt des rohen Englisch-Texts
const authFehlerUebersetzen = (message, t) => {
  if (!message) return t('authFehlerAllgemein')
  if (message.includes('already registered')) return t('authFehlerBereitsRegistriert')
  if (message.includes('Password should be at least')) return t('authFehlerPasswortZuKurz')
  if (message.includes('rate limit')) return t('authFehlerRateLimit')
  if (message.includes('Invalid login credentials')) return t('loginFehlerFalsch')
  return t('authFehlerAllgemein')
}

function LoginScreen({ emailNichtBestaetigt }) {
  const { t, sprache, setSprache } = useSettings()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [passwort, setPasswort] = useState('')
  const [passwortBestaetigung, setPasswortBestaetigung] = useState('')
  const [isRegistrieren, setIsRegistrieren] = useState(false)
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')
  const [passwortSichtbar, setPasswortSichtbar] = useState(false)
  const [registrierungErfolgreich, setRegistrierungErfolgreich] = useState(false)
  const [registrierteEmail, setRegistrierteEmail] = useState('')
  // Passwort vergessen (K13)
  const [passwortVergessenOffen, setPasswortVergessenOffen] = useState(false)
  const [passwortResetLaeuft, setPasswortResetLaeuft] = useState(false)
  const [passwortResetGesendet, setPasswortResetGesendet] = useState(false)
  // Einladung überlebt Registrierung (K14) – Hinweisbanner, wenn ein Code gemerkt ist.
  // Reiner synchroner Storage-Read braucht keinen Effect, daher als lazy useState-Initializer
  const [eingeladenerCode] = useState(() => einladungLesen())
  const [eingeladenReiseName, setEingeladenReiseName] = useState(null)

  useEffect(() => {
    if (!eingeladenerCode) return
    // Öffentliche Abfrage per invite_code – falls RLS das nicht erlaubt, bleibt
    // eingeladenReiseName null und es wird nur der generische Hinweistext gezeigt
    supabase.from('trips').select('name').eq('invite_code', eingeladenerCode.toUpperCase()).maybeSingle()
      .then(({ data }) => { if (data?.name) setEingeladenReiseName(data.name) })
      .catch(() => {})
  }, [eingeladenerCode])

  const staerke = passwortStaerkeBerechnen(passwort)

  // Pflichtfeld-Hinweis (W3) – Button bleibt deaktiviert, bis alles ausgefüllt ist
  const pflichtfelderFehlen = isRegistrieren
    ? (!email.trim() || !name.trim() || !passwort || !passwortBestaetigung)
    : (!email.trim() || !passwort)

  // Fehlermeldung anzeigen wenn App.jsx meldet dass Email nicht bestätigt ist
  useEffect(() => {
    if (emailNichtBestaetigt) setFehler(t('emailNichtBestaetigt'))
  }, [emailNichtBestaetigt])

  const handleSubmit = async () => {
    if (laden) return
    setFehler('')

    if (isRegistrieren) {
      if (!name.trim()) { setFehler(t('nameErforderlich')); return }
      if (passwort !== passwortBestaetigung) { setFehler(t('passwortNichtUebereinstimmend')); return }
      setLaden(true)
      // Name in user_metadata speichern – kein aktiver Session nach signUp (Email-Bestätigung
      // ausstehend), daher kein direkter profiles-upsert möglich. App.jsx liest den Namen
      // nach dem ersten Login aus currentUser.user_metadata.name.
      // Ist ein Einladungscode gemerkt (K14), landet der Bestätigungslink direkt auf
      // /join/:code statt auf der Startseite, damit die Einladung nicht verloren geht.
      const { error } = await supabase.auth.signUp({
        email,
        password: passwort,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: eingeladenerCode
            ? `${window.location.origin}/join/${eingeladenerCode}`
            : window.location.origin,
        },
      })
      if (error) {
        setFehler(authFehlerUebersetzen(error.message, t))
      } else {
        setRegistrierteEmail(email)
        setRegistrierungErfolgreich(true)
      }
      setLaden(false)
    } else {
      setLaden(true)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: passwort })
      if (error) {
        setFehler(t('loginFehlerFalsch'))
      } else if (data.user && !data.user.email_confirmed_at) {
        // Email noch nicht bestätigt → ausloggen und Hinweis zeigen
        await supabase.auth.signOut()
        setFehler(t('emailNichtBestaetigt'))
      }
      setLaden(false)
    }
  }

  // Link zum Passwort-Reset per Email anfordern (K13)
  const passwortVergessenSenden = async () => {
    if (passwortResetLaeuft) return
    if (!email) { setFehler(t('emailErforderlich')); return }
    setFehler('')
    setPasswortResetLaeuft(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setPasswortResetLaeuft(false)
    if (error) setFehler(authFehlerUebersetzen(error.message, t))
    else setPasswortResetGesendet(true)
  }

  // Formular zurücksetzen und zum Login wechseln
  const zurueckZumLogin = () => {
    setRegistrierungErfolgreich(false)
    setPasswortResetGesendet(false)
    setPasswortVergessenOffen(false)
    setIsRegistrieren(false)
    setEmail('')
    setName('')
    setPasswort('')
    setPasswortBestaetigung('')
    setFehler('')
  }

  // ── Bestätigungsseite nach angefordertem Passwort-Reset (K13) ──
  if (passwortResetGesendet) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg)',
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,168,76,0.14) 0%, transparent 70%)',
        padding: '20px', boxSizing: 'border-box',
      }}>
        <div className="fade-in" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', boxSizing: 'border-box' }}>
          <div style={{
            width: '96px', height: '96px', borderRadius: '50%',
            backgroundColor: 'rgba(201,168,76,0.12)',
            border: '2px solid rgba(201,168,76,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px',
          }}>
            <Mail size={40} color="var(--gold)" />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', margin: '0 0 16px', letterSpacing: '-0.5px' }}>
            {t('passwortResetGesendetTitel')}
          </h2>

          <p style={{ color: 'var(--text-sub)', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 36px' }}>
            {t('passwortResetGesendetText')(email)}
          </p>

          <button onClick={zurueckZumLogin} className="btn-press" style={{
            backgroundColor: 'var(--gold)', color: 'var(--bg)',
            border: 'none', padding: '16px 32px', borderRadius: '16px',
            fontSize: '1rem', fontWeight: '700', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 6px 24px rgba(201,168,76,0.35)',
          }}>
            <ChevronLeft size={18} />
            {t('zurueckZumLogin')}
          </button>
        </div>
      </div>
    )
  }

  // ── Bestätigungsseite nach erfolgreicher Registrierung ──
  if (registrierungErfolgreich) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg)',
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,168,76,0.14) 0%, transparent 70%)',
        padding: '20px', boxSizing: 'border-box',
      }}>
        <div className="fade-in" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', boxSizing: 'border-box' }}>
          {/* Briefumschlag-Icon in goldenem Kreis */}
          <div style={{
            width: '96px', height: '96px', borderRadius: '50%',
            backgroundColor: 'rgba(201,168,76,0.12)',
            border: '2px solid rgba(201,168,76,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px',
          }}>
            <Mail size={40} color="var(--gold)" />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', margin: '0 0 16px', letterSpacing: '-0.5px' }}>
            {t('emailBestaetigenTitel')}
          </h2>

          <p style={{ color: 'var(--text-sub)', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 36px' }}>
            {t('emailBestaetigenText')(registrierteEmail)}
          </p>

          <button onClick={zurueckZumLogin} className="btn-press" style={{
            backgroundColor: 'var(--gold)', color: 'var(--bg)',
            border: 'none', padding: '16px 32px', borderRadius: '16px',
            fontSize: '1rem', fontWeight: '700', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 6px 24px rgba(201,168,76,0.35)',
          }}>
            <ChevronLeft size={18} />
            {t('zurueckZumLogin')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Animations CSS */}
      <style>{`
        /* Kompass dreht sich einmal rein */
        @keyframes kompassDrehen {
          from { transform: rotate(-180deg) scale(0.5); opacity: 0; }
          to   { transform: rotate(0deg)    scale(1);   opacity: 1; }
        }

        /* "Voy" schreibt sich von links */
        @keyframes textSlideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        /* "ag" leuchtet auf */
        @keyframes goldGlow {
          0%   { opacity: 0; filter: brightness(3); }
          60%  { opacity: 1; filter: brightness(1.5); }
          100% { opacity: 1; filter: brightness(1); }
        }

        /* Inputs faden von unten rein */
        @keyframes inputFlyIn {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Tagline faded rein */
        @keyframes taglineFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .kompass-animation {
          animation: kompassDrehen 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
          display: inline-block;
        }

        .voy-animation {
          animation: textSlideIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both;
          display: inline-block;
        }

        .ag-animation {
          animation: goldGlow 0.8s ease 0.9s both;
          display: inline-block;
        }

        .tagline-animation {
          animation: taglineFade 0.6s ease 1.2s both;
        }

        .input-animation-1 {
          animation: inputFlyIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 1.3s both;
        }

        .input-animation-2 {
          animation: inputFlyIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 1.45s both;
        }

        .button-animation {
          animation: inputFlyIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 1.6s both;
        }

        .switch-animation {
          animation: inputFlyIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 1.7s both;
        }

        /* Kompass SVG Nadel pulst leicht */
        @keyframes nadelPuls {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.3); }
        }

        .nadel-puls {
          animation: nadelPuls 2.5s ease-in-out 1.8s infinite;
          transform-origin: 50% 50%;
        }

        /* Sprachwechsler – kurzer Fade/Scale Effekt bei jedem Wechsel */
        @keyframes spracheWechsel {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }

        .sprache-switch-wrap {
          animation: inputFlyIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
        }

        .sprache-pill {
          animation: spracheWechsel 0.25s ease;
        }
      `}</style>

      {/* Sprachwechsler – oben rechts, schon vor dem Login nutzbar */}
      <div className="sprache-switch-wrap" style={{
        position: 'fixed',
        top: 'calc(16px + env(safe-area-inset-top))',
        right: '16px',
        zIndex: 10,
        display: 'flex',
        gap: '4px',
        backgroundColor: 'var(--card)',
        borderRadius: '50px',
        padding: '4px',
        boxShadow: 'var(--shadow)',
      }}>
        {['de', 'en'].map((code) => {
          const aktiv = sprache === code
          return (
            <button
              key={code}
              onClick={() => setSprache(code)}
              className="btn-press"
              style={{
                minWidth: '38px',
                padding: '7px 12px',
                borderRadius: '50px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: '700',
                letterSpacing: '0.04em',
                backgroundColor: aktiv ? 'var(--gold)' : 'transparent',
                color: aktiv ? '#0a0f1e' : 'var(--text-sub)',
                transition: 'background-color 0.25s ease, color 0.25s ease',
              }}
            >
              <span key={`${code}-${sprache}`} className={aktiv ? 'sprache-pill' : ''} style={{ display: 'inline-block' }}>
                {code.toUpperCase()}
              </span>
            </button>
          )
        })}
      </div>

      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg)',
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,168,76,0.14) 0%, transparent 70%)',
        padding: '20px', boxSizing: 'border-box',
      }}>
        <div style={{ width: '100%', maxWidth: '400px', boxSizing: 'border-box' }}>

          {/* Logo Bereich */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>

            {/* Logo mit Kompass als O */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '0px',
              marginBottom: '12px',
            }}>
              {/* "V" */}
              <span className="voy-animation" style={{
                fontSize: 'clamp(2.8rem, 11vw, 3.8rem)',
                fontWeight: '800', color: 'var(--text)',
                letterSpacing: '-2px', lineHeight: 1,
              }}>
                V
              </span>

              {/* Kompass als "O" */}
              <span className="kompass-animation" style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginTop: '8px',
              }}>
                <svg
                  viewBox="0 0 60 60"
                  style={{ verticalAlign: 'middle', width: 'clamp(36px, 9vw, 52px)', height: 'clamp(36px, 9vw, 52px)' }}
                >
                  {/* Äußerer Ring */}
                  <circle cx="30" cy="30" r="27" fill="none" stroke="var(--gold)" stroke-width="4"/>
                  {/* Innerer Ring dezent */}
                  <circle cx="30" cy="30" r="18" fill="none" stroke="var(--gold)" stroke-width="0.8" opacity="0.3"/>
                  {/* Nordnadel gold */}
                  <polygon className="nadel-puls" points="30,5 34,30 30,26 26,30" fill="var(--gold)"/>
                  {/* Südnadel weiß */}
                  <polygon points="30,55 34,30 30,34 26,30" fill="#ffffff" opacity="0.15"/>
                  {/* Mittelpunkt */}
                  <circle cx="30" cy="30" r="4" fill="var(--gold)"/>
                  <circle cx="30" cy="30" r="2" fill="var(--bg)"/>
                  {/* N oben */}
                  <circle cx="30" cy="5" r="2" fill="var(--gold)"/>
                </svg>
              </span>

              {/* "y" */}
              <span className="voy-animation" style={{
                fontSize: 'clamp(2.8rem, 11vw, 3.8rem)',
                fontWeight: '800', color: 'var(--text)',
                letterSpacing: '-2px', lineHeight: 1,
              }}>
                y
              </span>

              {/* "ag" gold */}
              <span className="ag-animation" style={{
                fontSize: 'clamp(2.8rem, 11vw, 3.8rem)',
                fontWeight: '800', color: 'var(--gold)',
                letterSpacing: '-2px', lineHeight: 1,
              }}>
                ag
              </span>
            </div>

            {/* Tagline */}
            <p className="tagline-animation" style={{
              color: 'var(--text-sub)', fontSize: '0.82rem', margin: 0,
              letterSpacing: '0.2em', textTransform: 'uppercase',
            }}>
              {isRegistrieren ? t('erstelleAccountTagline') : t('travelTagline')}
            </p>
          </div>

          {/* Einladungs-Hinweis (K14) – bleibt sichtbar, egal ob Login oder Registrierung */}
          {eingeladenerCode && (
            <div className="fade-in" style={{
              backgroundColor: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.25)',
              borderRadius: '12px', padding: '12px 16px', marginBottom: '20px',
            }}>
              <p style={{ color: 'var(--gold)', margin: 0, fontSize: '0.85rem', fontWeight: '600', lineHeight: 1.4 }}>
                {eingeladenReiseName ? t('eingeladenZuReiseText')(eingeladenReiseName) : t('eingeladenAllgemeinText')}
              </p>
            </div>
          )}

          {/* Fehlermeldung */}
          {fehler && (
            <div className="fade-in" style={{
              backgroundColor: 'rgba(233,69,96,0.12)',
              border: '1px solid rgba(233,69,96,0.3)',
              borderRadius: '12px', padding: '12px 16px', marginBottom: '20px',
            }}>
              <p style={{ color: '#e94560', margin: 0, fontSize: '0.88rem' }}>{fehler}</p>
            </div>
          )}

          {/* Email */}
          <div className="input-animation-1" style={{ position: 'relative', marginBottom: '12px' }}>
            <Mail size={16} color="var(--text-sub)" style={{
              position: 'absolute', left: '16px', top: '50%',
              transform: 'translateY(-50%)', pointerEvents: 'none',
            }} />
            <input
              placeholder={t('email')} type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email" name="email" inputMode="email"
              style={{ ...inputStyle, paddingLeft: '44px' }}
            />
          </div>

          {/* Name – nur beim Registrieren */}
          {isRegistrieren && (
            <div className="fade-in" style={{ position: 'relative', marginBottom: '12px' }}>
              <User size={16} color="var(--text-sub)" style={{
                position: 'absolute', left: '16px', top: '50%',
                transform: 'translateY(-50%)', pointerEvents: 'none',
              }} />
              <input
                placeholder={t('deinNamePlatzhalter')}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name" name="name"
                style={{ ...inputStyle, paddingLeft: '44px' }}
              />
            </div>
          )}

          {/* Passwort – beim Passwort-Reset-Anfordern ausgeblendet (K13) */}
          {!passwortVergessenOffen && (
          <div className="input-animation-2" style={{ position: 'relative', marginBottom: isRegistrieren ? '8px' : '10px' }}>
            <Lock size={16} color="var(--text-sub)" style={{
              position: 'absolute', left: '16px', top: '50%',
              transform: 'translateY(-50%)', pointerEvents: 'none',
            }} />
            <input
              placeholder={t('passwort')}
              type={passwortSichtbar ? 'text' : 'password'}
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoComplete={isRegistrieren ? 'new-password' : 'current-password'}
              name="password"
              style={{ ...inputStyle, paddingLeft: '44px', paddingRight: '48px' }}
            />
            <button
              onClick={() => setPasswortSichtbar(!passwortSichtbar)}
              style={{
                position: 'absolute', right: '4px', top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-sub)',
                width: '44px', height: '44px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {passwortSichtbar ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          )}

          {/* Passwort vergessen – nur im Login-Modus (K13) */}
          {!isRegistrieren && !passwortVergessenOffen && (
            <p
              onClick={() => { setPasswortVergessenOffen(true); setFehler('') }}
              className="fade-in"
              style={{
                color: 'var(--gold)', textAlign: 'right', cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: '600', margin: '0 0 24px',
              }}
            >
              {t('passwortVergessenLink')}
            </p>
          )}

          {!isRegistrieren && passwortVergessenOffen && (
            <div className="fade-in" style={{ marginBottom: '24px' }}>
              <p style={{ color: 'var(--text-sub)', fontSize: '0.85rem', margin: '0 0 14px', lineHeight: 1.5 }}>
                {t('passwortVergessenText')}
              </p>
              <button onClick={passwortVergessenSenden} disabled={passwortResetLaeuft} className="btn-press" style={{
                backgroundColor: 'var(--gold)', color: 'var(--bg)',
                border: 'none', padding: '16px', borderRadius: '16px',
                fontSize: '1rem', fontWeight: '700',
                cursor: passwortResetLaeuft ? 'not-allowed' : 'pointer',
                width: '100%', marginBottom: '10px',
                opacity: passwortResetLaeuft ? 0.7 : 1,
              }}>
                {passwortResetLaeuft ? t('laedt') : t('resetLinkSendenBtn')}
              </button>
              <p
                onClick={() => { setPasswortVergessenOffen(false); setFehler('') }}
                style={{ color: 'var(--text-sub)', textAlign: 'center', cursor: 'pointer', fontSize: '0.85rem', margin: 0 }}
              >
                {t('abbrechen')}
              </p>
            </div>
          )}

          {/* Passwort-Stärke Balken – nur beim Registrieren und wenn Passwort eingegeben */}
          {isRegistrieren && passwort && (
            <div className="fade-in" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '6px' }}>
                {['schwach', 'mittel', 'stark'].map((stufe, i) => {
                  const aktiv = staerke === 'stark' ? true
                    : staerke === 'mittel' ? i < 2
                    : i < 1
                  const farbe = staerke === 'stark' ? '#4caf50'
                    : staerke === 'mittel' ? 'var(--gold)'
                    : '#e94560'
                  return (
                    <div key={stufe} style={{
                      flex: 1, height: '4px', borderRadius: '2px',
                      backgroundColor: aktiv ? farbe : 'var(--input-border)',
                      transition: 'background-color 0.25s ease',
                    }} />
                  )
                })}
              </div>
              <p style={{
                fontSize: '0.75rem', margin: 0, fontWeight: '600',
                color: staerke === 'stark' ? '#4caf50' : staerke === 'mittel' ? 'var(--gold)' : '#e94560',
              }}>
                {t(`passwort${staerke.charAt(0).toUpperCase() + staerke.slice(1)}`)}
              </p>
            </div>
          )}

          {/* Passwort bestätigen – nur beim Registrieren */}
          {isRegistrieren && (
            <div className="input-animation-2" style={{ position: 'relative', marginBottom: '24px' }}>
              <Lock size={16} color="var(--text-sub)" style={{
                position: 'absolute', left: '16px', top: '50%',
                transform: 'translateY(-50%)', pointerEvents: 'none',
              }} />
              <input
                placeholder={t('passwortBestaetigenFeld')}
                type={passwortSichtbar ? 'text' : 'password'}
                value={passwortBestaetigung}
                onChange={(e) => setPasswortBestaetigung(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                autoComplete="new-password" name="password-confirm"
                style={{
                  ...inputStyle,
                  paddingLeft: '44px',
                  borderColor: passwortBestaetigung && passwort !== passwortBestaetigung
                    ? 'rgba(233,69,96,0.5)' : undefined,
                }}
              />
            </div>
          )}

          {/* Login Button – beim Passwort-Reset-Anfordern ausgeblendet (K13) */}
          {!passwortVergessenOffen && (
          <div className="button-animation">
            <button onClick={handleSubmit} disabled={laden || pflichtfelderFehlen} className="btn-press" style={{
              backgroundColor: 'var(--gold)', color: 'var(--bg)',
              border: 'none', padding: '16px', borderRadius: '16px',
              fontSize: '1rem', fontWeight: '700',
              cursor: laden || pflichtfelderFehlen ? 'not-allowed' : 'pointer',
              width: '100%', marginBottom: '20px',
              opacity: laden || pflichtfelderFehlen ? 0.7 : 1,
              boxShadow: '0 6px 24px rgba(201,168,76,0.35)',
              letterSpacing: '0.02em',
            }}>
              {laden ? t('laedt') : isRegistrieren ? t('accountErstellen') : t('einloggen')}
            </button>
          </div>
          )}

          {/* Wechseln */}
          {!passwortVergessenOffen && (
          <p
            className="switch-animation"
            onClick={() => { setIsRegistrieren(!isRegistrieren); setFehler('') }}
            style={{
              color: 'var(--text-sub)', textAlign: 'center', cursor: 'pointer',
              fontSize: '0.88rem', padding: '10px 0', margin: 0,
            }}
          >
            {isRegistrieren ? (
              <>{t('schonAccount')}{' '}
                <span style={{ color: 'var(--gold)', fontWeight: '600' }}>{t('einloggen')}</span>
              </>
            ) : (
              <>{t('nochKeinAccount')}{' '}
                <span style={{ color: 'var(--gold)', fontWeight: '600' }}>{t('registrieren')}</span>
              </>
            )}
          </p>
          )}

        </div>
      </div>
    </>
  )
}

const inputStyle = {
  width: '100%', padding: '16px',
  backgroundColor: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  borderRadius: '14px', color: 'var(--text)',
  fontSize: '1rem', boxSizing: 'border-box',
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
}

export default LoginScreen