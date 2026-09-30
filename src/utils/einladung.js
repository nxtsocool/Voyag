// Merkt einen Einladungscode, wenn ein nicht eingeloggter Nutzer über einen
// /join/:code Link in die App kommt – in localStorage (überlebt Tab-Schließen
// und die Registrierung/Email-Bestätigung, anders als sessionStorage), mit
// Zeitstempel, damit ein sehr alter Code nicht plötzlich Monate später wieder
// automatisch greift (K14).
const KEY = 'voyag_pending_invite'
const GUELTIGKEIT_MS = 7 * 24 * 60 * 60 * 1000 // 7 Tage

export function einladungSpeichern(code) {
  localStorage.setItem(KEY, JSON.stringify({ code, zeitstempel: Date.now() }))
}

// Gibt den gemerkten Code zurück, oder null wenn keiner vorhanden/abgelaufen ist
export function einladungLesen() {
  const roh = localStorage.getItem(KEY)
  if (!roh) return null
  try {
    const { code, zeitstempel } = JSON.parse(roh)
    if (!code || Date.now() - zeitstempel > GUELTIGKEIT_MS) {
      localStorage.removeItem(KEY)
      return null
    }
    return code
  } catch {
    localStorage.removeItem(KEY)
    return null
  }
}

export function einladungEntfernen() {
  localStorage.removeItem(KEY)
}
