import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import { Upload, Trash2, Camera, ChevronLeft, ChevronRight, X, Download, Check } from 'lucide-react'
import usePullToRefresh from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'
import Toast from '../components/Toast'
import useToast from '../hooks/useToast.jsx'
import { useSettings } from '../context/SettingsContext'

export default function TripFotos() {
  const { id } = useParams()
  const { t } = useSettings()
  const { toasts, setToasts, toast } = useToast()
  const [trip, setTrip] = useState(null)
  const [fotos, setFotos] = useState([])
  const [laden, setLaden] = useState(true)
  const [hochladen, setHochladen] = useState(false)
  // Fortschritt des aktuellen Batch-Uploads – "X von Y Fotos hochgeladen..."
  const [uploadFortschritt, setUploadFortschritt] = useState(null)
  // Fotos die gerade hochgeladen werden – mit lokaler Vorschau für den Fortschrittsindikator je Foto
  const [hochladendeFotos, setHochladendeFotos] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  // Auswahl-Modus zum Herunterladen/Löschen mehrerer Fotos
  const [auswahlModus, setAuswahlModus] = useState(false)
  const [ausgewaehlteFotos, setAusgewaehlteFotos] = useState([])
  const [herunterladenLaeuft, setHerunterladenLaeuft] = useState(false)
  const [loescheBestaetigung, setLoescheBestaetigung] = useState(false)

  const fileInputRef = useRef(null)
  const lightboxTouchStartX = useRef(0)

  useEffect(() => {
    const datenLaden = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      const { data: tripData } = await supabase
        .from('trips').select('*').eq('id', id).single()
      setTrip(tripData)
      await fotosLaden()
      setLaden(false)
    }
    datenLaden()
  }, [id])

  async function fotosLaden() {
    const { data: fotoDaten } = await supabase
      .from('trip_photos').select('*').eq('trip_id', id)
      .order('created_at', { ascending: false })
    if (!fotoDaten) return
    const fotosWithUrls = await Promise.all(
      fotoDaten.map(async (foto) => {
        const { data } = await supabase.storage
          .from('trip-photos').createSignedUrl(foto.storage_path, 3600)
        return { ...foto, url: data?.signedUrl }
      })
    )
    setFotos(fotosWithUrls)
  }

  const { ziehen, fortschritt, schwellenwert } = usePullToRefresh(fotosLaden)

  // Body-Scroll sperren solange die Lightbox offen ist – verhindert iOS Safari Scroll-Bugs
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [lightboxIndex])

  const fotoHochladen = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    e.target.value = '' // gleiche Datei erneut auswählbar machen

    setHochladen(true)
    const gesamt = files.length
    setUploadFortschritt({ aktuell: 0, gesamt })

    const neueVorschauen = files.map((file, i) => ({ tempId: `${Date.now()}_${i}_${file.name}`, previewUrl: URL.createObjectURL(file) }))
    setHochladendeFotos(prev => [...prev, ...neueVorschauen])

    let erfolgreich = 0
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const vorschau = neueVorschauen[i]
      const dateiname = `${id}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('trip-photos').upload(dateiname, file)
      if (!uploadError) {
        await supabase.from('trip_photos').insert([{
          trip_id: id, user_id: currentUser.id,
          storage_path: dateiname, caption: '',
        }])
        erfolgreich++
      } else {
        console.error('Upload Fehler:', uploadError)
      }
      URL.revokeObjectURL(vorschau.previewUrl)
      setHochladendeFotos(prev => prev.filter(v => v.tempId !== vorschau.tempId))
      setUploadFortschritt({ aktuell: i + 1, gesamt })
    }

    await fotosLaden()
    setHochladen(false)
    setUploadFortschritt(null)
    if (erfolgreich > 0) toast(t('fotosHochgeladenErfolg')(erfolgreich), 'success')
  }

  // Einzelnes Foto löschen (z.B. aus der Lightbox)
  const fotoLoeschen = async (foto) => {
    await supabase.storage.from('trip-photos').remove([foto.storage_path])
    await supabase.from('trip_photos').delete().eq('id', foto.id)
    setFotos(fotos.filter(f => f.id !== foto.id))
    setLightboxIndex(null)
  }

  // Ein einzelnes Foto herunterladen
  const bildHerunterladen = async (foto) => {
    const { data } = await supabase.storage
      .from('trip-photos')
      .createSignedUrl(foto.storage_path, 60)
    if (!data?.signedUrl) return

    const link = document.createElement('a')
    link.href = data.signedUrl
    link.download = `voyag_${foto.id}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Alle ausgewählten Fotos nacheinander herunterladen
  const alleHerunterladen = async () => {
    const ziel = fotos.filter(f => ausgewaehlteFotos.includes(f.id))
    if (ziel.length === 0) return
    setHerunterladenLaeuft(true)
    for (const foto of ziel) {
      await bildHerunterladen(foto)
      await new Promise(r => setTimeout(r, 500)) // kurze Pause zwischen Downloads
    }
    setHerunterladenLaeuft(false)
  }

  // Foto im Auswahl-Modus an-/abwählen
  const fotoAuswahlToggle = (fotoId) => {
    setAusgewaehlteFotos(prev =>
      prev.includes(fotoId) ? prev.filter(fid => fid !== fotoId) : [...prev, fotoId]
    )
  }

  // Alle Fotos auswählen bzw. Auswahl aufheben
  const alleAuswaehlenToggle = () => {
    if (ausgewaehlteFotos.length === fotos.length) setAusgewaehlteFotos([])
    else setAusgewaehlteFotos(fotos.map(f => f.id))
  }

  const auswahlModusVerlassen = () => {
    setAuswahlModus(false)
    setAusgewaehlteFotos([])
  }

  // Anzahl der ausgewählten Fotos die auch wirklich gelöscht werden dürfen (nur eigene)
  const eigeneAusgewaehlteAnzahl = fotos.filter(
    f => ausgewaehlteFotos.includes(f.id) && f.user_id === currentUser?.id
  ).length

  // Ausgewählte (eigene) Fotos endgültig löschen
  const ausgewaehlteLoeschen = async () => {
    const zuLoeschen = fotos.filter(f => ausgewaehlteFotos.includes(f.id) && f.user_id === currentUser?.id)
    for (const foto of zuLoeschen) {
      await supabase.storage.from('trip-photos').remove([foto.storage_path])
      await supabase.from('trip_photos').delete().eq('id', foto.id)
    }
    setFotos(prev => prev.filter(f => !zuLoeschen.some(z => z.id === f.id)))
    setLoescheBestaetigung(false)
    auswahlModusVerlassen()
  }

  const naechstesFoto = () => setLightboxIndex((lightboxIndex + 1) % fotos.length)
  const vorherigesFoto = () => setLightboxIndex((lightboxIndex - 1 + fotos.length) % fotos.length)

  // Wischgeste in der Lightbox – nach links/rechts für nächstes/vorheriges Foto
  const handleLightboxTouchStart = (e) => {
    lightboxTouchStartX.current = e.touches[0].clientX
  }
  const handleLightboxTouchEnd = (e) => {
    const delta = e.changedTouches[0].clientX - lightboxTouchStartX.current
    if (delta > 50) vorherigesFoto()
    else if (delta < -50) naechstesFoto()
  }

  useEffect(() => {
    const handleKey = (e) => {
      if (lightboxIndex === null) return
      if (e.key === 'ArrowRight') naechstesFoto()
      if (e.key === 'ArrowLeft') vorherigesFoto()
      if (e.key === 'Escape') setLightboxIndex(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxIndex, fotos.length])

  if (laden) return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginTop: '20px' }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="skeleton" style={{ aspectRatio: '1', borderRadius: '12px' }} />
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ paddingBottom: 'calc(110px + env(safe-area-inset-bottom))' }}>
      <PullToRefreshIndicator ziehen={ziehen} fortschritt={fortschritt} schwellenwert={schwellenwert} />
      <TripNav tripName={trip.name} />

      <div style={{ padding: '0 clamp(14px, 4vw, 20px)', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Header + Upload/Auswählen */}
        <div className="fade-in-1" style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap',
            alignItems: 'center', gap: '10px',
          }}>
            <div>
              <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.3rem', letterSpacing: '-0.5px' }}>
                {auswahlModus ? t('ausgewaehltAnzahl')(ausgewaehlteFotos.length) : t('navFotos')}
              </h2>
              {!auswahlModus && (
                <p style={{ color: 'var(--text-sub)', fontSize: '0.82rem', margin: '2px 0 0' }}>
                  {t('fotosAnzahlAlbum')(fotos.length)}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {auswahlModus ? (
                <button onClick={auswahlModusVerlassen} className="btn-press" style={sekundaerButtonStyle}>
                  {t('fertig')}
                </button>
              ) : (
                <>
                  {fotos.length > 0 && (
                    <button onClick={() => setAuswahlModus(true)} className="btn-press" style={sekundaerButtonStyle}>
                      {t('auswaehlen')}
                    </button>
                  )}

                  {/* Ein einziger Upload-Button – kein Kamera-Zwang, Browser bietet Kamera/Galerie selbst an */}
                  <input
                    type="file" accept="image/*" multiple
                    ref={fileInputRef} onChange={fotoHochladen}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current.click()}
                    disabled={hochladen}
                    className="btn-press"
                    style={primaerButtonStyle(hochladen)}
                  >
                    {hochladen ? (
                      <>⏳ {t('laedt')}</>
                    ) : (
                      <><Upload size={16} /> {t('fotosHochladenBtn')}</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Upload-Fortschritt */}
          {hochladen && uploadFortschritt && (
            <p style={{ color: 'var(--text-sub)', fontSize: '0.8rem', margin: '8px 0 0' }}>
              {t('fotosHochladenFortschritt')(uploadFortschritt.aktuell, uploadFortschritt.gesamt)}
            </p>
          )}
        </div>

        {/* Leerer Zustand */}
        {fotos.length === 0 && hochladendeFotos.length === 0 ? (
          <div className="fade-in-2" style={{
            backgroundColor: 'var(--card)', borderRadius: '24px',
            boxShadow: 'var(--shadow)',
            padding: '60px 20px', textAlign: 'center',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px',
              backgroundColor: 'rgba(201,168,76,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Camera size={32} color="var(--gold)" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontWeight: '700', fontSize: '1.1rem' }}>
              {t('keineFotos')}
            </h3>
            <p style={{ color: 'var(--text-sub)', margin: '0 0 24px', fontSize: '0.9rem' }}>
              {t('haltetMomenteFest')}
            </p>
            <button
              onClick={() => fileInputRef.current.click()}
              className="btn-press"
              style={{
                backgroundColor: 'var(--gold)', color: '#0a0f1e', border: 'none',
                padding: '0 24px', minHeight: '44px', boxSizing: 'border-box', borderRadius: '14px', cursor: 'pointer',
                fontWeight: '700', fontSize: '0.95rem',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}
            >
              <Upload size={18} /> {t('erstesFotoHochladen')}
            </button>
          </div>
        ) : (
          // Foto Grid – 3 spaltig mit abgerundeten Ecken
          <div className="fade-in-2" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
          }}>
            {/* Fotos die gerade hochgeladen werden – mit Fortschrittsindikator */}
            {hochladendeFotos.map(vorschau => (
              <div key={vorschau.tempId} style={{
                position: 'relative', borderRadius: '12px',
                overflow: 'hidden', aspectRatio: '1',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}>
                <img
                  src={vorschau.previewUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.5 }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    border: '2.5px solid rgba(201,168,76,0.3)',
                    borderTopColor: 'var(--gold)',
                    animation: 'pullSpin 0.7s linear infinite',
                  }} />
                </div>
              </div>
            ))}

            {fotos.map((foto, index) => {
              const istAusgewaehlt = ausgewaehlteFotos.includes(foto.id)
              return (
                <div
                  key={foto.id}
                  onClick={() => auswahlModus ? fotoAuswahlToggle(foto.id) : setLightboxIndex(index)}
                  style={{
                    position: 'relative', borderRadius: '12px',
                    overflow: 'hidden', cursor: 'pointer',
                    aspectRatio: '1',
                    boxShadow: istAusgewaehlt ? '0 0 0 3px var(--gold)' : '0 2px 8px rgba(0,0,0,0.3)',
                    transition: 'box-shadow 0.15s ease',
                  }}
                >
                  <img
                    src={foto.url}
                    alt="Reisefoto"
                    style={{
                      width: '100%', height: '100%',
                      objectFit: 'cover', display: 'block',
                      transition: 'transform 0.2s ease',
                    }}
                  />

                  {/* Auswahl-Kreis oben links */}
                  {auswahlModus && (
                    <div style={{
                      position: 'absolute', top: '6px', left: '6px',
                      width: '24px', height: '24px', borderRadius: '50%',
                      backgroundColor: istAusgewaehlt ? 'var(--gold)' : 'rgba(0,0,0,0.45)',
                      border: istAusgewaehlt ? 'none' : '1.5px solid rgba(255,255,255,0.75)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxSizing: 'border-box',
                    }}>
                      {istAusgewaehlt && <Check size={13} color="#0a0f1e" strokeWidth={3} />}
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)',
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                  }} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Action-Bar im Auswahl-Modus – fixed über der BottomNav */}
      {auswahlModus && (
        <div className="fade-in" style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '560px',
          backgroundColor: 'var(--card)',
          borderRadius: '20px',
          padding: '12px 16px',
          display: 'flex',
          gap: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          zIndex: 90,
          boxSizing: 'border-box',
        }}>
          <button onClick={alleAuswaehlenToggle} className="btn-press" style={{
            backgroundColor: 'var(--sub)', color: 'var(--text)', border: 'none',
            borderRadius: '12px', padding: '0 14px', minHeight: '44px', boxSizing: 'border-box',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {fotos.length > 0 && ausgewaehlteFotos.length === fotos.length ? t('alleAbwaehlen') : t('alleAuswaehlen')}
          </button>

          <button
            onClick={alleHerunterladen}
            disabled={ausgewaehlteFotos.length === 0 || herunterladenLaeuft}
            className="btn-press"
            style={{
              flex: 1, backgroundColor: 'var(--gold)', color: '#0a0f1e', border: 'none',
              borderRadius: '12px', minHeight: '44px', boxSizing: 'border-box',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              opacity: (ausgewaehlteFotos.length === 0 || herunterladenLaeuft) ? 0.5 : 1,
              minWidth: 0,
            }}
          >
            <Download size={15} /> {t('herunterladenAnzahl')(ausgewaehlteFotos.length)}
          </button>

          <button
            onClick={() => setLoescheBestaetigung(true)}
            disabled={eigeneAusgewaehlteAnzahl === 0}
            className="btn-press"
            style={{
              backgroundColor: 'rgba(233,69,96,0.1)', color: 'var(--error)', border: 'none',
              borderRadius: '12px', width: '44px', height: '44px', boxSizing: 'border-box',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: eigeneAusgewaehlteAnzahl === 0 ? 0.4 : 1, flexShrink: 0,
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* Bestätigung vor dem Löschen mehrerer Fotos */}
      {loescheBestaetigung && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="fade-in" style={{
            backgroundColor: 'var(--card)', borderRadius: '24px 24px 0 0',
            padding: '32px 24px calc(48px + env(safe-area-inset-bottom))',
            width: '100%', maxWidth: '600px', boxSizing: 'border-box',
          }}>
            <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--sub)', borderRadius: '2px', margin: '0 auto 24px' }} />
            <h3 style={{ margin: '0 0 8px', fontWeight: '700', fontSize: '1.2rem' }}>
              {t('fotosLoeschenTitel')}
            </h3>
            <p style={{ color: 'var(--text-sub)', margin: '0 0 28px', fontSize: '0.95rem', lineHeight: 1.5 }}>
              {t('fotosLoeschenText')(eigeneAusgewaehlteAnzahl)}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={ausgewaehlteLoeschen} className="btn-press" style={{
                backgroundColor: '#e94560', color: '#fff', border: 'none',
                padding: '14px', borderRadius: '14px', cursor: 'pointer',
                flex: 1, fontWeight: '700', fontSize: '1rem',
              }}>
                {t('loeschen')}
              </button>
              <button onClick={() => setLoescheBestaetigung(false)} className="btn-press" style={{
                backgroundColor: 'var(--sub)', color: 'var(--text)', border: 'none',
                padding: '14px', borderRadius: '14px', cursor: 'pointer', flex: 1, fontWeight: '600',
              }}>
                {t('abbrechen')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox – iOS-sicher: fixed mit expliziten Kanten, 100dvh statt 100vh */}
      {lightboxIndex !== null && (
        <div
          onTouchStart={handleLightboxTouchStart}
          onTouchEnd={handleLightboxTouchEnd}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            height: '100dvh',
            backgroundColor: 'rgba(0,0,0,0.97)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            boxSizing: 'border-box',
            zIndex: 1000,
          }}
        >
          {/* Top Bar – mit Safe-Area-Abstand für die Notch */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            padding: 'calc(16px + env(safe-area-inset-top)) 20px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            zIndex: 1001, boxSizing: 'border-box',
          }}>
            {/* Herunterladen + Löschen (nur eigene Fotos) */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => bildHerunterladen(fotos[lightboxIndex])} style={{
                backgroundColor: 'rgba(255,255,255,0.08)', border: 'none',
                color: 'var(--text)', borderRadius: '12px', width: '44px', height: '44px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}>
                <Download size={16} />
              </button>
              {fotos[lightboxIndex]?.user_id === currentUser?.id && (
                <button onClick={() => fotoLoeschen(fotos[lightboxIndex])} style={{
                  backgroundColor: 'rgba(233,69,96,0.15)', border: '1px solid rgba(233,69,96,0.3)',
                  color: '#e94560', borderRadius: '12px', width: '44px', height: '44px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Zähler */}
            <span style={{
              color: 'var(--text-sub)', fontSize: '0.85rem', fontWeight: '600',
              backgroundColor: 'rgba(255,255,255,0.05)',
              padding: '6px 14px', borderRadius: '20px',
            }}>
              {lightboxIndex + 1} / {fotos.length}
            </span>

            {/* Schließen */}
            <button onClick={() => setLightboxIndex(null)} style={{
              backgroundColor: 'rgba(255,255,255,0.08)', border: 'none',
              color: 'var(--text)', borderRadius: '12px', width: '44px', height: '44px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}>
              <X size={20} />
            </button>
          </div>

          {/* Vorheriges Foto */}
          {fotos.length > 1 && (
            <button onClick={vorherigesFoto} style={{
              position: 'absolute', left: '16px',
              backgroundColor: 'rgba(255,255,255,0.08)', border: 'none',
              color: 'var(--text)', borderRadius: '50%', width: '48px', height: '48px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 1001,
            }}>
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Foto – maxHeight lässt Platz für Top Bar */}
          <img
            src={fotos[lightboxIndex]?.url}
            alt="Reisefoto"
            style={{
              maxWidth: '92vw', maxHeight: 'calc(100dvh - 120px)',
              objectFit: 'contain', borderRadius: '12px',
            }}
          />

          {/* Nächstes Foto */}
          {fotos.length > 1 && (
            <button onClick={naechstesFoto} style={{
              position: 'absolute', right: '16px',
              backgroundColor: 'rgba(255,255,255,0.08)', border: 'none',
              color: 'var(--text)', borderRadius: '50%', width: '48px', height: '48px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 1001,
            }}>
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      )}

      <Toast toasts={toasts} setToasts={setToasts} />
    </div>
  )
}

// ── Style Objekte ──

const sekundaerButtonStyle = {
  backgroundColor: 'rgba(201,168,76,0.1)', color: 'var(--gold)',
  border: '1px solid rgba(201,168,76,0.3)',
  padding: '0 14px', minHeight: '44px', boxSizing: 'border-box',
  borderRadius: '14px', cursor: 'pointer',
  fontWeight: '700', fontSize: '0.85rem',
  display: 'flex', alignItems: 'center', gap: '6px',
}

const primaerButtonStyle = (deaktiviert) => ({
  backgroundColor: deaktiviert ? 'var(--sub)' : 'var(--gold)',
  color: deaktiviert ? 'var(--text-sub)' : '#0a0f1e',
  border: 'none', padding: '0 16px', minHeight: '44px', boxSizing: 'border-box',
  borderRadius: '14px', cursor: 'pointer',
  fontWeight: '700', fontSize: '0.85rem',
  display: 'flex', alignItems: 'center', gap: '6px',
  transition: 'all 0.2s ease',
})
