import { useState, useCallback } from 'react'

export default function useToast() {
  const [toasts, setToasts] = useState([])

  // Toast anzeigen – typ: 'success', 'error', 'info'. Optionen:
  // dauer (ms, Standard 3000) und aktion ({ label, onClick }) für einen
  // Action-Button im Toast selbst (z. B. "Rückgängig", siehe useUndoLoeschen)
  const toast = useCallback((nachricht, typ = 'info', optionen = {}) => {
    const id = Date.now()
    const dauer = optionen.dauer || 3000
    setToasts(t => [...t, { id, nachricht, typ, aktion: optionen.aktion || null }])
    setTimeout(() => {
      setToasts(t => t.filter(t => t.id !== id))
    }, dauer)
    return id
  }, [])

  return { toasts, setToasts, toast }
}