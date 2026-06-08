import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import { CheckSquare, Trash2, SquarePen } from 'lucide-react'

export default function TripPackliste() {
  const { id } = useParams()
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

  if (laden) return <p style={{ color: '#fff', padding: '20px' }}>Lädt...</p>

  return (
    <div style={{ paddingBottom: '40px' }}>
      <TripNav tripName={trip.name} />

      <div style={{ padding: '0 clamp(14px, 4vw, 20px)', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Fortschrittsanzeige */}
        {gesamt > 0 && (
          <div style={{
            backgroundColor: '#111827', borderRadius: '15px',
            border: '1px solid rgba(201,168,76,0.15)',
            padding: 'clamp(14px, 4vw, 20px)', marginBottom: '15px', boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ margin: 0, fontWeight: '600' }}>{erledigt}/{gesamt} gepackt</p>
              <p style={{ margin: 0, color: '#c9a84c', fontWeight: '600' }}>{prozent}%</p>
            </div>
            <div style={{ backgroundColor: '#1a2235', borderRadius: '10px', height: '8px' }}>
              <div style={{
                backgroundColor: '#c9a84c', borderRadius: '10px',
                height: '8px', width: `${prozent}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* Packliste */}
        <div style={{
          backgroundColor: '#111827', borderRadius: '15px',
          border: '1px solid rgba(201,168,76,0.15)',
          padding: '20px', marginBottom: '15px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CheckSquare size={18} color="#c9a84c" />
            <h3 style={{ margin: 0, fontWeight: '600' }}>Packliste</h3>
          </div>

          {packliste.length === 0 ? (
            <p style={{ color: '#8892a4', fontSize: '0.9rem', margin: '0 0 16px' }}>
              Noch nichts auf der Liste – füge dein erstes Item hinzu!
            </p>
          ) : (
            packliste.map(item => (
              <div key={item.id} style={{
                padding: '10px 0', borderBottom: '1px solid #1a2235',
              }}>
                {/* Bearbeiten Formular */}
                {bearbeiteItem?.id === item.id ? (
                  <div>
                    <input
                      value={bearbeiteItem.text}
                      onChange={(e) => setBearbeiteItem({ ...bearbeiteItem, text: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && itemSpeichern()}
                      style={{
                        width: '100%', padding: '10px', backgroundColor: '#1a2235',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px', color: '#ffffff', fontSize: '1rem',
                        marginBottom: '8px', boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={itemSpeichern} style={{
                        backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
                        padding: '12px', minHeight: '44px', borderRadius: '10px', cursor: 'pointer',
                        flex: 1, fontWeight: '600', boxSizing: 'border-box',
                      }}>Speichern</button>
                      <button onClick={() => setBearbeiteItem(null)} style={{
                        backgroundColor: 'transparent', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        padding: '12px', minHeight: '44px', borderRadius: '10px', cursor: 'pointer',
                        flex: 1, boxSizing: 'border-box',
                      }}>Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  /* Normale Ansicht */
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Checkbox */}
                    <div
                      onClick={() => toggleErledigt(item)}
                      style={{
                        width: '24px', height: '24px', borderRadius: '6px',
                        backgroundColor: item.erledigt ? '#c9a84c' : '#1a2235',
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, cursor: 'pointer',
                      }}
                    >
                      {item.erledigt && <span style={{ fontSize: '12px', color: '#0a0f1e' }}>✓</span>}
                    </div>

                    {/* Text */}
                    <p onClick={() => toggleErledigt(item)} style={{
                      margin: 0, flex: 1, minWidth: 0, cursor: 'pointer',
                      overflowWrap: 'break-word', wordBreak: 'break-word',
                      textDecoration: item.erledigt ? 'line-through' : 'none',
                      color: item.erledigt ? '#8892a4' : '#ffffff',
                    }}>
                      {item.text}
                    </p>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => itemLoeschen(item.id)} style={{
                        backgroundColor: 'transparent',
                        border: '1px solid rgba(233,69,96,0.2)',
                        color: '#e94560', cursor: 'pointer',
                        padding: '6px', minWidth: '40px', minHeight: '40px',
                        borderRadius: '8px', boxSizing: 'border-box',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Trash2 size={14} />
                      </button>
                      <button onClick={() => setBearbeiteItem(item)} style={{
                        backgroundColor: 'transparent',
                        border: '1px solid rgba(201,168,76,0.2)',
                        color: '#c9a84c', cursor: 'pointer',
                        padding: '6px', minWidth: '40px', minHeight: '40px',
                        borderRadius: '8px', boxSizing: 'border-box',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <SquarePen size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Item hinzufügen */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <input
              placeholder="+ Item hinzufügen..."
              value={neuesItem}
              onChange={(e) => setNeuesItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && itemHinzufuegen()}
              style={{
                flex: 1, minWidth: 0, padding: '12px', backgroundColor: '#1a2235',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', color: '#ffffff', fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
            <button onClick={itemHinzufuegen} style={{
              backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
              padding: '12px 20px', minHeight: '44px', borderRadius: '10px', cursor: 'pointer',
              fontSize: '1.2rem', fontWeight: '600', flexShrink: 0, boxSizing: 'border-box',
            }}>+</button>
          </div>
        </div>

      </div>
    </div>
  )
}