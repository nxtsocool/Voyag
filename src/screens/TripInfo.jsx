import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TripNav from '../components/TripNav'
import { Plane, Hotel, Link, Trash2, NotebookPen, SquarePen, ExternalLink } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'

function TripInfo() {
  const { id } = useParams()
  const { t } = useSettings()
  const [trip, setTrip] = useState(null)
  const [laden, setLaden] = useState(true)

  // State für Flüge
  const [fluege, setFluege] = useState([])
  const [flugFormularOffen, setFlugFormularOffen] = useState(false)
  const [bearbeiteFlug, setBearbeiteFlug] = useState(null)
  const [neuerFlug, setNeuerFlug] = useState({ titel: '', flugnummer: '', abflug: '', ankunft: '' })

  // State für Unterkünfte
  const [unterkuenfte, setUnterkuenfte] = useState([])
  const [unterkunftFormularOffen, setUnterkunftFormularOffen] = useState(false)
  const [bearbeiteUnterkunft, setBearbeiteUnterkunft] = useState(null)
  const [neueUnterkunft, setNeueUnterkunft] = useState({ titel: '', name: '', adresse: '', checkin: '', checkout: '' })

  // State für Links
  const [links, setLinks] = useState([])
  const [neuerLink, setNeuerLink] = useState({ titel: '', url: '' })
  const [linkFormularOffen, setLinkFormularOffen] = useState(false)

  // State für Notizen
  const [notizen, setNotizen] = useState('')
  const [notizenBearbeiten, setNotizenBearbeiten] = useState(false)

  useEffect(() => {
    const datenLaden = async () => {
      const { data: tripData } = await supabase
        .from('trips').select('*').eq('id', id).single()
      setTrip(tripData)
      if (tripData.notizen) setNotizen(tripData.notizen)
      else setNotizen('')

      const { data: fluegeData } = await supabase
        .from('trip_fluege').select('*').eq('trip_id', id)
      setFluege(fluegeData || [])

      const { data: unterkuenfteData } = await supabase
        .from('trip_unterkuenfte').select('*').eq('trip_id', id)
      setUnterkuenfte(unterkuenfteData || [])

      const { data: linksData } = await supabase
        .from('trip_links').select('*').eq('trip_id', id)
      setLinks(linksData || [])

      setLaden(false)
    }
    datenLaden()
  }, [id])

  // Flug hinzufügen
  const flugHinzufuegen = async () => {
    if (!neuerFlug.titel) return
    const { data, error } = await supabase
      .from('trip_fluege')
      .insert([{ ...neuerFlug, trip_id: id }])
      .select()
    if (error) console.error('Fehler:', error)
    else {
      setFluege([...fluege, data[0]])
      setNeuerFlug({ titel: '', flugnummer: '', abflug: '', ankunft: '' })
      setFlugFormularOffen(false)
    }
  }

  // Flug speichern
  const flugSpeichern = async () => {
    if (!bearbeiteFlug) return
    const { error } = await supabase
      .from('trip_fluege')
      .update({
        titel: bearbeiteFlug.titel,
        flugnummer: bearbeiteFlug.flugnummer,
        abflug: bearbeiteFlug.abflug,
        ankunft: bearbeiteFlug.ankunft,
      })
      .eq('id', bearbeiteFlug.id)
    if (error) console.error('Fehler:', error)
    else {
      setFluege(fluege.map(f => f.id === bearbeiteFlug.id ? bearbeiteFlug : f))
      setBearbeiteFlug(null)
    }
  }

  // Flug löschen
  const flugLoeschen = async (flugId) => {
    await supabase.from('trip_fluege').delete().eq('id', flugId)
    setFluege(fluege.filter(f => f.id !== flugId))
  }

  // Unterkunft hinzufügen
  const unterkunftHinzufuegen = async () => {
    if (!neueUnterkunft.titel) return
    const { data, error } = await supabase
      .from('trip_unterkuenfte')
      .insert([{ ...neueUnterkunft, trip_id: id }])
      .select()
    if (error) console.error('Fehler:', error)
    else {
      setUnterkuenfte([...unterkuenfte, data[0]])
      setNeueUnterkunft({ titel: '', name: '', adresse: '', checkin: '', checkout: '' })
      setUnterkunftFormularOffen(false)
    }
  }

  // Unterkunft speichern
  const unterkunftSpeichern = async () => {
    if (!bearbeiteUnterkunft) return
    const { error } = await supabase
      .from('trip_unterkuenfte')
      .update({
        titel: bearbeiteUnterkunft.titel,
        name: bearbeiteUnterkunft.name,
        adresse: bearbeiteUnterkunft.adresse,
        checkin: bearbeiteUnterkunft.checkin,
        checkout: bearbeiteUnterkunft.checkout,
      })
      .eq('id', bearbeiteUnterkunft.id)
    if (error) console.error('Fehler:', error)
    else {
      setUnterkuenfte(unterkuenfte.map(u => u.id === bearbeiteUnterkunft.id ? bearbeiteUnterkunft : u))
      setBearbeiteUnterkunft(null)
    }
  }

  // Unterkunft löschen
  const unterkunftLoeschen = async (unterkunftId) => {
    await supabase.from('trip_unterkuenfte').delete().eq('id', unterkunftId)
    setUnterkuenfte(unterkuenfte.filter(u => u.id !== unterkunftId))
  }

  // Link hinzufügen
  const linkHinzufuegen = async () => {
    if (!neuerLink.titel || !neuerLink.url) return
    const url = neuerLink.url.startsWith('http') ? neuerLink.url : `https://${neuerLink.url}`
    const { data, error } = await supabase
      .from('trip_links')
      .insert([{ trip_id: id, titel: neuerLink.titel, url }])
      .select()
    if (error) console.error('Fehler:', error)
    else {
      setLinks([...links, data[0]])
      setNeuerLink({ titel: '', url: '' })
      setLinkFormularOffen(false)
    }
  }

  // Link löschen
  const linkLoeschen = async (linkId) => {
    await supabase.from('trip_links').delete().eq('id', linkId)
    setLinks(links.filter(l => l.id !== linkId))
  }

  // Notizen speichern
  const notizenSpeichern = async () => {
    await supabase.from('trips').update({ notizen: notizen || null }).eq('id', id)
    setNotizenBearbeiten(false)
  }

  // Fluginfo parsen: "06:30 MUC" → { zeit: "06:30", ort: "MUC" }
  const parseFlugInfo = (text) => {
    if (!text) return { zeit: '', ort: '' }
    const leerzeichen = text.indexOf(' ')
    if (leerzeichen === -1) return { zeit: text, ort: '' }
    return {
      zeit: text.substring(0, leerzeichen),
      ort: text.substring(leerzeichen + 1),
    }
  }

  if (laden) return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ padding: '20px' }}>
        <div className="skeleton" style={{ height: '24px', borderRadius: '8px', marginBottom: '12px', width: '60%' }} />
        <div className="skeleton" style={{ height: '120px', borderRadius: '16px' }} />
      </div>
    </div>
  )

  return (
    <div style={{ paddingBottom: '100px' }}>
      <TripNav tripName={trip.name} />

      <div style={{ padding: '0 clamp(14px, 4vw, 20px)', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* ── Flüge ── */}
        <div className="fade-in-1" style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={sectionIconStyle}><Plane size={16} color="#c9a84c" /></div>
              <h3 style={sectionTitelStyle}>{t('fluegeTitel')}</h3>
            </div>
            <button onClick={() => setFlugFormularOffen(!flugFormularOffen)} className="btn-press" style={addButtonStyle}>
              {flugFormularOffen ? t('abbrechen') : t('flugHinzufuegenBtn')}
            </button>
          </div>

          {/* Flug Formular */}
          {flugFormularOffen && (
            <div className="fade-in" style={formularStyle}>
              <input placeholder={t('titelHinflugPlatzhalter')} value={neuerFlug.titel}
                onChange={(e) => setNeuerFlug({ ...neuerFlug, titel: e.target.value })}
                style={inputStyle} />
              <input placeholder={t('flugnummerPlatzhalter')} value={neuerFlug.flugnummer}
                onChange={(e) => setNeuerFlug({ ...neuerFlug, flugnummer: e.target.value })}
                style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input placeholder={t('abflugPlatzhalter')} value={neuerFlug.abflug}
                  onChange={(e) => setNeuerFlug({ ...neuerFlug, abflug: e.target.value })}
                  style={{ ...inputStyle, marginBottom: 0 }} />
                <input placeholder={t('ankunftPlatzhalter')} value={neuerFlug.ankunft}
                  onChange={(e) => setNeuerFlug({ ...neuerFlug, ankunft: e.target.value })}
                  style={{ ...inputStyle, marginBottom: 0 }} />
              </div>
              <button onClick={flugHinzufuegen} className="btn-press" style={{ ...speichernButtonStyle, marginTop: '12px' }}>
                {t('hinzufuegen')}
              </button>
            </div>
          )}

          {/* Flüge Liste */}
          {fluege.length === 0 ? (
            <p style={leerTextStyle}>{t('keineFluege')}</p>
          ) : (
            fluege.map(flug => (
              <div key={flug.id} style={{ marginBottom: '12px' }}>
                {bearbeiteFlug?.id === flug.id ? (
                  <div className="fade-in" style={formularStyle}>
                    <input placeholder={t('titelPlatzhalter')} value={bearbeiteFlug.titel}
                      onChange={(e) => setBearbeiteFlug({ ...bearbeiteFlug, titel: e.target.value })}
                      style={inputStyle} />
                    <input placeholder={t('flugnummerKurzPlatzhalter')} value={bearbeiteFlug.flugnummer}
                      onChange={(e) => setBearbeiteFlug({ ...bearbeiteFlug, flugnummer: e.target.value })}
                      style={inputStyle} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input placeholder={t('abflugKurzPlatzhalter')} value={bearbeiteFlug.abflug}
                        onChange={(e) => setBearbeiteFlug({ ...bearbeiteFlug, abflug: e.target.value })}
                        style={{ ...inputStyle, marginBottom: 0 }} />
                      <input placeholder={t('ankunftKurzPlatzhalter')} value={bearbeiteFlug.ankunft}
                        onChange={(e) => setBearbeiteFlug({ ...bearbeiteFlug, ankunft: e.target.value })}
                        style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                      <button onClick={flugSpeichern} className="btn-press" style={{ ...speichernButtonStyle, flex: 1 }}>{t('speichern')}</button>
                      <button onClick={() => setBearbeiteFlug(null)} className="btn-press" style={{ ...abbrechenButtonStyle, flex: 1 }}>{t('abbrechen')}</button>
                    </div>
                  </div>
                ) : (
                  // Ticket-Style Flugkarte
                  <div className="karte-hover" style={ticketCardStyle}>
                    {/* Ticket Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <p style={{ color: '#8892a4', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                          {flug.titel}
                        </p>
                        {flug.flugnummer && (
                          <p style={{ color: '#c9a84c', fontSize: '0.85rem', fontWeight: '700', margin: 0, letterSpacing: '0.05em' }}>
                            {flug.flugnummer}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setBearbeiteFlug(flug)} className="btn-press" style={ikonButtonStyle}>
                          <SquarePen size={13} color="#c9a84c" />
                        </button>
                        <button onClick={() => flugLoeschen(flug.id)} className="btn-press" style={ikonButtonStyleRot}>
                          <Trash2 size={13} color="#e94560" />
                        </button>
                      </div>
                    </div>

                    {/* Ticket Visual – Abflug ←→ Ankunft */}
                    {(flug.abflug || flug.ankunft) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Abflug */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', fontWeight: '800', margin: '0 0 2px', color: '#fff', lineHeight: 1 }}>
                            {parseFlugInfo(flug.abflug).zeit}
                          </p>
                          <p style={{ color: '#8892a4', fontSize: '0.78rem', margin: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                            {parseFlugInfo(flug.abflug).ort}
                          </p>
                        </div>

                        {/* Trennlinie mit Plane Icon */}
                        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, padding: '0 4px' }}>
                          <div style={{ width: '28px', borderTop: '1.5px dashed rgba(201,168,76,0.35)' }} />
                          <Plane size={15} color="#c9a84c" style={{ margin: '0 4px', flexShrink: 0 }} />
                          <div style={{ width: '28px', borderTop: '1.5px dashed rgba(201,168,76,0.35)' }} />
                        </div>

                        {/* Ankunft */}
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                          <p style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', fontWeight: '800', margin: '0 0 2px', color: '#fff', lineHeight: 1 }}>
                            {parseFlugInfo(flug.ankunft).zeit}
                          </p>
                          <p style={{ color: '#8892a4', fontSize: '0.78rem', margin: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                            {parseFlugInfo(flug.ankunft).ort}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* ── Unterkünfte ── */}
        <div className="fade-in-2" style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={sectionIconStyle}><Hotel size={16} color="#c9a84c" /></div>
              <h3 style={sectionTitelStyle}>{t('unterkuenfteTitel')}</h3>
            </div>
            <button onClick={() => setUnterkunftFormularOffen(!unterkunftFormularOffen)} className="btn-press" style={addButtonStyle}>
              {unterkunftFormularOffen ? t('abbrechen') : t('unterkunftHinzufuegenBtn')}
            </button>
          </div>

          {/* Unterkunft Formular */}
          {unterkunftFormularOffen && (
            <div className="fade-in" style={formularStyle}>
              <input placeholder={t('titelHotelWochePlatzhalter')} value={neueUnterkunft.titel}
                onChange={(e) => setNeueUnterkunft({ ...neueUnterkunft, titel: e.target.value })}
                style={inputStyle} />
              <input placeholder={t('nameHotelPlatzhalter')} value={neueUnterkunft.name}
                onChange={(e) => setNeueUnterkunft({ ...neueUnterkunft, name: e.target.value })}
                style={inputStyle} />
              <input placeholder={t('adresse')} value={neueUnterkunft.adresse}
                onChange={(e) => setNeueUnterkunft({ ...neueUnterkunft, adresse: e.target.value })}
                style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input placeholder={t('checkinPlatzhalter')} value={neueUnterkunft.checkin}
                  onChange={(e) => setNeueUnterkunft({ ...neueUnterkunft, checkin: e.target.value })}
                  style={{ ...inputStyle, marginBottom: 0 }} />
                <input placeholder={t('checkoutPlatzhalter')} value={neueUnterkunft.checkout}
                  onChange={(e) => setNeueUnterkunft({ ...neueUnterkunft, checkout: e.target.value })}
                  style={{ ...inputStyle, marginBottom: 0 }} />
              </div>
              <button onClick={unterkunftHinzufuegen} className="btn-press" style={{ ...speichernButtonStyle, marginTop: '12px' }}>
                {t('hinzufuegen')}
              </button>
            </div>
          )}

          {/* Unterkünfte Liste */}
          {unterkuenfte.length === 0 ? (
            <p style={leerTextStyle}>{t('keineUnterkuenfte')}</p>
          ) : (
            unterkuenfte.map(unterkunft => (
              <div key={unterkunft.id} style={{ marginBottom: '12px' }}>
                {bearbeiteUnterkunft?.id === unterkunft.id ? (
                  <div className="fade-in" style={formularStyle}>
                    <input placeholder={t('titelPlatzhalter')} value={bearbeiteUnterkunft.titel}
                      onChange={(e) => setBearbeiteUnterkunft({ ...bearbeiteUnterkunft, titel: e.target.value })}
                      style={inputStyle} />
                    <input placeholder={t('name')} value={bearbeiteUnterkunft.name}
                      onChange={(e) => setBearbeiteUnterkunft({ ...bearbeiteUnterkunft, name: e.target.value })}
                      style={inputStyle} />
                    <input placeholder={t('adresse')} value={bearbeiteUnterkunft.adresse}
                      onChange={(e) => setBearbeiteUnterkunft({ ...bearbeiteUnterkunft, adresse: e.target.value })}
                      style={inputStyle} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input placeholder={t('checkinKurzPlatzhalter')} value={bearbeiteUnterkunft.checkin}
                        onChange={(e) => setBearbeiteUnterkunft({ ...bearbeiteUnterkunft, checkin: e.target.value })}
                        style={{ ...inputStyle, marginBottom: 0 }} />
                      <input placeholder={t('checkoutKurzPlatzhalter')} value={bearbeiteUnterkunft.checkout}
                        onChange={(e) => setBearbeiteUnterkunft({ ...bearbeiteUnterkunft, checkout: e.target.value })}
                        style={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                      <button onClick={unterkunftSpeichern} className="btn-press" style={{ ...speichernButtonStyle, flex: 1 }}>{t('speichern')}</button>
                      <button onClick={() => setBearbeiteUnterkunft(null)} className="btn-press" style={{ ...abbrechenButtonStyle, flex: 1 }}>{t('abbrechen')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="karte-hover" style={unterkunftCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontWeight: '700', margin: '0 0 2px', color: '#c9a84c', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                          {unterkunft.titel}
                        </p>
                        {unterkunft.name && (
                          <p style={{ color: '#fff', fontSize: '0.9rem', margin: 0, fontWeight: '500', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                            {unterkunft.name}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                        <button onClick={() => setBearbeiteUnterkunft(unterkunft)} className="btn-press" style={ikonButtonStyle}>
                          <SquarePen size={13} color="#c9a84c" />
                        </button>
                        <button onClick={() => unterkunftLoeschen(unterkunft.id)} className="btn-press" style={ikonButtonStyleRot}>
                          <Trash2 size={13} color="#e94560" />
                        </button>
                      </div>
                    </div>

                    {/* Check-in / Check-out prominent */}
                    {(unterkunft.checkin || unterkunft.checkout) && (
                      <div style={{ display: 'flex', gap: '12px', marginBottom: unterkunft.adresse ? '12px' : '0' }}>
                        {unterkunft.checkin && (
                          <div style={{ flex: 1, backgroundColor: 'rgba(8,13,26,0.6)', borderRadius: '10px', padding: '10px 12px' }}>
                            <p style={{ color: '#8892a4', fontSize: '0.65rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>{t('checkinKurzPlatzhalter')}</p>
                            <p style={{ color: '#fff', fontWeight: '700', margin: 0, fontSize: '0.95rem' }}>{unterkunft.checkin}</p>
                          </div>
                        )}
                        {unterkunft.checkout && (
                          <div style={{ flex: 1, backgroundColor: 'rgba(8,13,26,0.6)', borderRadius: '10px', padding: '10px 12px' }}>
                            <p style={{ color: '#8892a4', fontSize: '0.65rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>{t('checkoutKurzPlatzhalter')}</p>
                            <p style={{ color: '#fff', fontWeight: '700', margin: 0, fontSize: '0.95rem' }}>{unterkunft.checkout}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {unterkunft.adresse && (
                      <p style={{ color: '#8892a4', fontSize: '0.82rem', margin: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                        {unterkunft.adresse}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* ── Links ── */}
        <div className="fade-in-3" style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={sectionIconStyle}><Link size={16} color="#c9a84c" /></div>
              <h3 style={sectionTitelStyle}>{t('linksTitel')}</h3>
            </div>
            <button onClick={() => setLinkFormularOffen(!linkFormularOffen)} className="btn-press" style={addButtonStyle}>
              {linkFormularOffen ? t('abbrechen') : t('linkHinzufuegenBtn')}
            </button>
          </div>

          {linkFormularOffen && (
            <div className="fade-in" style={formularStyle}>
              <input placeholder={t('titelHotelBookingPlatzhalter')} value={neuerLink.titel}
                onChange={(e) => setNeuerLink({ ...neuerLink, titel: e.target.value })}
                style={inputStyle} />
              <input placeholder={t('urlPlatzhalter')} value={neuerLink.url}
                onChange={(e) => setNeuerLink({ ...neuerLink, url: e.target.value })}
                style={inputStyle} />
              <button onClick={linkHinzufuegen} className="btn-press" style={speichernButtonStyle}>{t('hinzufuegen')}</button>
            </div>
          )}

          {/* Links als Chips */}
          {links.length === 0 ? (
            <p style={leerTextStyle}>{t('keineLinks')}</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {links.map(link => (
                <div key={link.id} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  backgroundColor: '#1a2235',
                  border: '1px solid rgba(201,168,76,0.15)',
                  borderRadius: '50px',
                  padding: '8px 14px',
                }}>
                  <a href={link.url} target="_blank" rel="noreferrer" style={{
                    color: '#c9a84c', textDecoration: 'none',
                    fontSize: '0.85rem', fontWeight: '600',
                    display: 'flex', alignItems: 'center', gap: '5px',
                  }}>
                    <ExternalLink size={12} />
                    {link.titel}
                  </a>
                  <button onClick={() => linkLoeschen(link.id)} className="btn-press" style={{
                    background: 'none', border: 'none', color: '#8892a4',
                    cursor: 'pointer', lineHeight: 1, margin: '-9px -6px -9px 0',
                    width: '34px', height: '34px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
                  }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Notizen ── */}
        <div className="fade-in-4" style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={sectionIconStyle}><NotebookPen size={16} color="#c9a84c" /></div>
              <h3 style={sectionTitelStyle}>{t('notizenTitel')}</h3>
            </div>
            <button onClick={() => setNotizenBearbeiten(!notizenBearbeiten)} className="btn-press" style={addButtonStyle}>
              {notizenBearbeiten ? t('abbrechen') : t('bearbeiten')}
            </button>
          </div>

          {notizenBearbeiten ? (
            <div className="fade-in">
              <textarea value={notizen}
                onChange={(e) => setNotizen(e.target.value)}
                placeholder={t('notizenPlatzhalter')}
                rows={6}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.6' }}
              />
              <button onClick={notizenSpeichern} className="btn-press" style={speichernButtonStyle}>{t('speichern')}</button>
            </div>
          ) : (
            <p style={{
              color: notizen ? '#ffffff' : '#8892a4',
              fontSize: '0.9rem', margin: 0,
              whiteSpace: 'pre-wrap', lineHeight: '1.7',
            }}>
              {notizen || t('keineNotizen')}
            </p>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Style Objekte ──

const sectionStyle = {
  backgroundColor: '#111827',
  borderRadius: '22px',
  padding: 'clamp(18px, 4vw, 24px)',
  marginBottom: '16px',
  boxSizing: 'border-box',
  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
}

const sectionHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '18px',
  flexWrap: 'wrap', gap: '10px',
}

const sectionIconStyle = {
  width: '34px', height: '34px',
  borderRadius: '10px',
  backgroundColor: 'rgba(201,168,76,0.1)',
  border: '1px solid rgba(201,168,76,0.18)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
}

const sectionTitelStyle = {
  margin: 0, fontWeight: '700', fontSize: '1rem',
}

const ticketCardStyle = {
  backgroundColor: '#1a2235',
  borderRadius: '16px',
  padding: '16px',
  boxSizing: 'border-box',
}

const unterkunftCardStyle = {
  backgroundColor: '#1a2235',
  borderRadius: '16px',
  padding: '16px',
  boxSizing: 'border-box',
}

const formularStyle = {
  backgroundColor: 'rgba(8,13,26,0.5)',
  borderRadius: '16px',
  padding: '16px',
  marginBottom: '12px',
  boxSizing: 'border-box',
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

const addButtonStyle = {
  backgroundColor: 'transparent',
  border: '1px solid rgba(201,168,76,0.3)',
  color: '#c9a84c', padding: '8px 14px',
  minHeight: '44px', borderRadius: '50px', boxSizing: 'border-box',
  cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
  display: 'flex', alignItems: 'center',
  whiteSpace: 'nowrap',
}

const speichernButtonStyle = {
  backgroundColor: '#c9a84c', color: '#0a0f1e', border: 'none',
  padding: '14px', minHeight: '48px', borderRadius: '14px',
  cursor: 'pointer', width: '100%', fontWeight: '700',
  fontSize: '0.95rem', boxSizing: 'border-box',
  boxShadow: '0 4px 16px rgba(201,168,76,0.3)',
}

const abbrechenButtonStyle = {
  backgroundColor: 'transparent', color: '#fff',
  border: '1px solid rgba(255,255,255,0.15)',
  padding: '14px', minHeight: '48px', borderRadius: '14px',
  cursor: 'pointer', boxSizing: 'border-box', fontWeight: '500',
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

const leerTextStyle = {
  color: '#8892a4', fontSize: '0.88rem', margin: 0,
  fontStyle: 'italic',
}

export default TripInfo
