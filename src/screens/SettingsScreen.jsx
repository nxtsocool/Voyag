import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { User, Lock, Trash2, LogOut, Mail, ChevronRight, Globe, Palette, DollarSign, Info } from 'lucide-react'
import { useSettings } from '../context/useSettings'
import useBodyScrollLock from '../hooks/useBodyScrollLock'
import { WAEHRUNGEN } from '../data/waehrungen'
import Toast from '../components/Toast'
import useToast from '../hooks/useToast.jsx'

export default function SettingsScreen() {
  const [user, setUser] = useState(null)
  // Nur Profilfelder ohne eigenes Context-Gegenstück – Währung/Sprache/Design
  // kommen direkt aus useSettings(), damit hier keine veraltete Kopie mehr
  // existiert, die beim Speichern versehentlich das aktuelle Design überschreibt
  const [profile, setProfile] = useState({ name: '', bio: '' })
  const [laden, setLaden] = useState(true)
  const [profilBearbeiten, setProfilBearbeiten] = useState(false)
  const [passwortDaten, setPasswortDaten] = useState({ neu: '', bestaetigung: '' })
  const [passwortOffen, setPasswortOffen] = useState(false)
  const [loeschenOffen, setLoeschenOffen] = useState(false)
  const [loeschenBestaetigungstext, setLoeschenBestaetigungstext] = useState('')
  const [accountLoeschenLaeuft, setAccountLoeschenLaeuft] = useState(false)
  const [appInfoOffen, setAppInfoOffen] = useState(false)
  const { toasts, setToasts, toast } = useToast()
  const {
    waehrungISO, setWaehrung: setGlobalWaehrung,
    sprache, setSprache: setGlobalSprache,
    design, setDesign: setGlobalDesign,
    t,
  } = useSettings()
  useBodyScrollLock(loeschenOffen)

  useEffect(() => {
    const laden = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      const { data } = await supabase
        .from('profiles').select('name, bio').eq('id', user.id).single()
      if (data) setProfile({ name: data.name || '', bio: data.bio || '' })
      setLaden(false)
    }
    laden()
  }, [])

  const profilSpeichern = async () => {
    const { error } = await supabase.from('profiles')
      .update({ name: profile.name, bio: profile.bio })
      .eq('id', user.id)
    if (error) { console.error('Fehler:', error); toast(t('verbindungsfehler'), 'error'); return }
    toast(t('profilGespeichert'), 'success')
    setProfilBearbeiten(false)
  }

  // Einstellung direkt speichern ohne Formular – nur das geänderte Feld wird
  // in der DB aktualisiert, nicht der komplette Datensatz
  const einstellungSpeichern = async (key, value) => {
    if (key === 'waehrung') setGlobalWaehrung(value)
    if (key === 'sprache') setGlobalSprache(value)
    if (key === 'design') setGlobalDesign(value)

    const { error } = await supabase.from('profiles').update({ [key]: value }).eq('id', user.id)
    if (error) { console.error('Fehler:', error); toast(t('verbindungsfehler'), 'error'); return }
    toast(t('gespeichertHaken'), 'success')
  }

  const passwortZuruecksetzen = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: window.location.origin,
    })
    if (error) { console.error('Fehler:', error); toast(t('verbindungsfehler'), 'error'); return }
    toast(t('emailZumZuruecksetzenGesendet'), 'success')
    setPasswortOffen(false)
  }

  const passwortAendern = async () => {
    if (!passwortDaten.neu || passwortDaten.neu !== passwortDaten.bestaetigung) {
      toast(t('passwoerterStimmenNichtUeberein'), 'error')
      return
    }
    if (passwortDaten.neu.length < 6) {
      toast(t('passwortMindestens6Zeichen'), 'error')
      return
    }
    const { error } = await supabase.auth.updateUser({ password: passwortDaten.neu })
    if (error) { console.error('Fehler:', error); toast(t('verbindungsfehler'), 'error'); return }
    toast(t('passwortGeaendert'), 'success')
    setPasswortOffen(false)
    setPasswortDaten({ neu: '', bestaetigung: '' })
  }

  // Konto löschen (W14) – Client ruft nur noch die eine SQL-Funktion auf
  // (siehe Migration Phase 0), die Transaktion, Reise-Übertragung an ein
  // verbleibendes Mitglied und das Löschen des Auth-Users übernimmt
  const accountLoeschen = async () => {
    if (accountLoeschenLaeuft) return
    if (loeschenBestaetigungstext.trim().toUpperCase() !== t('loeschenBestaetigungswort')) return

    setAccountLoeschenLaeuft(true)
    const { error } = await supabase.rpc('delete_own_account')
    if (error) {
      console.error('Fehler:', error)
      toast(t('verbindungsfehler'), 'error')
      setAccountLoeschenLaeuft(false)
      return
    }
    await supabase.auth.signOut()
  }

  const ausloggen = async () => await supabase.auth.signOut()

  if (laden) return (
    <div style={{ padding: '24px', paddingTop: 'calc(24px + env(safe-area-inset-top))', maxWidth: '600px', margin: '0 auto' }}>
      {[1,2,3].map(i => (
        <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '20px', marginBottom: '12px' }} />
      ))}
    </div>
  )

  const initialen = profile.name
    ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase()

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: 'calc(120px + env(safe-area-inset-bottom))' }}>

      {/* Header mit Avatar */}
      <div className="fade-in-1" style={{
        padding: 'calc(32px + env(safe-area-inset-top)) 20px 24px',
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '20px',
          background: 'linear-gradient(135deg, var(--gold), #8a6f2e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', fontWeight: '800', color: '#0a0f1e', flexShrink: 0,
        }}>
          {initialen}
        </div>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 2px', letterSpacing: '-0.5px' }}>
            {profile.name || t('keinName')}
          </h1>
          <p style={{ color: 'var(--text-sub)', fontSize: '0.85rem', margin: 0 }}>{user.email}</p>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>

        {/* Profil Karte */}
        <div className="fade-in-2" style={karteStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: profilBearbeiten ? '16px' : '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={iconWrapperStyle}><User size={16} color="var(--gold)" /></div>
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1rem' }}>{t('profilTitel')}</h3>
            </div>
            <button onClick={() => setProfilBearbeiten(!profilBearbeiten)} className="btn-press" style={editButtonStyle}>
              {profilBearbeiten ? t('abbrechen') : t('bearbeiten')}
            </button>
          </div>

          {profilBearbeiten ? (
            <div style={{ marginTop: '16px' }}>
              <input placeholder={t('deinNamePlatzhalter')} value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                style={inputStyle} />
              <textarea placeholder={t('kurzeBioPlatzhalter')} value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              <button onClick={profilSpeichern} className="btn-press" style={speichernButtonStyle}>
                {t('speichern')}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '16px' }}>
              <div style={infoZeileStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={14} color="var(--text-sub)" />
                  <span style={{ color: 'var(--text-sub)', fontSize: '0.85rem' }}>{t('email')}</span>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{user.email}</span>
              </div>
              {profile.name && (
                <div style={infoZeileStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={14} color="var(--text-sub)" />
                    <span style={{ color: 'var(--text-sub)', fontSize: '0.85rem' }}>{t('name')}</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{profile.name}</span>
                </div>
              )}
              {profile.bio && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--sub)', borderRadius: '12px' }}>
                  <p style={{ color: 'var(--text-sub)', fontSize: '0.75rem', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('bioLabel')}</p>
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{profile.bio}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Passwort Karte */}
        <div className="fade-in-2" style={karteStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={iconWrapperStyle}><Lock size={16} color="var(--gold)" /></div>
              <div>
                <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1rem' }}>{t('passwortTitel')}</h3>
                {!passwortOffen && (
                  <p style={{ color: 'var(--text-sub)', fontSize: '0.8rem', margin: '2px 0 0' }}>{t('direktAendernOderEmail')}</p>
                )}
              </div>
            </div>
            <button onClick={() => setPasswortOffen(!passwortOffen)} className="btn-press" style={editButtonStyle}>
              {passwortOffen ? t('abbrechen') : t('aendern')}
            </button>
          </div>
          {passwortOffen && (
            <div style={{ marginTop: '16px' }}>
              <input placeholder={t('neuesPasswortPlatzhalter')} type="password"
                value={passwortDaten.neu}
                onChange={(e) => setPasswortDaten({ ...passwortDaten, neu: e.target.value })}
                style={inputStyle} />
              <input placeholder={t('passwortBestaetigenPlatzhalter')} type="password"
                value={passwortDaten.bestaetigung}
                onChange={(e) => setPasswortDaten({ ...passwortDaten, bestaetigung: e.target.value })}
                style={inputStyle} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={passwortAendern} className="btn-press" style={speichernButtonStyle}>{t('speichern')}</button>
                <button onClick={passwortZuruecksetzen} className="btn-press" style={{
                  ...speichernButtonStyle, backgroundColor: 'transparent',
                  border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)',
                }}>{t('perEmail')}</button>
              </div>
            </div>
          )}
        </div>

        {/* Präferenzen */}
        <div className="fade-in-3" style={karteStyle}>
          <h3 style={{ margin: '0 0 16px', fontWeight: '700', fontSize: '1rem' }}>{t('praeferenzenTitel')}</h3>

          {/* Währung */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={iconWrapperStyle}><DollarSign size={16} color="var(--gold)" /></div>
              <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{t('waehrungLabel')}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {WAEHRUNGEN.map(w => (
                <button key={w.iso} onClick={() => einstellungSpeichern('waehrung', w.iso)}
                  className="btn-press" style={{
                    padding: '0 14px', minHeight: '44px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '12px', cursor: 'pointer',
                    fontWeight: '600', fontSize: '0.85rem', border: 'none',
                    backgroundColor: waehrungISO === w.iso ? 'var(--gold)' : 'var(--sub)',
                    color: waehrungISO === w.iso ? '#0a0f1e' : 'var(--text-sub)',
                  }}>
                  {w.symbol} <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>{w.iso}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sprache */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={iconWrapperStyle}><Globe size={16} color="var(--gold)" /></div>
              <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{t('spracheLabel')}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[{ code: 'de', label: 'Deutsch' }, { code: 'en', label: 'English' }].map(s => (
                <button key={s.code} onClick={() => einstellungSpeichern('sprache', s.code)}
                  className="btn-press" style={{
                    padding: '0 16px', minHeight: '44px', display: 'flex', alignItems: 'center', borderRadius: '12px', cursor: 'pointer',
                    fontWeight: '600', fontSize: '0.9rem', border: 'none',
                    backgroundColor: sprache === s.code ? 'var(--gold)' : 'var(--sub)',
                    color: sprache === s.code ? '#0a0f1e' : 'var(--text-sub)',
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Design */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={iconWrapperStyle}><Palette size={16} color="var(--gold)" /></div>
              <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{t('designLabel')}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[{ code: 'dark', labelKey: 'darkLabel' }, { code: 'light', labelKey: 'lightLabel' }].map(d => (
                <button key={d.code} onClick={() => einstellungSpeichern('design', d.code)}
                  className="btn-press" style={{
                    padding: '0 16px', minHeight: '44px', display: 'flex', alignItems: 'center', borderRadius: '12px', cursor: 'pointer',
                    fontWeight: '600', fontSize: '0.9rem', border: 'none',
                    backgroundColor: design === d.code ? 'var(--gold)' : 'var(--sub)',
                    color: design === d.code ? '#0a0f1e' : 'var(--text-sub)',
                  }}>
                  {t(d.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="fade-in-3" style={karteStyle}>
          <button
            onClick={() => setAppInfoOffen(!appInfoOffen)}
            className="btn-press"
            style={{
              width: '100%', background: 'none', border: 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer', padding: 0, minHeight: '44px', boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={iconWrapperStyle}><Info size={16} color="var(--gold)" /></div>
              <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1rem', color: 'var(--text)' }}>{t('appInfoTitel')}</h3>
            </div>
            <ChevronRight size={16} color="var(--text-sub)" style={{
              transform: appInfoOffen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }} />
          </button>

          {appInfoOffen && (
            <div style={{ marginTop: '16px' }}>
              <div style={infoZeileStyle}>
                <span style={{ color: 'var(--text-sub)', fontSize: '0.85rem' }}>{t('versionLabel')}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--gold)' }}>V0.9.3</span>
              </div>
              <div style={infoZeileStyle}>
                <span style={{ color: 'var(--text-sub)', fontSize: '0.85rem' }}>{t('entwicklerLabel')}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Georg Kummert</span>
              </div>
              <div style={{ ...infoZeileStyle, borderBottom: 'none' }}>
                <span style={{ color: 'var(--text-sub)', fontSize: '0.85rem' }}>{t('madeWithLabel')}</span>
                <span style={{ fontSize: '0.85rem' }}> React + Supabase</span>
              </div>
            </div>
          )}
        </div>

        {/* Ausloggen */}
        <button onClick={ausloggen} className="btn-press fade-in-4" style={{
          width: '100%', padding: '16px', marginBottom: '10px',
          backgroundColor: 'var(--card)', border: 'none', borderRadius: '16px',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ ...iconWrapperStyle, backgroundColor: 'rgba(136,146,164,0.1)' }}>
              <LogOut size={16} color="var(--text-sub)" />
            </div>
            <span style={{ color: 'var(--text-sub)', fontWeight: '600', fontSize: '0.95rem' }}>{t('ausloggen')}</span>
          </div>
          <ChevronRight size={16} color="var(--text-sub)" />
        </button>

        {/* Account löschen */}
        {!loeschenOffen ? (
          <button onClick={() => setLoeschenOffen(true)} className="btn-press fade-in-5" style={{
            width: '100%', padding: '16px',
            backgroundColor: 'rgba(233,69,96,0.06)',
            border: '1px solid rgba(233,69,96,0.15)',
            borderRadius: '16px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ ...iconWrapperStyle, backgroundColor: 'rgba(233,69,96,0.1)' }}>
                <Trash2 size={16} color="#e94560" />
              </div>
              <span style={{ color: '#e94560', fontWeight: '600', fontSize: '0.95rem' }}>{t('accountLoeschenBtn')}</span>
            </div>
            <ChevronRight size={16} color="#e94560" />
          </button>
        ) : (
          <div onClick={() => { setLoeschenOffen(false); setLoeschenBestaetigungstext('') }} style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 9998,
          }}>
            <div onClick={(e) => e.stopPropagation()} className="fade-in" style={{
              backgroundColor: 'var(--card)', borderRadius: '24px 24px 0 0',
              width: '100%', maxWidth: '600px',
              maxHeight: 'calc(100dvh - env(safe-area-inset-top) - 24px)', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box',
              padding: '24px 20px calc(32px + env(safe-area-inset-bottom))',
              zIndex: 9999,
            }}>
              <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--sub)', borderRadius: '2px', margin: '0 auto 24px' }} />
              <h3 style={{ margin: '0 0 8px', fontWeight: '800', fontSize: '1.3rem' }}>{t('accountLoeschenTitel')}</h3>
              <p style={{ color: 'var(--text-sub)', margin: '0 0 12px', fontSize: '0.95rem', lineHeight: 1.6 }}>
                {t('accountLoeschenTextVor')} <span style={{ color: 'var(--text)', fontWeight: '600' }}>{t('unwiderruflich')}</span> {t('accountLoeschenTextNach')}
              </p>
              <p style={{ color: 'var(--text-sub)', margin: '0 0 20px', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {t('accountLoeschenGeteilteReisenText')}
              </p>
              <p style={{ color: 'var(--text-sub)', margin: '0 0 8px', fontSize: '0.85rem' }}>
                {t('loeschenBestaetigungAufforderung')(t('loeschenBestaetigungswort'))}
              </p>
              <input
                value={loeschenBestaetigungstext}
                onChange={(e) => setLoeschenBestaetigungstext(e.target.value)}
                placeholder={t('loeschenBestaetigungswort')}
                style={{ ...inputStyle, marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={accountLoeschen}
                  disabled={accountLoeschenLaeuft || loeschenBestaetigungstext.trim().toUpperCase() !== t('loeschenBestaetigungswort')}
                  className="btn-press"
                  style={{
                    backgroundColor: '#e94560', color: '#fff', border: 'none',
                    padding: '14px', minHeight: '44px', boxSizing: 'border-box', borderRadius: '14px', cursor: 'pointer',
                    flex: 1, fontWeight: '700', fontSize: '1rem',
                    opacity: accountLoeschenLaeuft || loeschenBestaetigungstext.trim().toUpperCase() !== t('loeschenBestaetigungswort') ? 0.5 : 1,
                  }}
                >
                  {accountLoeschenLaeuft ? t('wirdGespeichert') : t('jaLoeschen')}
                </button>
                <button onClick={() => { setLoeschenOffen(false); setLoeschenBestaetigungstext('') }} className="btn-press" style={{
                  backgroundColor: 'var(--sub)', color: 'var(--text)', border: 'none',
                  padding: '14px', minHeight: '44px', boxSizing: 'border-box', borderRadius: '14px', cursor: 'pointer', flex: 1, fontWeight: '600',
                }}>{t('abbrechen')}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Toast toasts={toasts} setToasts={setToasts} />
    </div>
  )
}

const karteStyle = {
  backgroundColor: 'var(--card)', borderRadius: '20px',
  boxShadow: 'var(--shadow)',
  padding: '20px', marginBottom: '12px',
}

const inputStyle = {
  width: '100%', padding: '13px 14px', backgroundColor: 'var(--input-bg)',
  border: '1.5px solid var(--input-border)', borderRadius: '12px',
  color: 'var(--text)', fontSize: '1rem', marginBottom: '10px', boxSizing: 'border-box',
}

const editButtonStyle = {
  backgroundColor: 'rgba(201,168,76,0.1)', border: 'none',
  color: 'var(--gold)', padding: '0 14px', minHeight: '44px', borderRadius: '10px',
  display: 'flex', alignItems: 'center', flexShrink: 0,
  cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700',
}

const speichernButtonStyle = {
  backgroundColor: 'var(--gold)', color: '#0a0f1e', border: 'none',
  padding: '13px', borderRadius: '12px', cursor: 'pointer',
  flex: 1, fontWeight: '700', fontSize: '1rem',
}

const iconWrapperStyle = {
  width: '32px', height: '32px', borderRadius: '10px',
  backgroundColor: 'rgba(201,168,76,0.1)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}

const infoZeileStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '10px 0', borderBottom: '1px solid var(--sub)',
}
