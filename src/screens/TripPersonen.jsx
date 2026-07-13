import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import { UserPlus, CheckCircle } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'

export default function TripPersonen() {
  const { id } = useParams()
  const { t } = useSettings()
  const [trip, setTrip] = useState(null)
  const [teilnehmer, setTeilnehmer] = useState([])
  const [profile, setProfile] = useState({})
  const [neuerTeilnehmer, setNeuerTeilnehmer] = useState('')
  const [laden, setLaden] = useState(true)

  // State für User verknüpfen
  const [verknuepfenId, setVerknuepfenId] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [verknuepfenFehler, setVerknuepfenFehler] = useState('')

  useEffect(() => {
    const datenLaden = async () => {
      // Trip laden
      const { data: tripData } = await supabase
        .from('trips').select('*').eq('id', id).single()
      setTrip(tripData)

      // Teilnehmer laden
      const { data: teilnehmerData } = await supabase
        .from('teilnehmer').select('*').eq('trip_id', id)
      setTeilnehmer(teilnehmerData || [])

      // Profile der verknüpften User laden
      const userIds = (teilnehmerData || [])
        .filter(t => t.user_id)
        .map(t => t.user_id)

      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles').select('*').in('id', userIds)
        const profileMap = {}
        profileData?.forEach(p => profileMap[p.id] = p)
        setProfile(profileMap)
      }

      setLaden(false)
    }
    datenLaden()
  }, [id])

  // Neuen Teilnehmer hinzufügen
  const teilnehmerHinzufuegen = async () => {
    if (!neuerTeilnehmer) return
    const { data, error } = await supabase
      .from('teilnehmer')
      .insert([{ name: neuerTeilnehmer, trip_id: id }])
      .select()
    if (error) console.error('Fehler:', error)
    else {
      setTeilnehmer([...teilnehmer, data[0]])
      setNeuerTeilnehmer('')
    }
  }

  // Teilnehmer entfernen
  const teilnehmerEntfernen = async (teilnehmerId) => {
    const { error } = await supabase.from('teilnehmer').delete().eq('id', teilnehmerId)
    if (error) console.error('Fehler:', error)
    else setTeilnehmer(teilnehmer.filter(t => t.id !== teilnehmerId))
  }

  // Voyag User mit Teilnehmer verknüpfen
  const userVerknuepfen = async (teilnehmerId) => {
    setVerknuepfenFehler('')
    if (!userEmail) return

    // Direkt über profiles Tabelle suchen
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single()

    if (!profileData) {
      setVerknuepfenFehler(t('keinNutzerGefunden'))
      return
    }

    // Teilnehmer verknüpfen
    const { error: updateError } = await supabase
      .from('teilnehmer')
      .update({ user_id: profileData.id })
      .eq('id', teilnehmerId)

    if (updateError) { console.error('Fehler:', updateError); return }

    // State aktualisieren
    const neueTeilnehmer = teilnehmer.map(t =>
      t.id === teilnehmerId ? { ...t, user_id: profileData.id } : t
    )
    setTeilnehmer([...neueTeilnehmer])
    setProfile(prev => ({ ...prev, [profileData.id]: profileData }))
    setVerknuepfenId(null)
    setUserEmail('')
  }

  console.log('Fertig! Neuer Teilnehmer State:', teilnehmer)

  // Initialen aus Name extrahieren (max. 2 Buchstaben)
  const getInitialen = (name) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map(w => w[0].toUpperCase())
      .slice(0, 2)
      .join('')
  }

  // Avatar Hintergrundfarbe basierend auf erstem Buchstaben
  const getAvatarFarbe = (name) => {
    const farben = [
      'rgba(201,168,76,0.18)',
      'rgba(74,144,226,0.18)',
      'rgba(80,200,120,0.18)',
      'rgba(155,89,182,0.18)',
      'rgba(230,126,34,0.18)',
    ]
    return farben[(name.charCodeAt(0) || 0) % farben.length]
  }

  if (laden) return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '18px', marginBottom: '12px' }} />
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ paddingBottom: '100px' }}>
      <TripNav tripName={trip.name} />

      <div style={{ padding: '0 clamp(14px, 4vw, 20px)', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Teilnehmer Liste */}
        {teilnehmer.length === 0 ? (
          <div className="fade-in" style={{ ...karteStyle, textAlign: 'center', padding: '32px' }}>
            <p style={{ color: '#8892a4', margin: 0 }}>{t('keineTeilnehmer')}</p>
          </div>
        ) : (
          teilnehmer.map((person, index) => {
            const verknuepftProfil = person.user_id ? profile[person.user_id] : null
            const initials = getInitialen(person.name)
            const avatarFarbe = getAvatarFarbe(person.name)
            return (
              <div key={person.id} className={`karte-hover fade-in-${Math.min(index + 1, 5)}`} style={karteStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>

                  {/* Avatar + Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                    {/* Großer Avatar Kreis mit Initialen */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        backgroundColor: avatarFarbe,
                        border: verknuepftProfil
                          ? '2px solid #c9a84c'
                          : '2px solid rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: verknuepftProfil ? '0 0 16px rgba(201,168,76,0.25)' : 'none',
                        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                      }}>
                        <span style={{
                          fontSize: initials.length > 1 ? '1.2rem' : '1.4rem',
                          fontWeight: '800', color: '#ffffff',
                          letterSpacing: initials.length > 1 ? '-1px' : '0',
                        }}>
                          {initials}
                        </span>
                      </div>
                      {/* Gold Checkmark Badge für verknüpfte Accounts */}
                      {verknuepftProfil && (
                        <div style={{
                          position: 'absolute', bottom: '-2px', right: '-2px',
                          width: '20px', height: '20px', borderRadius: '50%',
                          backgroundColor: '#c9a84c',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '2px solid #111827',
                        }}>
                          <CheckCircle size={12} color="#080d1a" />
                        </div>
                      )}
                    </div>

                    {/* Name + Status */}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: '700', margin: '0 0 3px', fontSize: '1rem', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                        {person.name}
                      </p>
                      {verknuepftProfil ? (
                        <p style={{ color: '#c9a84c', fontSize: '0.78rem', margin: 0, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          @{verknuepftProfil.name || t('voyagNutzerFallback')} · {t('verknuepftSuffix')}
                        </p>
                      ) : (
                        <p style={{ color: '#8892a4', fontSize: '0.78rem', margin: 0 }}>
                          {t('keinVoyagKonto')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Aktionen */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    {/* Verknüpfen Button – nur wenn noch kein User verknüpft */}
                    {!person.user_id && (
                      <button
                        className="btn-press"
                        onClick={() => {
                          setVerknuepfenId(person.id)
                          setUserEmail('')
                          setVerknuepfenFehler('')
                        }}
                        style={{
                          backgroundColor: 'rgba(201,168,76,0.1)',
                          border: '1px solid rgba(201,168,76,0.25)',
                          color: '#c9a84c', cursor: 'pointer',
                          padding: '0 14px', minHeight: '44px', boxSizing: 'border-box',
                          borderRadius: '50px', display: 'flex', alignItems: 'center',
                          fontSize: '0.75rem', fontWeight: '600',
                        }}
                      >
                        {t('verknuepfen')}
                      </button>
                    )}
                    {/* Löschen – min. 44x44px Touch-Target (Apple HIG) */}
                    <button onClick={() => teilnehmerEntfernen(person.id)} className="btn-press" style={{
                      backgroundColor: 'rgba(233,69,96,0.08)',
                      border: '1px solid rgba(233,69,96,0.2)',
                      color: '#e94560', cursor: 'pointer',
                      width: '44px', height: '44px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem', fontWeight: '300', flexShrink: 0,
                    }}>×</button>
                  </div>
                </div>

                {/* Verknüpfen Formular – inline */}
                {verknuepfenId === person.id && (
                  <div className="fade-in" style={{
                    marginTop: '14px', paddingTop: '14px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <p style={{ color: '#8892a4', fontSize: '0.82rem', marginBottom: '10px' }}>
                      {t('voyagKontoVerknuepfenText')}
                    </p>
                    <input
                      placeholder={t('emailNutzerPlatzhalter')}
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && userVerknuepfen(person.id)}
                      style={inputStyle}
                    />
                    {/* Fehlermeldung */}
                    {verknuepfenFehler && (
                      <p style={{ color: '#e94560', fontSize: '0.82rem', marginBottom: '10px', marginTop: '-4px' }}>
                        {verknuepfenFehler}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => userVerknuepfen(person.id)} className="btn-press" style={{
                        backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
                        padding: '10px 16px', minHeight: '44px', boxSizing: 'border-box', borderRadius: '12px', cursor: 'pointer',
                        fontWeight: '700', fontSize: '0.88rem', flex: 1,
                        boxShadow: '0 4px 12px rgba(201,168,76,0.3)',
                      }}>{t('verknuepfen')}</button>
                      <button onClick={() => setVerknuepfenId(null)} className="btn-press" style={{
                        backgroundColor: 'transparent', color: '#8892a4',
                        border: '1px solid rgba(255,255,255,0.12)',
                        padding: '10px 16px', minHeight: '44px', boxSizing: 'border-box', borderRadius: '12px', cursor: 'pointer',
                        fontSize: '0.88rem', flex: 1,
                      }}>{t('abbrechen')}</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Neuen Teilnehmer hinzufügen */}
        <div className="fade-in" style={karteStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px',
              backgroundColor: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserPlus size={16} color="#c9a84c" />
            </div>
            <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1rem' }}>{t('teilnehmerHinzufuegenTitel')}</h3>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              placeholder={t('namePlatzhalterPunkte')}
              value={neuerTeilnehmer}
              onChange={(e) => setNeuerTeilnehmer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && teilnehmerHinzufuegen()}
              style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
            />
            <button onClick={teilnehmerHinzufuegen} className="btn-press" style={{
              backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
              padding: '0 20px', minHeight: '48px', borderRadius: '14px',
              cursor: 'pointer', fontSize: '1.3rem', fontWeight: '600', flexShrink: 0,
              boxShadow: '0 4px 14px rgba(201,168,76,0.3)',
            }}>+</button>
          </div>
        </div>

        {/* Einladungscode */}
        {trip.invite_code && (
          <div className="fade-in" style={karteStyle}>
            <h3 style={{ margin: '0 0 6px', fontWeight: '700' }}>{t('einladungscodeTitel')}</h3>
            <p style={{ color: '#8892a4', fontSize: '0.82rem', marginBottom: '14px' }}>
              {t('einladungscodeText')}
            </p>
            <div style={{
              backgroundColor: '#0d1525',
              borderRadius: '16px', padding: '20px',
              textAlign: 'center',
              border: '1px solid rgba(201,168,76,0.2)',
              boxShadow: '0 0 30px rgba(201,168,76,0.08) inset',
            }}>
              <p style={{
                fontSize: 'clamp(1.8rem, 8vw, 2.4rem)', fontWeight: '800',
                letterSpacing: '0.35em', color: '#c9a84c', margin: 0,
              }}>
                {trip.invite_code}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

const karteStyle = {
  backgroundColor: '#111827',
  borderRadius: '22px',
  padding: 'clamp(16px, 4vw, 22px)',
  marginBottom: '12px',
  boxSizing: 'border-box',
  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
}

const inputStyle = {
  width: '100%', padding: '13px 14px',
  backgroundColor: '#1a2235',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  // min. 16px verhindert Auto-Zoom bei Fokus auf iOS Safari
  color: '#ffffff', fontSize: '16px',
  boxSizing: 'border-box', marginBottom: '10px',
}
