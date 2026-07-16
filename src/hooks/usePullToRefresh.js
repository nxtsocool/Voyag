import { useState, useEffect, useRef } from 'react'

// Pull-to-Refresh nur über native Touch Events, ohne externe Library
export default function usePullToRefresh(onRefresh) {
  const [ziehen, setZiehen] = useState(false)
  const [fortschritt, setFortschritt] = useState(0)
  const startY = useRef(0)
  const fortschrittRef = useRef(0)
  const SCHWELLENWERT = 80 // px zum Auslösen

  useEffect(() => {
    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY
      }
    }

    const handleTouchMove = (e) => {
      if (startY.current === 0) return
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0 && window.scrollY === 0) {
        const neuerFortschritt = Math.min(delta, SCHWELLENWERT * 1.5)
        fortschrittRef.current = neuerFortschritt
        setFortschritt(neuerFortschritt)
      }
    }

    const handleTouchEnd = async () => {
      if (fortschrittRef.current >= SCHWELLENWERT) {
        setZiehen(true)
        await onRefresh()
        setZiehen(false)
      }
      fortschrittRef.current = 0
      setFortschritt(0)
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
  }, [onRefresh])

  return { ziehen, fortschritt, schwellenwert: SCHWELLENWERT }
}
