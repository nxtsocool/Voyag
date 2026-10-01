// Einheitlicher Style für native <select>-Dropdowns (Währung, Land, …) – an
// einer Stelle definiert statt in jedem Screen dupliziert, da der eigene
// Chevron als eingebettetes SVG sonst mehrfach in Sync gehalten werden müsste.
export const selectStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '13px 40px 13px 14px', // rechts Platz für den eigenen Pfeil
  minHeight: '48px',
  backgroundColor: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  borderRadius: '12px',
  color: 'var(--text)',
  fontSize: '16px', // verhindert iOS Auto-Zoom
  fontFamily: 'inherit',
  fontWeight: '500',
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  cursor: 'pointer',
  // Eigener Chevron als SVG, damit er in beiden Themes sichtbar ist
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238892a4' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
}
