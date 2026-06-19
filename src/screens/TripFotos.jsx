import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import { Upload, Trash2, Image, ChevronLeft, ChevronRight, X, Camera } from 'lucide-react'

export default function TripFotos() {
  const { id } = useParams()
  const [trip, setTrip] = useState(null)
  const [fotos, setFotos] = useState([])
  const [laden, setLaden] = useState(true)
  const [hochladen, setHochladen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const fileInputRef = useRef(null)

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

  const fotosLaden = async () => {
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

  const fotoHochladen = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setHochladen(true)
    for (const file of files) {
      const dateiname = `${id}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('trip-photos').upload(dateiname, file)
      if (uploadError) { console.error('Upload Fehler:', uploadError); continue }
      await supabase.from('trip_photos').insert([{
        trip_id: id, user_id: currentUser.id,
        storage_path: dateiname, caption: '',
      }])
    }
    await fotosLaden()
    setHochladen(false)
  }

  const fotoLoeschen = async (foto) => {
    await supabase.storage.from('trip-photos').remove([foto.storage_path])
    await supabase.from('trip_photos').delete().eq('id', foto.id)
    setFotos(fotos.filter(f => f.id !== foto.id))
    setLightboxIndex(null)
  }

  const naechstesFoto = () => setLightboxIndex((lightboxIndex + 1) % fotos.length)
  const vorherigesFoto = () => setLightboxIndex((lightboxIndex - 1 + fotos.length) % fotos.length)

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
      <TripNav tripName={trip.name} />

      <div style={{ padding: '0 clamp(14px, 4vw, 20px)', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Header + Upload */}
        <div className="fade-in-1" style={{
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap',
          alignItems: 'center', marginBottom: '16px', gap: '10px',
        }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.3rem', letterSpacing: '-0.5px' }}>
              Fotos
            </h2>
            <p style={{ color: '#8892a4', fontSize: '0.82rem', margin: '2px 0 0' }}>
              {fotos.length} {fotos.length === 1 ? 'Foto' : 'Fotos'} im Album
            </p>
          </div>
          <div>
            <input
              type="file" accept="image/*" multiple
              ref={fileInputRef} onChange={fotoHochladen}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={hochladen}
              className="btn-press"
              style={{
                backgroundColor: hochladen ? '#1a2235' : '#c9a84c',
                color: hochladen ? '#8892a4' : '#0a0f1e',
                border: 'none', padding: '0 16px', minHeight: '44px', boxSizing: 'border-box',
                borderRadius: '14px', cursor: 'pointer',
                fontWeight: '700', fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.2s ease',
              }}
            >
              {hochladen ? (
                <>⏳ Lädt...</>
              ) : (
                <><Upload size={16} /> Hochladen</>
              )}
            </button>
          </div>
        </div>

        {/* Leerer Zustand */}
        {fotos.length === 0 ? (
          <div className="fade-in-2" style={{
            backgroundColor: '#111827', borderRadius: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            padding: '60px 20px', textAlign: 'center',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px',
              backgroundColor: 'rgba(201,168,76,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Camera size={32} color="#c9a84c" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontWeight: '700', fontSize: '1.1rem' }}>
              Noch keine Fotos
            </h3>
            <p style={{ color: '#8892a4', margin: '0 0 24px', fontSize: '0.9rem' }}>
              Haltet eure Reisemomente fest!
            </p>
            <button
              onClick={() => fileInputRef.current.click()}
              className="btn-press"
              style={{
                backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
                padding: '0 24px', minHeight: '44px', boxSizing: 'border-box', borderRadius: '14px', cursor: 'pointer',
                fontWeight: '700', fontSize: '0.95rem',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}
            >
              <Upload size={18} /> Erstes Foto hochladen
            </button>
          </div>
        ) : (
          // Foto Grid – 3 spaltig mit abgerundeten Ecken
          <div className="fade-in-2" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
          }}>
            {fotos.map((foto, index) => (
              <div
                key={foto.id}
                onClick={() => setLightboxIndex(index)}
                style={{
                  position: 'relative', borderRadius: '12px',
                  overflow: 'hidden', cursor: 'pointer',
                  aspectRatio: '1',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
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
                {/* Hover Overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)',
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.97)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          {/* Top Bar – mit Safe-Area-Abstand für die Notch */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            padding: 'calc(16px + env(safe-area-inset-top)) 20px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            zIndex: 1001, boxSizing: 'border-box',
          }}>
            {/* Löschen – nur eigene Fotos */}
            {fotos[lightboxIndex]?.user_id === currentUser?.id ? (
              <button onClick={() => fotoLoeschen(fotos[lightboxIndex])} style={{
                backgroundColor: 'rgba(233,69,96,0.15)', border: '1px solid rgba(233,69,96,0.3)',
                color: '#e94560', borderRadius: '12px', width: '44px', height: '44px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}>
                <Trash2 size={16} />
              </button>
            ) : <div />}

            {/* Zähler */}
            <span style={{
              color: '#8892a4', fontSize: '0.85rem', fontWeight: '600',
              backgroundColor: 'rgba(255,255,255,0.05)',
              padding: '6px 14px', borderRadius: '20px',
            }}>
              {lightboxIndex + 1} / {fotos.length}
            </span>

            {/* Schließen */}
            <button onClick={() => setLightboxIndex(null)} style={{
              backgroundColor: 'rgba(255,255,255,0.08)', border: 'none',
              color: '#fff', borderRadius: '12px', width: '44px', height: '44px',
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
              color: '#fff', borderRadius: '50%', width: '48px', height: '48px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 1001,
            }}>
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Foto */}
          <img
            src={fotos[lightboxIndex]?.url}
            alt="Reisefoto"
            style={{
              maxWidth: '90vw', maxHeight: '80vh',
              objectFit: 'contain', borderRadius: '12px',
            }}
          />

          {/* Nächstes Foto */}
          {fotos.length > 1 && (
            <button onClick={naechstesFoto} style={{
              position: 'absolute', right: '16px',
              backgroundColor: 'rgba(255,255,255,0.08)', border: 'none',
              color: '#fff', borderRadius: '50%', width: '48px', height: '48px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 1001,
            }}>
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      )}

    </div>
  )
}