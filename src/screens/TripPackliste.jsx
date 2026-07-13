import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import { Trash2, SquarePen, PackageCheck } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'

export default function TripPackliste() {
  const { id } = useParams()
  const { t } = useSettings()
  const [trip, setTrip] = useState(null)
  const [packliste, setPackliste] = useState([])
  const [neuesItem, setNeuesItem] = useState('')
  const [laden, setLaden] = useState(true)
  // State für das Item das gerade bearbeitet wird
  const [bearbeiteItem, setBearbeiteItem] = useState(null)

  useEffect(() => {
    const datenLaden = async () => {
      const { data: tripData } = await supabase
        .from('trips').select('*').eq('id', id).single()
      setTrip(tripData)
      const { data: packlisteData } = await supabase
        .from('packliste').select('*').eq('trip_id', id)
      setPackliste(packlisteData || [])
      setLaden(false)
    }
    datenLaden()
  }, [id])

  const itemHinzufuegen = async () => {
    if (!neuesItem) return
    const { data, error } = await supabase
      .from('packliste')
      .insert([{ text: neuesItem, erledigt: false, trip_id: id }])
      .select()
    if (error) console.error('Fehler:', error)
    else {
      setPackliste([...packliste, data[0]])
      setNeuesItem('')
    }
  }

  const toggleErledigt = async (item) => {
    const { error } = await supabase
      .from('packliste').update({ erledigt: !item.erledigt }).eq('id', item.id)
    if (error) console.error('Fehler:', error)
    else setPackliste(packliste.map(i =>
      i.id === item.id ? { ...i, erledigt: !i.erledigt } : i
    ))
  }

  const itemLoeschen = async (itemId) => {
    await supabase.from('packliste').delete().eq('id', itemId)
    setPackliste(packliste.filter(i => i.id !== itemId))
  }

  // Item Text in Supabase speichern
  const itemSpeichern = async () => {
    if (!bearbeiteItem?.text) return
    const { error } = await supabase
      .from('packliste').update({ text: bearbeiteItem.text }).eq('id', bearbeiteItem.id)
    if (error) console.error('Fehler:', error)
    else {
      setPackliste(packliste.map(i =>
        i.id === bearbeiteItem.id ? { ...i, text: bearbeiteItem.text } : i
      ))
      setBearbeiteItem(null)
    }
  }

  const erledigt = packliste.filter(i => i.erledigt).length
  const gesamt = packliste.length
  const prozent = gesamt > 0 ? Math.round((erledigt / gesamt) * 100) : 0

  if (laden) return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ padding: '0 20px', maxWidth: '600px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '120px', borderRadius: '22px', marginBottom: '16px', marginTop: '20px' }} />
        <div className="skeleton" style={{ height: '300px', borderRadius: '22px' }} />
      </div>
    </div>
  )

  return (
    <div style={{ paddingBottom: '100px' }}>
      <TripNav tripName={trip.name} />

      <div style={{ padding: '0 clamp(14px, 4vw, 20px)', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Großer Fortschrittsblock oben */}
        {gesamt > 0 && (
          <div className="fade-in" style={{
            backgroundColor: '#111827',
            borderRadius: '22px',
            padding: 'clamp(20px, 5vw, 28px)',
            marginBottom: '16px',
            boxSizing: 'border-box',
            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          }}>
            {/* Prozent + Label */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
              <div>
                <p style={{ color: '#8892a4', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                  {t('fortschritt')}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: 'clamp(2.2rem, 9vw, 3rem)', fontWeight: '800', color: '#c9a84c', lineHeight: 1 }}>
                    {prozent}%
                  </span>
                  {prozent === 100 && (
                    <PackageCheck size={22} color="#4caf50" />
                  )}
                </div>
              </div>
              <p style={{ color: '#8892a4', fontSize: '0.88rem', margin: 0, fontWeight: '500' }}>
                {t('erledigtVonGesamt')(erledigt, gesamt)}
              </p>
            </div>

            {/* Dicker animierter Fortschrittsbalken */}
            <div style={{
              backgroundColor: '#0d1525', borderRadius: '100px',
              height: '12px', overflow: 'hidden',
            }}>
              <div style={{
                height: '12px',
                borderRadius: '100px',
                width: `${prozent}%`,
                background: prozent === 100
                  ? 'linear-gradient(90deg, #4caf50, #66bb6a)'
                  : 'linear-gradient(90deg, #c9a84c, #e8c97a)',
                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: prozent === 100
                  ? '0 0 12px rgba(76,175,80,0.5)'
                  : '0 0 12px rgba(201,168,76,0.4)',
              }} />
            </div>
          </div>
        )}

        {/* Packliste Items */}
        <div className="fade-in" style={{
          backgroundColor: '#111827',
          borderRadius: '22px',
          padding: 'clamp(18px, 4vw, 24px)',
          boxSizing: 'border-box',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}>

          {packliste.length === 0 ? (
            <p style={{ color: '#8892a4', fontSize: '0.9rem', margin: '0 0 20px', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
              {t('nochNichtsAufListe')}
            </p>
          ) : (
            packliste.map((item, index) => (
              <div key={item.id} className={`fade-in-${Math.min(index + 1, 5)}`} style={{
                paddingBottom: index < packliste.length - 1 ? '14px' : '0',
                marginBottom: index < packliste.length - 1 ? '14px' : '0',
                borderBottom: index < packliste.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                {/* Bearbeiten Formular */}
                {bearbeiteItem?.id === item.id ? (
                  <div className="fade-in">
                    <input
                      value={bearbeiteItem.text}
                      onChange={(e) => setBearbeiteItem({ ...bearbeiteItem, text: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && itemSpeichern()}
                      style={inputStyle}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={itemSpeichern} className="btn-press" style={{
                        backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
                        padding: '12px', minHeight: '44px', borderRadius: '12px',
                        cursor: 'pointer', flex: 1, fontWeight: '700', boxSizing: 'border-box',
                        boxShadow: '0 4px 12px rgba(201,168,76,0.3)',
                      }}>{t('speichern')}</button>
                      <button onClick={() => setBearbeiteItem(null)} className="btn-press" style={{
                        backgroundColor: 'transparent', color: '#8892a4',
                        border: '1px solid rgba(255,255,255,0.12)',
                        padding: '12px', minHeight: '44px', borderRadius: '12px',
                        cursor: 'pointer', flex: 1, boxSizing: 'border-box',
                      }}>{t('abbrechen')}</button>
                    </div>
                  </div>
                ) : (
                  /* Normale Item Ansicht */
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                    {/* Runde Checkbox – 44x44px Touch-Target, optisch bleibt der Kreis 26px */}
                    <div
                      onClick={() => toggleErledigt(item)}
                      className="btn-press"
                      style={{
                        width: '44px', height: '44px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, cursor: 'pointer', margin: '-9px',
                      }}
                    >
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '50%',
                        backgroundColor: item.erledigt ? '#c9a84c' : 'transparent',
                        border: item.erledigt
                          ? '2px solid #c9a84c'
                          : '2px solid rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.25s ease',
                        boxShadow: item.erledigt ? '0 0 10px rgba(201,168,76,0.35)' : 'none',
                      }}>
                        {item.erledigt && (
                          <span style={{ fontSize: '13px', color: '#0a0f1e', fontWeight: '700', lineHeight: 1 }}>✓</span>
                        )}
                      </div>
                    </div>

                    {/* Item Text */}
                    <p onClick={() => toggleErledigt(item)} style={{
                      margin: 0, flex: 1, minWidth: 0,
                      cursor: 'pointer',
                      overflowWrap: 'break-word', wordBreak: 'break-word',
                      textDecoration: item.erledigt ? 'line-through' : 'none',
                      color: item.erledigt ? '#4d5a6e' : '#ffffff',
                      fontSize: '0.95rem',
                      transition: 'color 0.25s ease',
                    }}>
                      {item.text}
                    </p>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => setBearbeiteItem(item)} className="btn-press" style={ikonButtonStyle}>
                        <SquarePen size={13} color="#c9a84c" />
                      </button>
                      <button onClick={() => itemLoeschen(item.id)} className="btn-press" style={ikonButtonStyleRot}>
                        <Trash2 size={13} color="#e94560" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Item hinzufügen */}
          <div style={{ display: 'flex', gap: '10px', marginTop: packliste.length > 0 ? '20px' : '0' }}>
            <input
              placeholder={t('itemHinzufuegenPlatzhalter')}
              value={neuesItem}
              onChange={(e) => setNeuesItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && itemHinzufuegen()}
              style={{ ...inputStyle, flex: 1, minWidth: 0, marginBottom: 0 }}
            />
            <button onClick={itemHinzufuegen} className="btn-press" style={{
              backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
              padding: '0 20px', minHeight: '48px', borderRadius: '14px',
              cursor: 'pointer', fontSize: '1.3rem', fontWeight: '600',
              flexShrink: 0, boxSizing: 'border-box',
              boxShadow: '0 4px 14px rgba(201,168,76,0.3)',
            }}>+</button>
          </div>
        </div>

      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '13px 14px',
  backgroundColor: '#1a2235',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  // min. 16px verhindert Auto-Zoom bei Fokus auf iOS Safari
  color: '#ffffff', fontSize: '16px',
  marginBottom: '10px', boxSizing: 'border-box',
}

const ikonButtonStyle = {
  backgroundColor: 'rgba(201,168,76,0.1)',
  border: '1px solid rgba(201,168,76,0.2)',
  cursor: 'pointer', borderRadius: '10px',
  minWidth: '44px', minHeight: '44px', boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const ikonButtonStyleRot = {
  backgroundColor: 'rgba(233,69,96,0.1)',
  border: '1px solid rgba(233,69,96,0.2)',
  cursor: 'pointer', borderRadius: '10px',
  minWidth: '44px', minHeight: '44px', boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
