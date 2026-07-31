import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import {
  Trash2, SquarePen, ExternalLink, MapPin, Check, ChevronDown,
  Utensils, Landmark, Palmtree, Zap, ShoppingBag, Hotel, Beer, Plus, X,
} from 'lucide-react'
import { useSettings } from '../context/SettingsContext'

// Kategorie-Definition mit Lucide Icons
const KATEGORIEN = [
  { id: 'restaurant',        labelKey: 'katRestaurant',        Icon: Utensils    },
  { id: 'sehenswuerdigkeit', labelKey: 'katSehenswuerdigkeit', Icon: Landmark    },
  { id: 'strand',            labelKey: 'katStrandNatur',       Icon: Palmtree    },
  { id: 'aktivitaet',        labelKey: 'katAktivitaet',        Icon: Zap         },
  { id: 'shopping',          labelKey: 'katShopping',          Icon: ShoppingBag },
  { id: 'unterkunft',        labelKey: 'katUnterkunft',        Icon: Hotel       },
  { id: 'bar',               labelKey: 'katBarNightlife',      Icon: Beer        },
  { id: 'sonstiges',         labelKey: 'katSonstiges',         Icon: MapPin      },
]

export default function TripOrte() {
  const { id } = useParams()
  const { t } = useSettings()
  const [trip, setTrip] = useState(null)
  const [orte, setOrte] = useState([])
  const [laden, setLaden] = useState(true)

  // Einheitliches Modal für Neu + Bearbeiten
  const [formularOffen, setFormularOffen] = useState(false)
  const [bearbeiteOrt, setBearbeiteOrt] = useState(null) // null = neu anlegen
  const [formDaten, setFormDaten] = useState({ name: '', kategorie: 'sonstiges', notiz: '', maps_link: '' })

  // Kategorien, die aufgeklappt sind – standardmäßig alle
  const [offeneKategorien, setOffeneKategorien] = useState(new Set(KATEGORIEN.map(k => k.id)))

  const kategorieToggle = (kategorieId) => {
    setOffeneKategorien(prev => {
      const neu = new Set(prev)
      if (neu.has(kategorieId)) neu.delete(kategorieId)
      else neu.add(kategorieId)
      return neu
    })
  }

  useEffect(() => {
    const datenLaden = async () => {
      const { data: tripData } = await supabase
        .from('trips').select('*').eq('id', id).single()
      setTrip(tripData)

      const { data: orteData } = await supabase
        .from('trip_orte').select('*').eq('trip_id', id).order('created_at', { ascending: true })
      setOrte(orteData || [])

      setLaden(false)
    }
    datenLaden()
  }, [id])

  // Modal öffnen – leer für Neu, vorausgefüllt für Bearbeiten
  const modalOeffnen = (ort = null) => {
    setBearbeiteOrt(ort)
    setFormDaten(ort
      ? { name: ort.name, kategorie: ort.kategorie || 'sonstiges', notiz: ort.notiz || '', maps_link: ort.maps_link || '' }
      : { name: '', kategorie: 'sonstiges', notiz: '', maps_link: '' }
    )
    setFormularOffen(true)
  }

  const modalSchliessen = () => {
    setFormularOffen(false)
    setBearbeiteOrt(null)
  }

  // Speichern – je nach Modus Insert oder Update
  const formSpeichern = async () => {
    if (!formDaten.name.trim()) return

    if (bearbeiteOrt) {
      // Vorhandenen Ort aktualisieren
      const { error } = await supabase
        .from('trip_orte')
        .update({
          name: formDaten.name,
          kategorie: formDaten.kategorie,
          notiz: formDaten.notiz || null,
          maps_link: formDaten.maps_link || null,
        })
        .eq('id', bearbeiteOrt.id)

      if (error) { console.error('Fehler beim Speichern:', error); return }
      setOrte(orte.map(o => o.id === bearbeiteOrt.id ? { ...o, ...formDaten } : o))
    } else {
      // Neuen Ort anlegen – trip_id als Integer übergeben
      const { data, error } = await supabase
        .from('trip_orte')
        .insert([{
          trip_id: parseInt(id, 10),
          name: formDaten.name,
          kategorie: formDaten.kategorie,
          notiz: formDaten.notiz || null,
          maps_link: formDaten.maps_link || null,
        }])
        .select()

      if (error) { console.error('Fehler beim Hinzufügen:', error); return }
      setOrte([...orte, data[0]])
    }

    modalSchliessen()
  }

  // Ort löschen
  const ortLoeschen = async (ortId) => {
    const { error } = await supabase.from('trip_orte').delete().eq('id', ortId)
    if (error) { console.error('Fehler beim Löschen:', error); return }
    setOrte(orte.filter(o => o.id !== ortId))
  }

  // Anzahl besuchter Orte (abgeleitet aus State, kein eigener State nötig)
  const besuchteAnzahl = orte.filter(o => o.besucht).length

  // Besucht-Status togglen mit optimistischem Update
  const besuchToggle = async (ort) => {
    const neuerWert = !ort.besucht
    setOrte(prev => prev.map(o => o.id === ort.id ? { ...o, besucht: neuerWert } : o))

    const { error } = await supabase
      .from('trip_orte')
      .update({ besucht: neuerWert })
      .eq('id', ort.id)

    if (error) {
      console.error('Fehler beim Besucht-Toggle:', error)
      // Rollback bei Fehler
      setOrte(prev => prev.map(o => o.id === ort.id ? { ...o, besucht: ort.besucht } : o))
    }
  }

  // Orte nach Kategorie gruppieren – besuchte ans Ende jeder Gruppe sortieren
  const orteNachKategorie = () =>
    KATEGORIEN
      .map(kat => {
        const gruppenOrte = orte.filter(o => (o.kategorie || 'sonstiges') === kat.id)
        const sortiert = [...gruppenOrte.filter(o => !o.besucht), ...gruppenOrte.filter(o => o.besucht)]
        return { ...kat, orte: sortiert }
      })
      .filter(gruppe => gruppe.orte.length > 0)

  if (laden) return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ padding: '0 clamp(14px, 4vw, 20px)', maxWidth: '600px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '90px', borderRadius: '20px', marginTop: '20px', marginBottom: '16px' }} />
        <div className="skeleton" style={{ height: '160px', borderRadius: '20px' }} />
      </div>
    </div>
  )

  return (
    <div style={{ paddingBottom: 'calc(150px + env(safe-area-inset-bottom))' }}>
      <TripNav tripName={trip.name} />

      <div style={{ padding: '0 clamp(14px, 4vw, 20px)', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* ── Einfacher Screen-Header ── */}
        <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
            backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MapPin size={18} color="var(--gold)" />
          </div>
          <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.15rem', flex: 1, letterSpacing: '-0.3px' }}>
            {t('orteUndAktivitaetenTitel')}
          </h2>
          {orte.length > 0 && (
            <span style={{ color: 'var(--text-sub)', fontSize: '0.88rem', fontWeight: '600', flexShrink: 0 }}>
              ({besuchteAnzahl}/{orte.length})
            </span>
          )}
        </div>

        {/* ── Leerer Zustand ── */}
        {orte.length === 0 ? (
          <div className="fade-in-2" style={{
            textAlign: 'center', padding: '60px 20px',
            backgroundColor: 'var(--card)', borderRadius: '24px',
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              backgroundColor: 'rgba(201,168,76,0.1)',
              border: '1.5px solid rgba(201,168,76,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <MapPin size={36} color="var(--gold)" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontWeight: '700', fontSize: '1.15rem' }}>
              {t('keineOrte')}
            </h3>
            <p style={{ color: 'var(--text-sub)', margin: '0 0 28px', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {t('keineOrteSubtitel')}
            </p>
            <button onClick={() => modalOeffnen()} className="btn-press" style={{
              backgroundColor: 'var(--gold)', color: '#0a0f1e', border: 'none',
              padding: '0 28px', minHeight: '48px', borderRadius: '14px',
              cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              boxSizing: 'border-box', boxShadow: '0 4px 16px rgba(201,168,76,0.35)',
            }}>
              <Plus size={18} /> {t('erstesOrtHinzufuegen')}
            </button>
          </div>
        ) : (
          // ── Orte nach Kategorie gruppiert ──
          orteNachKategorie().map((gruppe, gruppenIdx) => {
            const GruppeIcon = gruppe.Icon
            return (
              <div key={gruppe.id} className={`fade-in-${Math.min(gruppenIdx + 2, 5)}`}>
                {/* Kategorie-Überschrift – klickbar zum Auf-/Zuklappen */}
                <div
                  onClick={() => kategorieToggle(gruppe.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    justifyContent: 'space-between',
                    padding: '12px 0', marginTop: gruppenIdx > 0 ? '12px' : '0',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '9px',
                      backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <GruppeIcon size={15} color="var(--gold)" />
                    </div>
                    <p style={{ fontWeight: '700', color: 'var(--text)', margin: 0, fontSize: '0.92rem' }}>
                      {t(gruppe.labelKey)}
                    </p>
                    <span style={{ color: 'var(--text-sub)', fontSize: '0.78rem', fontWeight: '600' }}>
                      ({gruppe.orte.length})
                    </span>
                  </div>
                  <ChevronDown
                    size={18} color="var(--text-sub)"
                    style={{
                      flexShrink: 0,
                      transform: offeneKategorien.has(gruppe.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </div>

                {/* Ort-Karten – nur sichtbar wenn Kategorie aufgeklappt */}
                {offeneKategorien.has(gruppe.id) && gruppe.orte.map(ort => {
                  const KatInfo = KATEGORIEN.find(k => k.id === ort.kategorie) || KATEGORIEN[7]
                  const KatIcon = KatInfo.Icon
                  const mapsUrl = ort.maps_link
                    ? (ort.maps_link.startsWith('http') ? ort.maps_link : `https://${ort.maps_link}`)
                    : null

                  return (
                    <div key={ort.id} className="karte-hover" style={{
                      backgroundColor: ort.besucht ? 'rgba(76,175,80,0.04)' : 'var(--card)',
                      borderRadius: '20px',
                      boxShadow: 'var(--shadow)',
                      borderLeft: ort.besucht ? '3px solid #4caf50' : '3px solid transparent',
                      padding: 'clamp(16px, 4vw, 20px)',
                      marginBottom: '10px', boxSizing: 'border-box',
                    }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        {/* Großer Icon-Kreis – grün wenn besucht */}
                        <div style={{
                          width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
                          backgroundColor: ort.besucht ? 'rgba(76,175,80,0.12)' : 'rgba(201,168,76,0.12)',
                          border: ort.besucht ? '2px solid rgba(76,175,80,0.35)' : '2px solid rgba(201,168,76,0.28)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <KatIcon size={22} color={ort.besucht ? '#4caf50' : 'var(--gold)'} />
                        </div>

                        {/* Textinhalt */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Name + Buttons */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <p style={{ fontWeight: '800', fontSize: '1.05rem', margin: '0 0 3px', color: ort.besucht ? 'var(--text-sub)' : 'var(--text)', overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: 1.2, textDecoration: ort.besucht ? 'line-through' : 'none', textDecorationColor: 'var(--text-sub)' }}>
                              {ort.name}
                            </p>
                            <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                              {/* Besucht-Toggle */}
                              <button onClick={() => besuchToggle(ort)} className="btn-press" style={ort.besucht ? ikonButtonStyleGruen : ikonButtonStyleTransparent}>
                                <Check size={13} color={ort.besucht ? '#fff' : 'var(--text-sub)'} />
                              </button>
                              <button onClick={() => modalOeffnen(ort)} className="btn-press" style={ikonButtonStyle}>
                                <SquarePen size={13} color="var(--gold)" />
                              </button>
                              <button onClick={() => ortLoeschen(ort.id)} className="btn-press" style={ikonButtonStyleRot}>
                                <Trash2 size={13} color="#e94560" />
                              </button>
                            </div>
                          </div>

                          {/* Notiz */}
                          {ort.notiz ? (
                            <p style={{ color: 'var(--text-sub)', fontSize: '0.85rem', margin: '6px 0 0', lineHeight: 1.55, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                              {ort.notiz}
                            </p>
                          ) : null}

                          {/* Maps-Link Button */}
                          {mapsUrl ? (
                            <a
                              href={mapsUrl}
                              target="_blank" rel="noreferrer"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                marginTop: '10px',
                                backgroundColor: 'rgba(201,168,76,0.1)',
                                border: '1px solid rgba(201,168,76,0.25)',
                                borderRadius: '10px', padding: '7px 13px',
                                color: 'var(--gold)', textDecoration: 'none',
                                fontSize: '0.8rem', fontWeight: '700',
                              }}
                            >
                              <ExternalLink size={12} />
                              {t('aufMapsOeffnen')}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>

      {/* ── Floating Action Button ── */}
      <button
        onClick={() => modalOeffnen()}
        className="btn-press"
        style={{
          position: 'fixed', bottom: 'calc(92px + env(safe-area-inset-bottom))', right: '20px',
          width: '58px', height: '58px', borderRadius: '50%',
          backgroundColor: 'var(--gold)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(201,168,76,0.5)',
          zIndex: 90,
        }}
      >
        <Plus size={26} color="#0a0f1e" strokeWidth={2.5} />
      </button>

      {/* ── Bottom Sheet Modal (Neu / Bearbeiten) ── */}
      {formularOffen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="fade-in" style={{
            backgroundColor: 'var(--card)', borderRadius: '24px 24px 0 0',
            padding: '24px 20px', paddingBottom: 'calc(32px + env(safe-area-inset-bottom))',
            width: '100%', maxWidth: '600px',
            maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box',
          }}>
            {/* Griff */}
            <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--sub)', borderRadius: '2px', margin: '0 auto 20px' }} />

            {/* Titel + Schließen */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.2rem' }}>
                {bearbeiteOrt ? t('ortBearbeitenTitel') : t('neuerOrtTitel')}
              </h3>
              <button onClick={modalSchliessen} style={{
                background: 'var(--sub)', border: 'none', borderRadius: '50%',
                width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-sub)', flexShrink: 0,
              }}>
                <X size={16} />
              </button>
            </div>

            {/* Name Eingabe */}
            <input
              placeholder={t('ortNamePlatzhalter')}
              value={formDaten.name}
              onChange={(e) => setFormDaten({ ...formDaten, name: e.target.value })}
              style={inputStyle}
            />

            {/* Kategorie-Auswahl – 4x2 Kachel-Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
              {KATEGORIEN.map(kat => {
                const aktiv = formDaten.kategorie === kat.id
                return (
                  <button
                    key={kat.id}
                    type="button"
                    onClick={() => setFormDaten({ ...formDaten, kategorie: kat.id })}
                    className="btn-press"
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', gap: '6px',
                      backgroundColor: aktiv ? 'rgba(201,168,76,0.15)' : 'var(--sub)',
                      border: aktiv ? '1.5px solid rgba(201,168,76,0.55)' : '1.5px solid var(--input-border)',
                      borderRadius: '14px', padding: '10px 4px', minHeight: '70px',
                      cursor: 'pointer', transition: 'all 0.15s ease', boxSizing: 'border-box',
                    }}
                  >
                    <kat.Icon size={20} color={aktiv ? 'var(--gold)' : 'var(--text-sub)'} />
                    <span style={{
                      fontSize: '0.65rem', fontWeight: aktiv ? '700' : '500',
                      color: aktiv ? 'var(--gold)' : 'var(--text-sub)',
                      textAlign: 'center', lineHeight: 1.2,
                    }}>
                      {t(kat.labelKey)}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Notiz (optional) */}
            <input
              placeholder={t('ortNotizPlatzhalter')}
              value={formDaten.notiz}
              onChange={(e) => setFormDaten({ ...formDaten, notiz: e.target.value })}
              style={inputStyle}
            />

            {/* Maps Link (optional) */}
            <input
              placeholder={t('ortMapsLinkPlatzhalter')}
              value={formDaten.maps_link}
              onChange={(e) => setFormDaten({ ...formDaten, maps_link: e.target.value })}
              style={inputStyle}
            />

            {/* Speichern / Abbrechen */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button onClick={formSpeichern} className="btn-press" style={{ ...speichernButtonStyle, flex: 1 }}>
                {t('speichern')}
              </button>
              <button onClick={modalSchliessen} className="btn-press" style={{ ...abbrechenButtonStyle, flex: 1 }}>
                {t('abbrechen')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Style Objekte ──

const inputStyle = {
  width: '100%', padding: '13px 14px', backgroundColor: 'var(--input-bg)',
  border: '1px solid var(--input-border)', borderRadius: '12px',
  // min. 16px verhindert Auto-Zoom bei Fokus auf iOS Safari
  color: 'var(--text)', fontSize: '16px', minHeight: '44px',
  marginBottom: '10px', boxSizing: 'border-box',
}

const speichernButtonStyle = {
  backgroundColor: 'var(--gold)', color: '#0a0f1e', border: 'none',
  padding: '14px', minHeight: '48px', borderRadius: '14px',
  cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem',
  boxSizing: 'border-box', boxShadow: '0 4px 16px rgba(201,168,76,0.3)',
}

const abbrechenButtonStyle = {
  backgroundColor: 'transparent', color: 'var(--text-sub)',
  border: '1px solid var(--border)',
  padding: '14px', minHeight: '48px', borderRadius: '14px',
  cursor: 'pointer', boxSizing: 'border-box', fontWeight: '500',
}

const ikonButtonStyle = {
  backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)',
  cursor: 'pointer', borderRadius: '10px',
  minWidth: '44px', minHeight: '44px', boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const ikonButtonStyleRot = {
  backgroundColor: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.2)',
  cursor: 'pointer', borderRadius: '10px',
  minWidth: '44px', minHeight: '44px', boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

// Besucht-Button – nicht besucht: transparent mit grauem Border
const ikonButtonStyleTransparent = {
  backgroundColor: 'transparent', border: '1px solid rgba(136,146,164,0.35)',
  cursor: 'pointer', borderRadius: '10px',
  minWidth: '44px', minHeight: '44px', boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

// Besucht-Button – besucht: grün ausgefüllt
const ikonButtonStyleGruen = {
  backgroundColor: '#4caf50', border: '1px solid #4caf50',
  cursor: 'pointer', borderRadius: '10px',
  minWidth: '44px', minHeight: '44px', boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
