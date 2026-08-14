import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import laender from '../data/laender'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { Search, X, Plus } from 'lucide-react'
import usePullToRefresh from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'
import { useSettings } from '../context/SettingsContext'

const countryIds = {
  // Europa
  "008":"AL","020":"AD","051":"AM","040":"AT","031":"AZ","070":"BA","056":"BE","100":"BG",
  "112":"BY","196":"CY","203":"CZ","276":"DE","208":"DK","233":"EE","724":"ES","246":"FI",
  "250":"FR","268":"GE","300":"GR","191":"HR","348":"HU","372":"IE","380":"IT","352":"IS",
  "376":"IL","417":"KG","438":"LI","440":"LT","442":"LU","428":"LV","492":"MC","498":"MD",
  "499":"ME","807":"MK","470":"MT","528":"NL","578":"NO","616":"PL","620":"PT","642":"RO",
  "688":"RS","643":"RU","752":"SE","705":"SI","703":"SK","674":"SM","756":"CH", "792":"TR",
  "804":"UA","826":"GB","336":"VA",

  // Asien
  "004":"AF","784":"AE","050":"BD","096":"BN","064":"BT","156":"CN","360":"ID","356":"IN",
  "364":"IR","368":"IQ","392":"JP","400":"JO","116":"KH","410":"KR","408":"KP","414":"KW",
  "398":"KZ","418":"LA","422":"LB","144":"LK","462":"MV","104":"MM","496":"MN","458":"MY",
  "524":"NP","512":"OM","608":"PH","586":"PK","275":"PS","634":"QA","682":"SA","702":"SG",
  "760":"SY","764":"TH","762":"TJ","795":"TM","626":"TL","860":"UZ","704":"VN","887":"YE",

  // Afrika
  "024":"AO","204":"BJ","854":"BF","108":"BI","072":"BW","140":"CF","384":"CI","120":"CM",
  "180":"CD","178":"CG","174":"KM","132":"CV","262":"DJ","012":"DZ","818":"EG","232":"ER",
  "231":"ET","266":"GA","288":"GH","324":"GN","226":"GQ","270":"GM","624":"GW","404":"KE",
  "430":"LR","426":"LS","434":"LY","504":"MA","450":"MG","466":"ML","478":"MR","480":"MU",
  "454":"MW","508":"MZ","516":"NA","562":"NE","566":"NG","646":"RW","678":"ST","686":"SN",
  "706":"SO","729":"SD","694":"SL","710":"ZA","728":"SS","748":"SZ","148":"TD","768":"TG",
  "788":"TN","834":"TZ","800":"UG","690":"SC","894":"ZM","716":"ZW",

  // Amerika
  "032":"AR","028":"AG","533":"AW","052":"BB","084":"BZ","068":"BO","076":"BR","060":"BM",
  "124":"CA","152":"CL","170":"CO","188":"CR","192":"CU","531":"CW","212":"DM","214":"DO",
  "218":"EC","238":"FK","308":"GD","254":"GF","320":"GT","328":"GY","340":"HN","332":"HT",
  "388":"JM","136":"KY","659":"KN","662":"LC","484":"MX","558":"NI","591":"PA","604":"PE",
  "630":"PR","600":"PY","740":"SR","222":"SV","780":"TT","840":"US","858":"UY","670":"VC",
  "862":"VE","092":"VG","850":"VI",

  // Ozeanien
  "036":"AU","242":"FJ","316":"GU","296":"KI","584":"MH","583":"FM","520":"NR","554":"NZ",
  "585":"PW","598":"PG","090":"SB","776":"TO","798":"TV","548":"VU","882":"WS",
}

function MapScreen() {
  const { t } = useSettings()
  const [besucht, setBesucht] = useState([])
  const [userId, setUserId] = useState(null)
  const [suche, setSuche] = useState('')
  const [popup, setPopup] = useState(null)
  const [balkenBreite, setBalkenBreite] = useState(0)
  const svgRef = useRef(null)
  const mapContainerRef = useRef(null)

  // Zoom-Zustand zwischen Neu-Zeichnungen erhalten
  const zoomTransformRef = useRef(d3.zoomIdentity)

  useEffect(() => { laden() }, [])

  const { ziehen, fortschritt, schwellenwert } = usePullToRefresh(laden)

  async function laden() {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user.id)
    const { data } = await supabase
      .from('visited_countries')
      .select('country_code, trip_id')
      .eq('user_id', user.id)
    setBesucht(data || [])
  }

  // Fortschrittsbalken animiert einblenden
  useEffect(() => {
    const timer = setTimeout(() => {
      setBalkenBreite(laender.length > 0 ? Math.round((besucht.length / laender.length) * 100) : 0)
    }, 400)
    return () => clearTimeout(timer)
  }, [besucht])

  // Karte zeichnen wenn besucht sich ändert
  useEffect(() => {
    if (!svgRef.current || !mapContainerRef.current) return
    let abgebrochen = false

    const besuchteCodesListe = besucht.map(b => b.country_code)
    const width = mapContainerRef.current.clientWidth
    const height = Math.round(width * 0.55)

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    // Ozean-Hintergrund – Klick schließt Popup
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#080d1a')
      .on('click', () => setPopup(null))

    const g = svg.append('g')

    const projection = d3.geoNaturalEarth1()
      .scale(width / 6.5)
      .translate([width / 2, height / 2])

    const path = d3.geoPath().projection(projection)

    // Zoom & Pan mit gespeichertem Zoom-Zustand
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        zoomTransformRef.current = event.transform
        setPopup(null)
      })

    svg.call(zoom)
    svg.call(zoom.transform, zoomTransformRef.current)

    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(world => {
        if (abgebrochen) return
        const countries = topojson.feature(world, world.objects.countries)

        g.selectAll('path')
          .data(countries.features)
          .enter()
          .append('path')
          .attr('d', path)
          .attr('fill', d => {
            const code = countryIds[String(d.id).padStart(3, '0')]
            return besuchteCodesListe.includes(code) ? '#c9a84c' : '#1a2235'
          })
          .attr('stroke', '#0a0f1e')
          .attr('stroke-width', 0.3)
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d) {
            const code = countryIds[String(d.id).padStart(3, '0')]
            if (!code) return
            d3.select(this).attr('fill', besuchteCodesListe.includes(code) ? '#e0b84a' : '#2a3a55')
          })
          .on('mouseout', function(event, d) {
            const code = countryIds[String(d.id).padStart(3, '0')]
            if (!code) return
            d3.select(this).attr('fill', besuchteCodesListe.includes(code) ? '#c9a84c' : '#1a2235')
          })
          .on('click', function(event, d) {
            event.stopPropagation()
            const code = countryIds[String(d.id).padStart(3, '0')]
            if (!code) return
            const land = laender.find(l => l.code === code)
            if (!land) return
            // Position relativ zum äußeren Wrapper berechnen
            const rect = mapContainerRef.current.getBoundingClientRect()
            const rawX = event.clientX - rect.left
            const rawY = event.clientY - rect.top
            const popupBreite = 175
            const containerBreite = mapContainerRef.current.clientWidth
            const x = Math.min(Math.max(rawX - popupBreite / 2, 8), containerBreite - popupBreite - 8)
            const y = rawY < 90 ? rawY + 12 : rawY - 82
            const eintrag = besucht.find(b => b.country_code === code)
            setPopup({
              code,
              name: land.name,
              isBesucht: besuchteCodesListe.includes(code),
              manuelHinzugefuegt: eintrag ? !eintrag.trip_id : false,
              x,
              y,
            })
          })
      })

    return () => { abgebrochen = true }
  }, [besucht])

  const landHinzufuegen = async (code) => {
    const codes = besucht.map(b => b.country_code)
    if (!code || codes.includes(code)) return
    await supabase.from('visited_countries').insert([{
      user_id: userId, country_code: code, trip_id: null,
    }])
    setBesucht([...besucht, { country_code: code, trip_id: null }])
    setSuche('')
    setPopup(null)
  }

  const landEntfernen = async (code) => {
    await supabase.from('visited_countries').delete()
      .eq('user_id', userId).eq('country_code', code)
    setBesucht(besucht.filter(b => b.country_code !== code))
    setPopup(null)
  }

  const besuchteCodesListe = besucht.map(b => b.country_code)
  const prozent = laender.length > 0 ? Math.round((besucht.length / laender.length) * 100) : 0

  // Länderliste für Suche filtern (bereits besuchte ausblenden)
  const gefilterteLaender = suche.trim().length > 0
    ? laender
        .filter(l =>
          !besuchteCodesListe.includes(l.code) &&
          l.name.toLowerCase().includes(suche.toLowerCase())
        )
        .slice(0, 15)
    : []

  return (
    <div style={{
      padding: 'clamp(14px, 4vw, 20px)',
      maxWidth: '680px',
      margin: '0 auto',
      paddingBottom: 'calc(120px + env(safe-area-inset-bottom))',
      boxSizing: 'border-box',
    }}>

      <PullToRefreshIndicator ziehen={ziehen} fortschritt={fortschritt} schwellenwert={schwellenwert} />

      {/* Header */}
      <div className="fade-in" style={{ marginBottom: '20px' }}>
        <h1 style={{
          fontSize: 'clamp(1.8rem, 7vw, 2.4rem)',
          fontWeight: '800',
          letterSpacing: '-1px',
          margin: '0 0 4px',
          lineHeight: 1.1,
        }}>
          {t('meinePrefix')} <span style={{ color: 'var(--gold)' }}>{t('karte')}</span>
        </h1>
        <p style={{ color: 'var(--text-sub)', fontSize: '0.85rem', margin: 0 }}>
          {t('deinePersoenlicheReisegeschichte')}
        </p>
      </div>

      {/* Statistik Karte */}
      <div className="fade-in" style={karteStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <p style={{ color: 'var(--text-sub)', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 4px' }}>
              {t('bereisteLaender')}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: 'clamp(2.4rem, 10vw, 3.2rem)', fontWeight: '800', color: 'var(--gold)', lineHeight: 1 }}>
                {besucht.length}
              </span>
              <span style={{ color: 'var(--text-sub)', fontSize: '0.9rem' }}>/ {laender.length}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'var(--text-sub)', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 4px' }}>
              {t('derWelt')}
            </p>
            <span style={{ fontSize: 'clamp(1.8rem, 8vw, 2.6rem)', fontWeight: '800', color: 'var(--text)', lineHeight: 1 }}>
              {prozent}%
            </span>
          </div>
        </div>
        {/* Animierter Fortschrittsbalken */}
        <div style={{ backgroundColor: 'var(--sub)', borderRadius: '100px', height: '8px', overflow: 'hidden' }}>
          <div style={{
            height: '8px',
            borderRadius: '100px',
            width: `${balkenBreite}%`,
            background: 'linear-gradient(90deg, var(--gold), #e8c97a)',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 12px rgba(201,168,76,0.4)',
          }} />
        </div>
      </div>

      {/* D3 Weltkarte – äußerer Wrapper für Popup-Positionierung */}
      <div ref={mapContainerRef} className="fade-in" style={{ position: 'relative', marginBottom: '14px' }}>
        {/* Innere Karte mit overflow:hidden für abgerundete Ecken */}
        <div style={{
          backgroundColor: 'var(--card)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow)',
        }}>
          <svg ref={svgRef} style={{ width: '100%', display: 'block' }} />
        </div>

        {/* Zoom-Hinweis */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '14px',
          color: 'rgba(136,146,164,0.4)',
          fontSize: '0.67rem',
          letterSpacing: '0.04em',
          pointerEvents: 'none',
          zIndex: 1,
        }}>
          {t('scrollPinchZoomen')}
        </div>

        {/* Länder-Popup beim Klick */}
        {popup && (
          <div className="fade-in" style={{
            position: 'absolute',
            left: `${popup.x}px`,
            top: `${popup.y}px`,
            backgroundColor: 'var(--card)',
            borderRadius: '16px',
            padding: '12px 14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,168,76,0.2)',
            zIndex: 10,
            minWidth: '160px',
            maxWidth: '200px',
          }}>
            {/* Flagge + Name + Schließen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <img
                src={`https://flagcdn.com/w20/${popup.code.toLowerCase()}.png`}
                alt=""
                style={{ width: '20px', borderRadius: '2px', flexShrink: 0 }}
              />
              <span style={{ fontWeight: '700', fontSize: '0.88rem', flex: 1, lineHeight: 1.2 }}>
                {popup.name}
              </span>
              <button onClick={() => setPopup(null)} style={{
                background: 'none', border: 'none', color: 'var(--text-sub)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, width: '28px', height: '28px', margin: '-7px',
              }}>
                <X size={14} />
              </button>
            </div>

            {/* Aktion je nach Status */}
            {popup.isBesucht ? (
              popup.manuelHinzugefuegt ? (
                <button onClick={() => landEntfernen(popup.code)} className="btn-press" style={{
                  width: '100%', padding: '8px 10px', minHeight: '44px', boxSizing: 'border-box', borderRadius: '10px',
                  border: 'none', backgroundColor: 'rgba(233,69,96,0.15)',
                  color: '#e94560', cursor: 'pointer',
                  fontSize: '0.82rem', fontWeight: '600',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                }}>
                  × {t('entfernen')}
                </button>
              ) : (
                <div style={{
                  padding: '8px 10px', borderRadius: '10px',
                  backgroundColor: 'rgba(76,175,80,0.1)',
                  color: '#4caf50', fontSize: '0.82rem', fontWeight: '600',
                  textAlign: 'center',
                }}>
                  ✓ {t('viaTripBesucht')}
                </div>
              )
            ) : (
              <button onClick={() => landHinzufuegen(popup.code)} className="btn-press" style={{
                width: '100%', padding: '8px 10px', minHeight: '44px', boxSizing: 'border-box', borderRadius: '10px',
                border: 'none', backgroundColor: 'var(--border)',
                color: 'var(--gold)', cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: '600',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              }}>
                <Plus size={14} /> {t('hinzufuegen')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Land hinzufügen über Suchleiste */}
      <div className="fade-in" style={karteStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '10px',
            backgroundColor: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Search size={16} color="var(--gold)" />
          </div>
          <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1rem' }}>{t('landHinzufuegenTitel')}</h3>
        </div>

        {/* Suchfeld */}
        <div style={{ position: 'relative' }}>
          <Search size={15} color="var(--text-sub)" style={{
            position: 'absolute', left: '14px', top: '50%',
            transform: 'translateY(-50%)', pointerEvents: 'none',
          }} />
          <input
            placeholder={t('landSuchenPlatzhalter')}
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '40px' }}
          />
        </div>

        {/* Suchergebnisse als Gold-Chips */}
        {gefilterteLaender.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
            {gefilterteLaender.map(land => (
              <button
                key={land.code}
                onClick={() => landHinzufuegen(land.code)}
                className="btn-press"
                style={{
                  backgroundColor: 'rgba(201,168,76,0.1)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: '50px',
                  padding: '7px 12px 7px 8px',
                  color: 'var(--gold)',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <img
                  src={`https://flagcdn.com/w20/${land.code.toLowerCase()}.png`}
                  alt=""
                  style={{ width: '16px', borderRadius: '2px' }}
                />
                {land.name}
              </button>
            ))}
          </div>
        )}

        {suche.trim().length > 0 && gefilterteLaender.length === 0 && (
          <p style={{ color: 'var(--text-sub)', fontSize: '0.85rem', margin: '10px 0 0', textAlign: 'center' }}>
            {t('keinLandGefunden')}
          </p>
        )}
      </div>

      {/* Besuchte Länder als Chips mit Flagge */}
      {besucht.length > 0 && (
        <div className="fade-in" style={karteStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1rem' }}>{t('besuchteLaender')}</h3>
            <span style={{
              backgroundColor: 'var(--border)',
              color: 'var(--gold)',
              fontSize: '0.75rem',
              fontWeight: '700',
              padding: '3px 9px',
              borderRadius: '50px',
            }}>
              {besucht.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {besucht.map((eintrag, index) => {
              const land = laender.find(l => l.code === eintrag.country_code)
              return (
                <div key={eintrag.country_code} className={`fade-in-${Math.min(index + 1, 5)}`} style={{
                  backgroundColor: 'var(--sub)',
                  borderRadius: '50px',
                  padding: '7px 10px 7px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                }}>
                  <img
                    src={`https://flagcdn.com/w20/${eintrag.country_code.toLowerCase()}.png`}
                    alt=""
                    style={{ width: '18px', borderRadius: '2px', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: '500', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                    {land?.name || eintrag.country_code}
                  </span>
                  {/* Nur manuell hinzugefügte Länder können entfernt werden */}
                  {!eintrag.trip_id && (
                    <button onClick={() => landEntfernen(eintrag.country_code)} className="btn-press" style={{
                      background: 'none', border: 'none', color: '#e94560',
                      cursor: 'pointer', width: '34px', height: '34px', margin: '-6px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: '1rem', padding: 0,
                    }}>
                      <span style={{
                        width: '22px', height: '22px', borderRadius: '50%',
                        backgroundColor: 'rgba(233,69,96,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>×</span>
                    </button>
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

const karteStyle = {
  backgroundColor: 'var(--card)',
  borderRadius: '20px',
  padding: 'clamp(18px, 4vw, 24px)',
  marginBottom: '14px',
  boxSizing: 'border-box',
  boxShadow: 'var(--shadow)',
}

const inputStyle = {
  width: '100%',
  padding: '13px 14px',
  backgroundColor: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  borderRadius: '12px',
  // min. 16px verhindert Auto-Zoom bei Fokus auf iOS Safari
  color: 'var(--text)',
  fontSize: '16px',
  minHeight: '44px',
  boxSizing: 'border-box',
}

export default MapScreen
