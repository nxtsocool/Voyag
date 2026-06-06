import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import { UserPlus, X } from 'lucide-react'


export default function TripPersonen() {
  const { id } = useParams()
  const [trip, setTrip] = useState(null)
  const [teilnehmer, setTeilnehmer] = useState([])
  const [neuerTeilnehmer, setNeuerTeilnehmer] = useState('')
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    const datenLaden = async () => {
      const { data: tripData } = await supabase
        .from('trips').select('*').eq('id', id).single()
      setTrip(tripData)

      const { data: teilnehmerData } = await supabase
        .from('teilnehmer').select('*').eq('trip_id', id)
      setTeilnehmer(teilnehmerData || [])

      setLaden(false)
    }
    datenLaden()
  }, [id])

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

  const teilnehmerEntfernen = async (teilnehmerId) => {
    const { error } = await supabase.from('teilnehmer').delete().eq('id', teilnehmerId)
    if (error) console.error('Fehler:', error)
    else setTeilnehmer(teilnehmer.filter(t => t.id !== teilnehmerId))
  }

  if (laden) return <p style={{ color: '#fff', padding: '20px' }}>Lädt...</p>

  return (
    <div style={{ paddingBottom: '40px' }}>
      <TripNav tripName={trip.name} />

      <div style={{ padding: '0 20px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Teilnehmer Liste */}
        <div style={karteStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <UserPlus size={18} color="#c9a84c" />
            <h3 style={{ margin: 0, fontWeight: '600' }}>
              Teilnehmer · {teilnehmer.length}
            </h3>
          </div>

          {/* Teilnehmer Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {teilnehmer.map(person => (
              <div key={person.id} style={{ position: 'relative' }}>
                <span style={{
                  backgroundColor: '#1a2235', padding: '8px 28px 8px 14px',
                  borderRadius: '20px', fontSize: '0.9rem', display: 'inline-block',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  {person.name}
                </span>
                <button onClick={() => teilnehmerEntfernen(person.id)} style={{
                  position: 'absolute', top: '-5px', right: '-5px',
                  backgroundColor: '#e94560', border: 'none',
                  color: '#fff', borderRadius: '50%',
                  width: '18px', height: '18px',
                  fontSize: '10px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <X size={18} />
                </button>
              </div>
            ))}
            {teilnehmer.length === 0 && (
              <p style={{ color: '#8892a4', fontSize: '0.9rem', margin: 0 }}>
                Noch keine Teilnehmer hinzugefügt
              </p>
            )}
          </div>

          {/* Teilnehmer hinzufügen */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              placeholder="Name hinzufügen..."
              value={neuerTeilnehmer}
              onChange={(e) => setNeuerTeilnehmer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && teilnehmerHinzufuegen()}
              style={{
                flex: 1, padding: '10px', backgroundColor: '#1a2235',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', color: '#ffffff', fontSize: '1rem',
              }}
            />
            <button onClick={teilnehmerHinzufuegen} style={{
              backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
              padding: '10px 16px', borderRadius: '10px', cursor: 'pointer',
              fontSize: '1.2rem', fontWeight: '600',
            }}>+</button>
          </div>
        </div>

        {/* Einladungscode */}
        {trip.invite_code && (
          <div style={karteStyle}>
            <h3 style={{ margin: '0 0 12px', fontWeight: '600' }}>Einladungscode</h3>
            <p style={{ color: '#8892a4', fontSize: '0.85rem', marginBottom: '12px' }}>
              Teile diesen Code mit Freunden damit sie der Reise beitreten können
            </p>
            <div style={{
              backgroundColor: '#1a2235', borderRadius: '12px',
              padding: '16px', textAlign: 'center',
              border: '1px solid rgba(201,168,76,0.3)',
            }}>
              <p style={{
                fontSize: '2rem', fontWeight: '700', letterSpacing: '0.3em',
                color: '#c9a84c', margin: 0,
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
  backgroundColor: '#111827', borderRadius: '15px',
  border: '1px solid rgba(201,168,76,0.15)',
  padding: '20px', marginBottom: '15px',
}