// Einzige Währungsliste der App (K1) – ISO-Code ist der kanonische Wert
// (gespeichert in trips.waehrung und profiles.waehrung), symbol nur für die
// Anzeige. Nur Währungen, die frankfurter.app unterstützt.
export const WAEHRUNGEN = [
  { iso: 'EUR', symbol: '€', name_de: 'Euro', name_en: 'Euro' },
  { iso: 'USD', symbol: '$', name_de: 'US-Dollar', name_en: 'US Dollar' },
  { iso: 'GBP', symbol: '£', name_de: 'Brit. Pfund', name_en: 'British Pound' },
  { iso: 'CHF', symbol: 'CHF', name_de: 'Schweizer Franken', name_en: 'Swiss Franc' },
  { iso: 'JPY', symbol: '¥', name_de: 'Japan. Yen', name_en: 'Japanese Yen' },
  { iso: 'CZK', symbol: 'Kč', name_de: 'Tsch. Krone', name_en: 'Czech Koruna' },
  { iso: 'HUF', symbol: 'Ft', name_de: 'Ungar. Forint', name_en: 'Hungarian Forint' },
  { iso: 'PLN', symbol: 'zł', name_de: 'Poln. Zloty', name_en: 'Polish Zloty' },
  { iso: 'SEK', symbol: 'kr', name_de: 'Schwed. Krone', name_en: 'Swedish Krona' },
  { iso: 'NOK', symbol: 'kr', name_de: 'Norweg. Krone', name_en: 'Norwegian Krone' },
  { iso: 'DKK', symbol: 'kr', name_de: 'Dän. Krone', name_en: 'Danish Krone' },
  { iso: 'TRY', symbol: '₺', name_de: 'Türk. Lira', name_en: 'Turkish Lira' },
  { iso: 'THB', symbol: '฿', name_de: 'Thail. Baht', name_en: 'Thai Baht' },
  { iso: 'AUD', symbol: 'A$', name_de: 'Austral. Dollar', name_en: 'Australian Dollar' },
  { iso: 'CAD', symbol: 'C$', name_de: 'Kanad. Dollar', name_en: 'Canadian Dollar' },
]

// Alte, vor K1 gespeicherte Profil-Werte waren Symbole statt ISO-Codes –
// beim Laden auf den passenden ISO-Code mappen, Fallback EUR
const LEGACY_SYMBOL_ZU_ISO = {
  '€': 'EUR', '$': 'USD', '£': 'GBP', '¥': 'JPY', '₺': 'TRY',
  'CHF': 'CHF', 'Ft': 'HUF', 'Kč': 'CZK', 'kr': 'SEK', 'zł': 'PLN',
}

export function symbolOderIsoZuIso(wert) {
  if (!wert) return 'EUR'
  if (WAEHRUNGEN.some(w => w.iso === wert)) return wert
  return LEGACY_SYMBOL_ZU_ISO[wert] || 'EUR'
}

// Land-Code → Standardwährung (ISO), für die Vorbelegung beim Anlegen einer Reise
const LAND_WAEHRUNG = {
  DE: 'EUR', AT: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR',
  IE: 'EUR', FI: 'EUR', GR: 'EUR', SK: 'EUR', SI: 'EUR', LU: 'EUR', MT: 'EUR', CY: 'EUR',
  EE: 'EUR', LV: 'EUR', LT: 'EUR', HR: 'EUR',
  CH: 'CHF', LI: 'CHF',
  GB: 'GBP',
  US: 'USD',
  JP: 'JPY',
  CZ: 'CZK',
  HU: 'HUF',
  PL: 'PLN',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  TR: 'TRY',
  TH: 'THB',
  AU: 'AUD',
  CA: 'CAD',
}

export function waehrungFuerLand(landCode) {
  return LAND_WAEHRUNG[landCode] || 'EUR'
}
