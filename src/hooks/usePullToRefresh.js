import { useState, useEffect, useRef } from 'react'

// Pull-to-Refresh nur über native Touch Events, ohne externe Library
export default function usePullToRefresh(onRefresh) {
  const [ziehen, setZiehen] = useState(false)
  const [fortschritt, setFortschritt] = useState(0)
  const startX = useRef(0)
  const startY = useRef(0)
  const fortschrittRef = useRef(0)
  const aktivRef = useRef(false) // Geste wurde am Seitenanfang vertikal gestartet
  const onRefreshRef = useRef(onRefresh)
  const SCHWELLENWERT = 80 // px zum Auslösen

  // Immer die aktuelle onRefresh-Funktion verwenden, ohne die Listener neu zu registrieren
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const amSeitenanfang = () => document.scrollingElement.scrollTop <= 0

    const handleTouchStart = (e) => {
      // Nicht auslösen, wenn ein Bottom-Sheet offen ist (useBodyScrollLock setzt
      // body auf position: fixed) oder die Seite nicht ganz oben steht
      if (document.body.style.position === 'fixed' || !amSeitenanfang()) {
        aktivRef.current = false
        return
      }
      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
      aktivRef.current = true
    }

    const handleTouchMove = (e) => {
      if (!aktivRef.current) return
      if (document.body.style.position === 'fixed' || !amSeitenanfang()) {
        aktivRef.current = false
        fortschrittRef.current = 0
        setFortschritt(0)
        return
      }

      const deltaX = e.touches[0].clientX - startX.current
      const deltaY = e.touches[0].clientY - startY.current

      // Eher horizontale als vertikale Geste → kein Pull-to-Refresh (z. B. Swipe auf einer Liste)
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        aktivRef.current = false
        fortschrittRef.current = 0
        setFortschritt(0)
        return
      }

      if (deltaY > 0) {
        const neuerFortschritt = Math.min(deltaY, SCHWELLENWERT * 1.5)
        fortschrittRef.current = neuerFortschritt
        setFortschritt(neuerFortschritt)
      }
    }

    const handleTouchEnd = async () => {
      if (aktivRef.current && fortschrittRef.current >= SCHWELLENWERT) {
        setZiehen(true)
        await onRefreshRef.current()
        setZiehen(false)
      }
      aktivRef.current = false
      fortschrittRef.current = 0
      setFortschritt(0)
      startX.current = 0
      startY.current = 0
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  return { ziehen, fortschritt, schwellenwert: SCHWELLENWERT }
}
