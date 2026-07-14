import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Globe, DollarSign } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'

// Verfügbare Währungen
const WAEHRUNGEN = [
  { symbol: '€', name: 'Euro' },
  { symbol: '$', name: 'Dollar' },
  { symbol: '£', name: 'Pfund' },
  { symbol: '¥', name: 'Yen' },
  { symbol: '₺', name: 'Lira' },
  { symbol: 'CHF', name: 'Franken' },
  { symbol: 'kr', name: 'Krone' },
  { symbol: 'zł', name: 'Zloty' },
]

export default function OnboardingScreen({ user, onComplete }) {
  const { t, sprache, setSprache, waehrung, setWaehrung } = useSettings()
  const [schritt, setSchritt] = useState(1)
  const [userName, setUserName] = useState('')
  const [speichern, setSpeichern] = useState(false)
  // Animation-Key erzwingt neues fade-in bei Schrittenwechsel
  const [animKey, setAnimKey] = useState(0)

  // Namen aus Profil laden
  useEffect(() => {
    const nameladen = async () => {
      const { data } = await supabase
        .from('profiles').select('name').eq('id', user.id).single()
      if (data?.name) setUserName(data.name)
    }
    nameladen()
  }, [user.id])

  const naechsterSchritt = () => {
    setAnimKey(k => k + 1)
    setSchritt(s => s + 1)
  }

  // Abschluss: Profil in Supabase speichern und App freischalten
  const onboardingAbschliessen = async () => {
    setSpeichern(true)
    // upsert statt update – funktioniert auch wenn das Profil unerwartet fehlt
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      sprache,
      waehrung,
      onboarding_done: true,
    })
    if (error) console.error('Fehler beim Onboarding-Speichern:', error)
    // Context sofort aktualisieren damit die App die richtigen Werte hat
    setSprache(sprache)
    setWaehrung(waehrung)
    setSpeichern(false)
    onComplete()
  }

  return (
    <>
      {/* Animiertes Checkmark – CSS-Keyframe für Schritt 4 */}
      <style>{`
        @keyframes checkmarkPop {
          0%   { transform: scale(0) rotate(-45deg); opacity: 0; }
          70%  { transform: scale(1.15) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .checkmark-pop {
          animation: checkmarkPop 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes kompassOnboarding {
          from { transform: rotate(-180deg) scale(0.5); opacity: 0; }
          to   { transform: rotate(0deg) scale(1); opacity: 1; }
        }
        .kompass-onboarding {
          animation: kompassOnboarding 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;
        }
        @keyframes nadelPulsOn {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.3); }
        }
        .nadel-on {
          animation: nadelPulsOn 2.5s ease-in-out 1.2s infinite;
          transform-origin: 50% 50%;
        }
      `}</style>

      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg)',
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,168,76,0.12) 0%, transparent 70%)',
        padding: 'clamp(20px, 5vw, 40px)', boxSizing: 'border-box',
      }}>
        <div style={{ width: '100%', maxWidth: '400px', boxSizing: 'border-box' }}>

          {/* ── Progress Dots ── */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '40px' }}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} style={{
                width: n === schritt ? '24px' : '10px',
                height: '10px', borderRadius: '5px',
                backgroundColor: n === schritt ? 'var(--gold)'
                  : n < schritt ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.15)',
                transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
              }} />
            ))}
          </div>

          {/* ── Schritt-Inhalt mit Animation ── */}
          <div key={animKey} className="fade-in">

            {/* ────────────── Schritt 1: Willkommen ────────────── */}
            {schritt === 1 && (
              <div style={{ textAlign: 'center' }}>
                {/* Kompass-SVG (identisch zum LoginScreen) */}
                <div className="kompass-onboarding" style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                  <svg viewBox="0 0 60 60" style={{ width: '90px', height: '90px' }}>
                    <circle cx="30" cy="30" r="27" fill="none" stroke="var(--gold)" strokeWidth="4"/>
                    <circle cx="30" cy="30" r="18" fill="none" stroke="var(--gold)" strokeWidth="0.8" opacity="0.3"/>
                    <polygon className="nadel-on" points="30,5 34,30 30,26 26,30" fill="var(--gold)"/>
                    <polygon points="30,55 34,30 30,34 26,30" fill="#ffffff" opacity="0.15"/>
                    <circle cx="30" cy="30" r="4" fill="var(--gold)"/>
                    <circle cx="30" cy="30" r="2" fill="var(--bg)"/>
                    <circle cx="30" cy="5" r="2" fill="var(--gold)"/>
                  </svg>
                </div>

                <h1 style={{
                  fontSize: 'clamp(1.7rem, 7vw, 2.2rem)', fontWeight: '800',
                  margin: '0 0 16px', letterSpacing: '-0.5px', lineHeight: 1.2,
                }}>
                  {t('onboardingWillkommen')(userName || '...')}
                </h1>
                <p style={{
                  color: 'var(--text-sub)', fontSize: '0.95rem', lineHeight: 1.6,
                  margin: '0 0 40px',
                }}>
                  {t('onboardingWillkommenSubtitel')}
                </p>
                <button onClick={naechsterSchritt} className="btn-press" style={goldButtonStyle}>
                  {t('onboardingLosGehts')}
                </button>
              </div>
            )}

            {/* ────────────── Schritt 2: Sprache ────────────── */}
            {schritt === 2 && (
              <div>
                {/* Icon */}
                <div style={ikonKreisStyle}>
                  <Globe size={28} color="var(--gold)" />
                </div>
                <h2 style={schrittTitelStyle}>{t('onboardingSpracheTitel')}</h2>

                {/* Sprach-Karten */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                  {[
                    { code: 'de', label: 'Deutsch', badge: 'DE' },
                    { code: 'en', label: 'English', badge: 'EN' },
                  ].map(({ code, label, badge }) => {
                    const aktiv = sprache === code
                    return (
                      <button
                        key={code}
                        onClick={() => setSprache(code)}
                        className="btn-press"
                        style={{
                          flex: 1, padding: '20px 12px', borderRadius: '18px',
                          backgroundColor: aktiv ? 'rgba(201,168,76,0.1)' : 'var(--card)',
                          border: aktiv ? '2px solid rgba(201,168,76,0.6)' : '2px solid rgba(255,255,255,0.06)',
                          cursor: 'pointer', textAlign: 'center',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          transition: 'border-color 0.2s, background-color 0.2s',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{
                          fontSize: '1.1rem', fontWeight: '800',
                          color: aktiv ? 'var(--gold)' : 'var(--text-sub)',
                          marginBottom: '6px',
                          backgroundColor: aktiv ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.07)',
                          borderRadius: '8px', padding: '4px 10px',
                          display: 'inline-block',
                        }}>
                          {badge}
                        </div>
                        <p style={{ margin: 0, color: aktiv ? '#fff' : 'var(--text-sub)', fontWeight: aktiv ? '700' : '400', fontSize: '0.92rem' }}>
                          {label}
                        </p>
                      </button>
                    )
                  })}
                </div>

                <button onClick={naechsterSchritt} className="btn-press" style={goldButtonStyle}>
                  {t('onboardingWeiter')}
                </button>
              </div>
            )}

            {/* ────────────── Schritt 3: Währung ────────────── */}
            {schritt === 3 && (
              <div>
                {/* Icon */}
                <div style={ikonKreisStyle}>
                  <DollarSign size={28} color="var(--gold)" />
                </div>
                <h2 style={schrittTitelStyle}>{t('onboardingWaehrungTitel')}</h2>

                {/* Währungs-Kacheln – 4x2 Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '32px' }}>
                  {WAEHRUNGEN.map(({ symbol, name: waehrungsName }) => {
                    const aktiv = waehrung === symbol
                    return (
                      <button
                        key={symbol}
                        onClick={() => setWaehrung(symbol)}
                        className="btn-press"
                        style={{
                          padding: '14px 6px', borderRadius: '14px',
                          backgroundColor: aktiv ? 'rgba(201,168,76,0.12)' : 'var(--card)',
                          border: aktiv ? '2px solid rgba(201,168,76,0.55)' : '2px solid rgba(255,255,255,0.06)',
                          cursor: 'pointer', textAlign: 'center',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                          transition: 'border-color 0.2s, background-color 0.2s',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{
                          fontSize: symbol.length > 1 ? '0.85rem' : '1.2rem',
                          fontWeight: '800',
                          color: aktiv ? 'var(--gold)' : '#fff',
                          marginBottom: '4px',
                        }}>
                          {symbol}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: aktiv ? 'var(--gold)' : 'var(--text-sub)', fontWeight: '500' }}>
                          {waehrungsName}
                        </div>
                      </button>
                    )
                  })}
                </div>

                <button onClick={naechsterSchritt} className="btn-press" style={goldButtonStyle}>
                  {t('onboardingWeiter')}
                </button>
              </div>
            )}

            {/* ────────────── Schritt 4: Fertig! ────────────── */}
            {schritt === 4 && (
              <div style={{ textAlign: 'center' }}>
                {/* Animierter grüner Haken */}
                <div className="checkmark-pop" style={{
                  width: '96px', height: '96px', borderRadius: '50%',
                  backgroundColor: 'rgba(76,175,80,0.15)',
                  border: '3px solid rgba(76,175,80,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 32px',
                }}>
                  {/* SVG Haken */}
                  <svg viewBox="0 0 40 40" style={{ width: '44px', height: '44px' }}>
                    <polyline
                      points="7,21 16,30 33,11"
                      fill="none" stroke="#4caf50" strokeWidth="4"
                      strokeLinecap="round" strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <h1 style={{
                  fontSize: 'clamp(1.6rem, 6.5vw, 2rem)', fontWeight: '800',
                  margin: '0 0 16px', letterSpacing: '-0.5px',
                }}>
                  {t('onboardingFertigTitel')}
                </h1>
                <p style={{ color: 'var(--text-sub)', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 40px' }}>
                  {t('onboardingFertigSubtitel')}
                </p>

                <button
                  onClick={onboardingAbschliessen}
                  disabled={speichern}
                  className="btn-press"
                  style={{ ...goldButtonStyle, opacity: speichern ? 0.7 : 1, cursor: speichern ? 'not-allowed' : 'pointer' }}
                >
                  {speichern ? t('laedt') : t('onboardingErsteReiseBtn')}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}

// ── Style-Konstanten ──

const goldButtonStyle = {
  width: '100%', padding: '16px', borderRadius: '16px',
  backgroundColor: 'var(--gold)', color: 'var(--bg)',
  border: 'none', fontSize: '1rem', fontWeight: '700',
  cursor: 'pointer', letterSpacing: '0.02em',
  boxShadow: '0 6px 24px rgba(201,168,76,0.38)',
  boxSizing: 'border-box',
}

const ikonKreisStyle = {
  width: '64px', height: '64px', borderRadius: '50%',
  backgroundColor: 'rgba(201,168,76,0.1)',
  border: '1.5px solid rgba(201,168,76,0.25)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  margin: '0 auto 24px',
}

const schrittTitelStyle = {
  fontSize: 'clamp(1.3rem, 5.5vw, 1.7rem)', fontWeight: '800',
  margin: '0 0 24px', textAlign: 'center', letterSpacing: '-0.4px',
}
