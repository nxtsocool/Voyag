import { useEffect } from 'react'

// Sperrt den Body-Scroll solange offen=true und stellt beim Schließen exakt
// die vorherige Scroll-Position wieder her (verhindert iOS Safari Scroll-Bugs
// bei offenen Bottom Sheets/Modals)
export default function useBodyScrollLock(offen) {
  useEffect(() => {
    if (!offen) return
    const y = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${y}px`
    document.body.style.width = '100%'
    return () => {
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, parseInt(scrollY || '0') * -1)
    }
  }, [offen])
}
