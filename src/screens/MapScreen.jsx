import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import laender from '../data/laender'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import countryIds from '../data/countryIds'

function MapScreen() {
  const [besucht, setBesucht] = useState([])
  const [userId, setUserId] = useState(null)
  const [ausgewaehlt, setAusgewaehlt] = useState('')
  const svgRef = useRef(null)

  useEffect(() => {
    const laden = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user.id)
      const { data } = await supabase
        .from('visited_countries')
        .select('country_code, trip_id')
        .eq('user_id', user.id)
      setBesucht(data || [])
    }
    laden()
  }, [])

  // Karte neu zeichnen wenn besucht sich ändert
  useEffect(() => {
    if (!svgRef.current) return

    const besuchteCodesListe = besucht.map(b => b.country_code)

    const width = svgRef.current.clientWidth
    const height = width * 0.5

    // Altes SVG leeren
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    const projection = d3.geoNaturalEarth1()
      .scale(width / 6.5)
      .translate([width / 2, height / 2])

    const path = d3.geoPath().projection(projection)

    // Weltkarte laden und zeichnen
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(world => {
        const countries = topojson.feature(world, world.objects.countries)

        svg.selectAll('path')
          .data(countries.features)
          .enter()
          .append('path')
          .attr('d', path)
          .attr('fill', d => {
            // Besucht = Gold, sonst dunkel
            const code = countryIds[String(d.id).padStart(3, '0')]
            return besuchteCodesListe.includes(code) ? '#c9a84c' : '#1a2235'
          })
          .attr('stroke', '#0a0f1e')
          .attr('stroke-width', 0.5)
      })
  }, [besucht])

  const landHinzufuegen = async () => {
    const codes = besucht.map(b => b.country_code)
    if (!ausgewaehlt || codes.includes(ausgewaehlt)) return
    await supabase.from('visited_countries').insert([{
      user_id: userId, country_code: ausgewaehlt, trip_id: null,
    }])
    setBesucht([...besucht, { country_code: ausgewaehlt, trip_id: null }])
    setAusgewaehlt('')
  }

  const landEntfernen = async (code) => {
    await supabase.from('visited_countries').delete()
      .eq('user_id', userId).eq('country_code', code)
    setBesucht(besucht.filter(b => b.country_code !== code))
  }

  const besuchteCodesListe = besucht.map(b => b.country_code)

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '80px' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '4px' }}>
        Meine<span style={{ color: '#c9a84c' }}> Karte</span>
      </h1>
      <p style={{ color: '#8892a4', fontSize: '0.85rem', marginBottom: '20px' }}>
        {besucht.length} {besucht.length === 1 ? 'Land' : 'Länder'} besucht
      </p>

      {/* Statistik */}
      <div style={{
        backgroundColor: '#111827', borderRadius: '15px',
        border: '1px solid rgba(201,168,76,0.15)',
        padding: '20px', marginBottom: '15px',
        display: 'flex', justifyContent: 'space-around', textAlign: 'center',
      }}>
        <div>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#c9a84c', margin: 0 }}>
            {besucht.length}
          </p>
          <p style={{ color: '#8892a4', fontSize: '0.85rem', margin: 0 }}>Länder besucht</p>
        </div>
        <div>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#c9a84c', margin: 0 }}>
            {Math.round((besucht.length / laender.length) * 100)}%
          </p>
          <p style={{ color: '#8892a4', fontSize: '0.85rem', margin: 0 }}>der Welt</p>
        </div>
      </div>

      {/* D3 Weltkarte */}
      <div style={{
        backgroundColor: '#111827', borderRadius: '15px',
        border: '1px solid rgba(201,168,76,0.15)',
        padding: '10px', marginBottom: '15px', overflow: 'hidden',
      }}>
        <svg ref={svgRef} style={{ width: '100%', display: 'block' }} />
      </div>

      {/* Land manuell hinzufügen */}
      <div style={{
        backgroundColor: '#111827', borderRadius: '15px',
        border: '1px solid rgba(201,168,76,0.15)',
        padding: '20px', marginBottom: '15px',
      }}>
        <h3 style={{ marginBottom: '12px', fontWeight: '600', fontSize: '1rem' }}>Land hinzufügen</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={ausgewaehlt}
            onChange={(e) => setAusgewaehlt(e.target.value)}
            style={{
              flex: 1, padding: '12px', backgroundColor: '#1a2235',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', color: '#ffffff', fontSize: '1rem',
            }}
          >
            <option value="">Land auswählen...</option>
            {laender
              .filter(l => !besuchteCodesListe.includes(l.code))
              .map(land => (
                <option key={land.code} value={land.code}>{land.name}</option>
              ))}
          </select>
          <button onClick={landHinzufuegen} style={{
            backgroundColor: '#c9a84c', color: '#0a0f1e',
            border: 'none', padding: '12px 16px',
            borderRadius: '10px', cursor: 'pointer', fontWeight: '600',
          }}>+</button>
        </div>
      </div>

      {/* Besuchte Länder Liste */}
      {besucht.length > 0 && (
        <div style={{
          backgroundColor: '#111827', borderRadius: '15px',
          border: '1px solid rgba(201,168,76,0.15)', padding: '20px',
        }}>
          <h3 style={{ marginBottom: '12px', fontWeight: '600', fontSize: '1rem' }}>Besuchte Länder</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {besucht.map(eintrag => {
              const land = laender.find(l => l.code === eintrag.country_code)
              return (
                <div key={eintrag.country_code} style={{
                  backgroundColor: '#1a2235', borderRadius: '20px',
                  padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <span style={{ fontSize: '0.9rem' }}>{land?.name || eintrag.country_code}</span>
                  {/* Nur manuell hinzugefügte Länder können gelöscht werden */}
                  {!eintrag.trip_id && (
                    <button onClick={() => landEntfernen(eintrag.country_code)} style={{
                      background: 'none', border: 'none',
                      color: '#8892a4', cursor: 'pointer',
                      fontSize: '0.8rem', padding: 0,
                    }}>×</button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default MapScreen