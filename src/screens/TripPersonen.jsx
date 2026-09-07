import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import { UserPlus, BadgeCheck, Search, Link2Off, Copy, Check, Share2 } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'
import Toast from '../components/Toast'
import useToast from '../hooks/useToast.jsx'
import useBodyScrollLock from '../hooks/useBodyScrollLock'
import TripNichtGefunden from '../components/TripNichtGefunden'

export default function TripPersonen() {
  const { id } = useParams()
  const { t } = useSettings()
  const { toasts, setToasts, toast } = useToast()
  const [trip, setTrip] = useState(null)
  const [teilnehmer, setTeilnehmer] = useState([])
  const [profile, setProfile] = useState({})
  const [neuerTeilnehmer, setNeuerTeilnehmer] = useState('')
  const [laden, setLaden] = useState(true)

  // State für User verknüpfen – Live-Suche in profiles statt reinem Email-Feld
  const [verknuepfenId, setVerknuepfenId] = useState(null)
  const [sucheText, setSucheText] = useState('')
  const [sucheErgebnisse, setSucheErgebnisse] = useState([])
  const [sucheLaedt, setSucheLaedt] = useState(false)
  // Bestätigungs-Bottom-Sheet zum Lösen einer Verknüpfung
  const [loeseVerknuepfungTeilnehmer, setLoeseVerknuepfungTeilnehmer] = useState(null)
  // Icon-Wechsel nach dem Kopieren des Einladungscodes (1.5s)
  const [codeKopiert, setCodeKopiert] = useState(false)
  // Schützt gegen doppeltes Anlegen eines Teilnehmers durch schnelles Doppel-Tippen
  const [speichernLaeuft, setSpeichernLaeuft] = useState(false)
  useBodyScrollLock(!!loeseVerknuepfungTeilnehmer)

  useEffect(() => {
    const datenLaden = async () => {
      // Trip laden
      const { data: tripData, error: tripError } = await supabase
        .from('trips').select('*').eq('id', id).single()
      if (tripError) console.error('Fehler beim Laden des Trips:', tripError)
      setTrip(tripData)

      if (!tripData) { setLaden(false); return }

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
    // Schnelles Doppel-Tippen auf den "+" Button würde sonst den Teilnehmer doppelt anlegen
    if (speichernLaeuft) return
    if (!neuerTeilnehmer) return

    setSpeichernLaeuft(true)
    try {
      const { data, error } = await supabase
        .from('teilnehmer')
        .insert([{ name: neuerTeilnehmer, trip_id: id }])
        .select()
      if (error) console.error('Fehler:', error)
      else {
        setTeilnehmer([...teilnehmer, data[0]])
        setNeuerTeilnehmer('')
      }
    } finally {
      setSpeichernLaeuft(false)
    }
  }

  // Teilnehmer entfernen
  const teilnehmerEntfernen = async (teilnehmerId) => {
    const { error } = await supabase.from('teilnehmer').delete().eq('id', teilnehmerId)
    if (error) console.error('Fehler:', error)
    else setTeilnehmer(teilnehmer.filter(t => t.id !== teilnehmerId))
  }

  // Bereits mit dieser Reise verknüpfte User-IDs – aus den Suchergebnissen herausfiltern
  const verknuepfteUserIds = teilnehmer.filter(p => p.user_id).map(p => p.user_id)

  // Live-Suche in profiles – ab 3 Zeichen, debounced um 300ms
  useEffect(() => {
    if (!verknuepfenId) return
    const timer = setTimeout(async () => {
      if (sucheText.trim().length < 3) {
        setSucheErgebnisse([])
        return
      }
      setSucheLaedt(true)
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`name.ilike.%${sucheText}%,email.ilike.%${sucheText}%`)
        .limit(10)
      const gefiltert = (data || []).filter(p => !verknuepfteUserIds.includes(p.id))
      setSucheErgebnisse(gefiltert)
      setSucheLaedt(false)
      if (gefiltert.length === 0) toast(t('keinNutzerGefunden'), 'error')
    }, 300)
    return () => clearTimeout(timer)
  }, [sucheText, verknuepfenId])

  // Voyag User mit Teilnehmer verknüpfen
  const userVerknuepfen = async (teilnehmerId, profileData) => {
    if (verknuepfteUserIds.includes(profileData.id)) {
      toast(t('bereitsVerknuepftFehler'), 'error')
      return
    }

    const { error: updateError } = await supabase
      .from('teilnehmer')
      .update({ user_id: profileData.id })
      .eq('id', teilnehmerId)

    if (updateError) { console.error('Fehler:', updateError); return }

    const neueTeilnehmer = teilnehmer.map(t =>
      t.id === teilnehmerId ? { ...t, user_id: profileData.id } : t
    )
    setTeilnehmer([...neueTeilnehmer])
    setProfile(prev => ({ ...prev, [profileData.id]: profileData }))
    setVerknuepfenId(null)
    setSucheText('')
    setSucheErgebnisse([])
    toast(t('verknuepftErfolgreich'), 'success')
  }

  // Verknüpfung eines Teilnehmers wieder lösen (user_id zurück auf null)
  const verknuepfungLoesen = async (teilnehmerId) => {
    const { error } = await supabase
      .from('teilnehmer')
      .update({ user_id: null })
      .eq('id', teilnehmerId)

    if (error) { console.error('Fehler:', error); return }

    setTeilnehmer(teilnehmer.map(t => t.id === teilnehmerId ? { ...t, user_id: null } : t))
    setLoeseVerknuepfungTeilnehmer(null)
    toast(t('verknuepfungGeloest'), 'success')
  }

  // Einladungscode in die Zwischenablage kopieren – Icon wechselt kurz zu Check
  const codeKopieren = async () => {
    await navigator.clipboard.writeText(trip.invite_code)
    toast(t('kopiert'), 'success')
    setCodeKopiert(true)
    setTimeout(() => setCodeKopiert(false), 1500)
  }

  // Einladungslink teilen – Web Share API mit Zwischenablage als Fallback
  const linkTeilen = async () => {
    const link = `${window.location.origin}/join/${trip.invite_code}`
    const text = t('einladungText')(trip.name)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Voyag', text, url: link })
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err)
      }
    } else {
      await navigator.clipboard.writeText(link)
      toast(t('linkKopiert'), 'success')
    }
  }

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

  if (!trip) return <TripNichtGefunden />

  return (
    <div style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom))' }}>
      <TripNav tripName={trip.name} />

      <div style={{ padding: '0 clamp(14px, 4vw, 20px)', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Teilnehmer Liste */}
        {teilnehmer.length === 0 ? (
          <div className="fade-in" style={{ ...karteStyle, textAlign: 'center', padding: '32px' }}>
            <p style={{ color: 'var(--text-sub)', margin: 0 }}>{t('keineTeilnehmer')}</p>
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
                          ? '2px solid var(--gold)'
                          : '2px solid rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: verknuepftProfil ? '0 0 16px rgba(201,168,76,0.25)' : 'none',
                        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                      }}>
                        <span style={{
                          fontSize: initials.length > 1 ? '1.2rem' : '1.4rem',
                          fontWeight: '800', color: 'var(--text)',
                          letterSpacing: initials.length > 1 ? '-1px' : '0',
                        }}>
                          {initials}
                        </span>
                      </div>
                      {/* Gold Badge-Check für verknüpfte Accounts */}
                      {verknuepftProfil && (
                        <div style={{
                          position: 'absolute', bottom: '-2px', right: '-2px',
                          width: '20px', height: '20px', borderRadius: '50%',
                          backgroundColor: 'var(--gold)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '2px solid var(--card)',
                        }}>
                          <BadgeCheck size={12} color="#080d1a" />
                        </div>
                      )}
                    </div>

                    {/* Name + Status */}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: '700', margin: '0 0 3px', fontSize: '1rem', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                        {person.name}
                      </p>
                      {verknuepftProfil ? (
                        <p style={{ color: 'var(--gold)', fontSize: '0.78rem', margin: 0, fontWeight: '600', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                          @{verknuepftProfil.name || t('voyagNutzerFallback')}
                        </p>
                      ) : (
                        <p style={{ color: 'var(--text-sub)', fontSize: '0.78rem', margin: 0 }}>
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
                          setSucheText('')
                          setSucheErgebnisse([])
                        }}
                        style={{
                          backgroundColor: 'rgba(201,168,76,0.1)',
                          border: '1px solid rgba(201,168,76,0.25)',
                          color: 'var(--gold)', cursor: 'pointer',
                          padding: '0 14px', minHeight: '44px', boxSizing: 'border-box',
                          borderRadius: '50px', display: 'flex', alignItems: 'center',
                          fontSize: '0.75rem', fontWeight: '600',
                        }}
                      >
                        {t('verknuepfen')}
                      </button>
                    )}
                    {/* Verknüpfung lösen – nur wenn bereits verknüpft */}
                    {person.user_id && (
                      <button
                        className="btn-press"
                        onClick={() => setLoeseVerknuepfungTeilnehmer(person)}
                        style={{
                          backgroundColor: 'rgba(136,146,164,0.1)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-sub)', cursor: 'pointer',
                          width: '44px', height: '44px', borderRadius: '50%', boxSizing: 'border-box',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}
                      >
                        <Link2Off size={15} />
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

                {/* Verknüpfen – Live-Suche nach Voyag-Nutzern */}
                {verknuepfenId === person.id && (
                  <div className="fade-in" style={{
                    marginTop: '14px', paddingTop: '14px',
                    borderTop: '1px solid var(--border)',
                  }}>
                    <p style={{ color: 'var(--text-sub)', fontSize: '0.82rem', marginBottom: '10px' }}>
                      {t('voyagKontoVerknuepfenText')}
                    </p>
                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                      <Search size={16} color="var(--text-sub)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input
                        placeholder={t('nutzerSuchenPlatzhalter')}
                        value={sucheText}
                        onChange={(e) => setSucheText(e.target.value)}
                        autoFocus
                        style={{ ...inputStyle, paddingLeft: '40px', marginBottom: 0 }}
                      />
                    </div>

                    {/* Suchergebnisse als antippbare Karten */}
                    {sucheLaedt ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                        <div className="skeleton" style={{ height: '58px', borderRadius: '14px' }} />
                      </div>
                    ) : sucheErgebnisse.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                        {sucheErgebnisse.map(profilTreffer => {
                          const treffInitiale = profilTreffer.name?.charAt(0)?.toUpperCase() || '?'
                          return (
                            <button
                              key={profilTreffer.id}
                              onClick={() => userVerknuepfen(person.id, profilTreffer)}
                              className="btn-press"
                              style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                backgroundColor: 'var(--sub)', border: '1px solid var(--input-border)',
                                borderRadius: '14px', padding: '10px 14px', cursor: 'pointer',
                                textAlign: 'left', width: '100%', boxSizing: 'border-box', minHeight: '44px',
                              }}
                            >
                              <div style={{
                                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                                backgroundColor: 'var(--gold)', color: '#0a0f1e',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: '700', fontSize: '0.95rem',
                              }}>
                                {treffInitiale}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', color: 'var(--text)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                                  {profilTreffer.name || t('voyagNutzerFallback')}
                                </p>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-sub)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                                  {profilTreffer.email}
                                </p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    <button onClick={() => setVerknuepfenId(null)} className="btn-press" style={{
                      backgroundColor: 'transparent', color: 'var(--text-sub)',
                      border: '1px solid var(--border)',
                      padding: '10px 16px', minHeight: '44px', boxSizing: 'border-box', borderRadius: '12px', cursor: 'pointer',
                      fontSize: '0.88rem', width: '100%',
                    }}>{t('abbrechen')}</button>
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
              <UserPlus size={16} color="var(--gold)" />
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
            <button onClick={teilnehmerHinzufuegen} disabled={speichernLaeuft} className="btn-press" style={{
              backgroundColor: 'var(--gold)', color: '#0a0f1e', border: 'none',
              padding: '0 20px', minHeight: '48px', borderRadius: '14px',
              cursor: 'pointer', fontSize: '1.3rem', fontWeight: '600', flexShrink: 0,
              boxShadow: '0 4px 14px rgba(201,168,76,0.3)',
              opacity: speichernLaeuft ? 0.6 : 1,
            }}>+</button>
          </div>
        </div>

        {/* Einladungscode */}
        {trip.invite_code && (
          <div className="fade-in" style={karteStyle}>
            <h3 style={{ margin: '0 0 6px', fontWeight: '700' }}>{t('einladungscodeTitel')}</h3>
            <p style={{ color: 'var(--text-sub)', fontSize: '0.82rem', marginBottom: '14px' }}>
              {t('einladungscodeText')}
            </p>
            <div style={{
              backgroundColor: 'var(--sub)',
              borderRadius: '16px', padding: '20px',
              textAlign: 'center',
              border: '1px solid rgba(201,168,76,0.2)',
              boxShadow: '0 0 30px rgba(201,168,76,0.08) inset',
            }}>
              <p style={{
                fontSize: 'clamp(1.8rem, 8vw, 2.4rem)', fontWeight: '800',
                letterSpacing: '0.35em', color: 'var(--gold)', margin: 0,
              }}>
                {trip.invite_code}
              </p>
            </div>

            {/* Code kopieren + Link teilen */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button onClick={codeKopieren} className="btn-press" style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                backgroundColor: 'var(--sub)', color: 'var(--text)', border: '1px solid var(--border)',
                padding: '0 14px', minHeight: '48px', borderRadius: '14px', boxSizing: 'border-box',
                cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem',
              }}>
                {codeKopiert ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                {codeKopiert ? t('kopiert') : t('codeKopieren')}
              </button>
              <button onClick={linkTeilen} className="btn-press" style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                backgroundColor: 'var(--gold)', color: '#0a0f1e', border: 'none',
                padding: '0 14px', minHeight: '48px', borderRadius: '14px', boxSizing: 'border-box',
                cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem',
              }}>
                <Share2 size={16} /> {t('linkTeilen')}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Bestätigungs-Bottom-Sheet zum Lösen einer Verknüpfung */}
      {loeseVerknuepfungTeilnehmer && (
        <div
          onClick={() => setLoeseVerknuepfungTeilnehmer(null)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 9998,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="fade-in"
            style={{
              backgroundColor: 'var(--card)', borderRadius: '24px 24px 0 0',
              width: '100%', maxWidth: '600px',
              maxHeight: '88vh', overflowY: 'auto', overflowX: 'hidden',
              boxSizing: 'border-box',
              padding: '24px 20px calc(32px + env(safe-area-inset-bottom))',
              zIndex: 9999,
            }}
          >
            <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--sub)', borderRadius: '2px', margin: '0 auto 24px' }} />
            <h3 style={{ margin: '0 0 8px', fontWeight: '700', fontSize: '1.2rem' }}>
              {t('verknuepfungLoesenTitel')}
            </h3>
            <p style={{ color: 'var(--text-sub)', margin: '0 0 24px', fontSize: '0.92rem', lineHeight: 1.5 }}>
              {t('verknuepfungLoesenText')(loeseVerknuepfungTeilnehmer.name)}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => verknuepfungLoesen(loeseVerknuepfungTeilnehmer.id)} className="btn-press" style={{
                backgroundColor: '#e94560', color: '#fff', border: 'none',
                padding: '14px', minHeight: '48px', boxSizing: 'border-box', borderRadius: '14px', cursor: 'pointer',
                flex: 1, fontWeight: '700', fontSize: '0.95rem',
              }}>{t('verknuepfungLoesenBtn')}</button>
              <button onClick={() => setLoeseVerknuepfungTeilnehmer(null)} className="btn-press" style={{
                backgroundColor: 'var(--sub)', color: 'var(--text)', border: 'none',
                padding: '14px', minHeight: '48px', boxSizing: 'border-box', borderRadius: '14px', cursor: 'pointer', flex: 1, fontWeight: '600',
              }}>{t('abbrechen')}</button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} setToasts={setToasts} />
    </div>
  )
}

const karteStyle = {
  backgroundColor: 'var(--card)',
  borderRadius: '20px',
  padding: 'clamp(16px, 4vw, 22px)',
  marginBottom: '12px',
  boxSizing: 'border-box',
  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
}

const inputStyle = {
  width: '100%', padding: '13px 14px',
  backgroundColor: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  borderRadius: '12px',
  // min. 16px verhindert Auto-Zoom bei Fokus auf iOS Safari
  color: 'var(--text)', fontSize: '16px',
  boxSizing: 'border-box', marginBottom: '10px',
}
