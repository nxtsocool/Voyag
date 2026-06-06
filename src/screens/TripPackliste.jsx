import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import { CheckSquare } from 'lucide-react'
import { X } from 'lucide-react'

export default function TripPackliste() {
  const { id } = useParams()
  const [trip, setTrip] = useState(null)
  const [packliste, setPackliste] = useState([])
  const [neuesItem, setNeuesItem] = useState('')
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    const datenLaden = async () => {
      const { data: tripData } = await supabase
        .from('trips').select('*').eq('id', id).single()
      setTrip(tripData)

      // Packliste aus Supabase laden
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
      .from('packliste')
      .update({ erledigt: !item.erledigt })
      .eq('id', item.id)
    if (error) console.error('Fehler:', error)
    else setPackliste(packliste.map(i =>
      i.id === item.id ? { ...i, erledigt: !i.erledigt } : i
    ))
  }

  const itemLoeschen = async (itemId) => {
    await supabase.from('packliste').delete().eq('id', itemId)
    setPackliste(packliste.filter(i => i.id !== itemId))
  }

  // Fortschritt berechnen
  const erledigt = packliste.filter(i => i.erledigt).length
  const gesamt = packliste.length
  const prozent = gesamt > 0 ? Math.round((erledigt / gesamt) * 100) : 0

  if (laden) return <p style={{ color: '#fff', padding: '20px' }}>Lädt...</p>

  return (
    <div style={{ paddingBottom: '40px' }}>
      <TripNav tripName={trip.name} />

      <div style={{ padding: '0 20px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Fortschrittsanzeige */}
        {gesamt > 0 && (
          <div style={{
            backgroundColor: '#111827', borderRadius: '15px',
            border: '1px solid rgba(201,168,76,0.15)',
            padding: '20px', marginBottom: '15px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ margin: 0, fontWeight: '600' }}>{erledigt}/{gesamt} gepackt</p>
              <p style={{ margin: 0, color: '#c9a84c', fontWeight: '600' }}>{prozent}%</p>
            </div>
            {/* Fortschrittsbalken */}
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

          {/* Items */}
          {packliste.length === 0 ? (
            <p style={{ color: '#8892a4', fontSize: '0.9rem', margin: '0 0 16px' }}>
              Noch nichts auf der Liste – füge dein erstes Item hinzu!
            </p>
          ) : (
            packliste.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 0', borderBottom: '1px solid #1a2235',
              }}>
                {/* Checkbox */}
                <div
                  onClick={() => toggleErledigt(item)}
                  style={{
                    width: '22px', height: '22px', borderRadius: '6px',
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
                  margin: 0, flex: 1, cursor: 'pointer',
                  textDecoration: item.erledigt ? 'line-through' : 'none',
                  color: item.erledigt ? '#8892a4' : '#ffffff',
                }}>
                  {item.text}
                </p>

                {/* Löschen */}
                <button onClick={() => itemLoeschen(item.id)} style={{
                  background: 'none', border: 'none', color: '#8892a4',
                  cursor: 'pointer', padding: 0, flexShrink: 0,
                }}>
                  <X size={18} />
                </button>
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
                flex: 1, padding: '10px', backgroundColor: '#1a2235',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', color: '#ffffff', fontSize: '1rem',
              }}
            />
            <button onClick={itemHinzufuegen} style={{
              backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
              padding: '10px 16px', borderRadius: '10px', cursor: 'pointer',
              fontSize: '1.2rem', fontWeight: '600',
            }}>+</button>
          </div>
        </div>

      </div>
    </div>
  )
}