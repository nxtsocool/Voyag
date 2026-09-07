import { useState, useEffect } from 'react'

// Liefert den aktuellen Online-Status des Geräts und hält ihn per
// online/offline-Events aktuell (z.B. für einen Offline-Hinweis-Banner)
export default function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const setzeOnline = () => setOnline(true)
    const setzeOffline = () => setOnline(false)
    window.addEventListener('online', setzeOnline)
    window.addEventListener('offline', setzeOffline)
    return () => {
      window.removeEventListener('online', setzeOnline)
      window.removeEventListener('offline', setzeOffline)
    }
  }, [])

  return online
}
