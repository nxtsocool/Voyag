import { useState, useCallback } from 'react'

export default function useToast() {
  const [toasts, setToasts] = useState([])

  // Toast anzeigen – typ: 'success', 'error', 'info'
  const toast = useCallback((nachricht, typ = 'info') => {
    const id = Date.now()
    setToasts(t => [...t, { id, nachricht, typ }])
    // Nach 3 Sekunden automatisch entfernen
    setTimeout(() => {
      setToasts(t => t.filter(t => t.id !== id))
    }, 3000)
  }, [])

  return { toasts, setToasts, toast }
}