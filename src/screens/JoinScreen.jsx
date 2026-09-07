import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import laender from '../data/laender'
import { Compass } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'
import useBodyScrollLock from '../hooks/useBodyScrollLock'
import { PENDING_INVITE_KEY } from '../App'

export default function JoinScreen() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { t } = useSettings()

  const [trip, setTrip] = useState(null)
  const [teilnehmerAnzahl, setTeilnehmerAnzahl] = useState(0)
  const [currentUser, setCurrentUser] = useState(null)
  const [laden, setLaden] = useState(true)
  const [ungueltig, setUngueltig] = useState(false)
  const [beitretenLaeuft, setBeitretenLaeuft] = useState(false)

  // Verknüpfungs-Modal – gleiche Logik wie beim Beitreten über den Code auf TripsOverview
  const [verknuepfungsModal, setVerknuepfungsModal] = useState(false)
  const [unverknuepfteTeilnehmer, setUnverknuepfteTeilnehmer] = useState([])
  const [ausgewaehlteTeilnehmer, setAusgewaehlteTeilnehmer] = useState(null)
  const [joinedTripId, setJoinedTripId] = useState(null)
  useBodyScrollLock(verknuepfungsModal)

  // Reise beitreten – identische Logik wie reiseBeitreten in TripsOverview.jsx
  const beitreten = async (tripData, user) => {
    setBeitretenLaeuft(true)

    if (tripData.user_id === user.id) {
      navigate(`/trip/${tripData.id}`)
      return
    }

    const { data: bereitsVorhanden } = await supabase
      .from('trip_members').select('*').eq('trip_id', tripData.id).eq('user_id', user.id).single()

    if (bereitsVorhanden) {
      navigate(`/trip/${tripData.id}`)
      return
    }

    await supabase.from('trip_members').insert([{ trip_id: tripData.id, user_id: user.id }])

    const { data: vorhanden } = await supabase
      .from('visited_countries')
      .select('*')
      .eq('user_id', user.id)
      .eq('country_code', tripData.land_code)
      .single()

    if (!vorhanden) {
      await supabase.from('visited_countries').insert([{
        user_id: user.id, country_code: tripData.land_code, trip_id: tripData.id,
      }])
    }

    // Unverknüpfte Teilnehmer prüfen – ggf. Verknüpfungs-Modal zeigen
    const { data: unverknuepfte } = await supabase
      .from('teilnehmer').select('*').eq('trip_id', tripData.id).is('user_id', null)

    if (unverknuepfte && unverknuepfte.length > 0) {
      const { data: eigenesProfil } = await supabase
        .from('profiles').select('name').eq('id', user.id).single()

      const nameNormalisiert = eigenesProfil?.name?.trim().toLowerCase()
      const namensTreffer = nameNormalisiert
        ? unverknuepfte.filter(p => p.name?.trim().toLowerCase() === nameNormalisiert)
        : []

      // Bei eindeutigem Namens-Match diesen vorauswählen; gibt es keinen Match,
      // aber insgesamt nur einen einzigen unverknüpften Teilnehmer, auch diesen
      // vorauswählen – spart einen Klick, ohne bei mehreren Kandidaten zu raten
      const vorauswahl = namensTreffer.length === 1
        ? namensTreffer[0]
        : (unverknuepfte.length === 1 ? unverknuepfte[0] : null)

      setJoinedTripId(tripData.id)
      setUnverknuepfteTeilnehmer(unverknuepfte)
      setAusgewaehlteTeilnehmer(vorauswahl)
      setVerknuepfungsModal(true)
      setBeitretenLaeuft(false)
    } else {
      navigate(`/trip/${tripData.id}`)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser()
      setCurrentUser(authData.user)

      const { data: tripData } = await supabase
        .from('trips').select('*').eq('invite_code', code.toUpperCase()).maybeSingle()

      if (!tripData) {
        setUngueltig(true)
        setLaden(false)
        return
      }
      setTrip(tripData)

      const { data: teilnehmerData } = await supabase
        .from('teilnehmer').select('id').eq('trip_id', tripData.id)
      setTeilnehmerAnzahl((teilnehmerData || []).length)

      setLaden(false)

      // Kommt der Aufruf aus dem "nicht eingeloggt"-Flow (Code lag in sessionStorage
      // seit dem Redirect zum Login)? Dann direkt automatisch beitreten ohne Vorschau.
      const pending = sessionStorage.getItem(PENDING_INVITE_KEY)
      if (pending && pending.toUpperCase() === code.toUpperCase()) {
        sessionStorage.removeItem(PENDING_INVITE_KEY)
        await beitreten(tripData, authData.user)
      }
    }
    init()
  }, [code])

  const teilnehmerVerknuepfen = async (person) => {
    await supabase.from('teilnehmer').update({ user_id: currentUser.id }).eq('id', person.id)
    navigate(`/trip/${joinedTripId}`)
  }

  const landName = trip ? laender.find(l => l.code === trip.land_code)?.name || '' : ''
  const flaggeUrl = trip?.land_code ? `https://flagcdn.com/w80/${trip.land_code.toLowerCase()}.png` : null

  if (laden) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box' }}>
      <div className="skeleton" style={{ height: '200px', borderRadius: '24px' }} />
    </div>
  )

  if (ungueltig) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '20px',
        backgroundColor: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '20px', boxShadow: 'var(--shadow)',
      }}>
        <Compass size={32} color="var(--gold)" />
      </div>
      <h2 style={{ margin: '0 0 8px', fontWeight: '800', fontSize: '1.2rem' }}>{t('joinUngueltigTitel')}</h2>
      <p style={{ color: 'var(--text-sub)', margin: '0 0 28px', fontSize: '0.92rem', maxWidth: '320px', lineHeight: 1.5 }}>
        {t('joinUngueltigText')}
      </p>
      <button onClick={() => navigate('/')} className="btn-press" style={{
        backgroundColor: 'var(--gold)', color: '#0a0f1e', border: 'none',
        padding: '0 24px', minHeight: '48px', borderRadius: '14px', boxSizing: 'border-box',
        cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem',
      }}>
        {t('joinZurueckBtn')}
      </button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box' }}>
      <div className="fade-in" style={{
        backgroundColor: 'var(--card)', borderRadius: '24px', padding: '28px 24px',
        boxShadow: 'var(--shadow)', boxSizing: 'border-box', textAlign: 'center',
      }}>
        {flaggeUrl && (
          <img src={flaggeUrl} alt={trip.land_code} style={{
            width: '64px', height: '48px', borderRadius: '10px', objectFit: 'cover',
            margin: '0 auto 18px', display: 'block', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }} />
        )}
        <h2 style={{ margin: '0 0 4px', fontWeight: '800', fontSize: '1.3rem', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
          {trip.name}
        </h2>
        <p style={{ color: 'var(--text-sub)', margin: '0 0 4px', fontSize: '0.9rem', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
          {landName}
        </p>
        <p style={{ color: 'var(--text-sub)', margin: '0 0 18px', fontSize: '0.85rem' }}>
          {trip.datum}
        </p>
        <p style={{ color: 'var(--gold)', margin: '0 0 24px', fontSize: '0.85rem', fontWeight: '600' }}>
          {t('teilnehmerAnzahl')(teilnehmerAnzahl)}
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => currentUser && beitreten(trip, currentUser)}
            disabled={beitretenLaeuft}
            className="btn-press"
            style={{
              flex: 1, backgroundColor: 'var(--gold)', color: '#0a0f1e', border: 'none',
              padding: '14px', minHeight: '48px', borderRadius: '14px', boxSizing: 'border-box',
              cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem',
              opacity: beitretenLaeuft ? 0.6 : 1,
            }}
          >
            {t('beitreten')}
          </button>
          <button onClick={() => navigate('/')} className="btn-press" style={{
            flex: 1, backgroundColor: 'var(--sub)', color: 'var(--text)', border: 'none',
            padding: '14px', minHeight: '48px', borderRadius: '14px', boxSizing: 'border-box',
            cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem',
          }}>
            {t('abbrechen')}
          </button>
        </div>
      </div>

      {/* Verknüpfungs-Modal – Bottom Sheet von unten, identisch zu TripsOverview */}
      {verknuepfungsModal && (
        <div onClick={() => navigate(`/trip/${joinedTripId}`)} style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 9998,
        }}>
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
            <h3 style={{ margin: '0 0 6px', fontWeight: '700', fontSize: '1.2rem' }}>{t('bistDuDabeiTitel')}</h3>
            <p style={{ color: 'var(--text-sub)', margin: '0 0 24px', fontSize: '0.88rem', lineHeight: 1.5 }}>
              {t('namenAuswaehlenUntertitel')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {unverknuepfteTeilnehmer.map(person => {
                const ausgewaehlt = ausgewaehlteTeilnehmer?.id === person.id
                const initiale = person.name?.charAt(0)?.toUpperCase() || '?'
                return (
                  <button
                    key={person.id}
                    onClick={() => setAusgewaehlteTeilnehmer(ausgewaehlt ? null : person)}
                    className="btn-press"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      backgroundColor: ausgewaehlt ? 'rgba(201,168,76,0.08)' : 'var(--sub)',
                      border: ausgewaehlt ? '1.5px solid rgba(201,168,76,0.5)' : '1.5px solid var(--input-border)',
                      borderRadius: '16px', padding: '14px 16px',
                      cursor: 'pointer', textAlign: 'left', width: '100%', boxSizing: 'border-box',
                    }}
                  >
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '50%',
                      backgroundColor: 'var(--gold)', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem', fontWeight: '700', color: '#0a0f1e',
                    }}>
                      {initiale}
                    </div>
                    <span style={{ color: 'var(--text)', fontWeight: '600', fontSize: '0.95rem', flex: 1 }}>{person.name}</span>
                    {ausgewaehlt && <span style={{ color: 'var(--gold)', fontSize: '1.1rem', fontWeight: '700', flexShrink: 0 }}>✓</span>}
                  </button>
                )
              })}
            </div>

            {ausgewaehlteTeilnehmer && (
              <button
                onClick={() => teilnehmerVerknuepfen(ausgewaehlteTeilnehmer)}
                className="btn-press"
                style={{
                  backgroundColor: 'var(--gold)', color: '#0a0f1e', border: 'none',
                  padding: '14px', minHeight: '48px', borderRadius: '14px', boxSizing: 'border-box',
                  cursor: 'pointer', fontWeight: '700', fontSize: '1rem', width: '100%', marginBottom: '10px',
                }}
              >
                {t('bestaetigen')}
              </button>
            )}

            <button
              onClick={() => navigate(`/trip/${joinedTripId}`)}
              className="btn-press"
              style={{
                backgroundColor: 'transparent', color: 'var(--text-sub)',
                border: '1px solid var(--border)',
                padding: '14px', minHeight: '48px', borderRadius: '14px', boxSizing: 'border-box',
                cursor: 'pointer', fontWeight: '500', width: '100%',
              }}
            >
              {t('ichBinKeinervonDenen')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
