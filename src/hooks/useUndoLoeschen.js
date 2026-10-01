import { useRef, useEffect } from 'react'
import useToast from './useToast.jsx'

const UNDO_DAUER_MS = 5000

// Ersetzt sofortiges Löschen durch: Eintrag sofort aus der lokalen Liste
// ausblenden + Toast mit "Rückgängig"-Button (5s) – erst danach wird
// wirklich auf dem Server gelöscht (W4). Verlässt der Nutzer den Screen,
// werden alle noch offenen Löschungen sofort ausgeführt (Cleanup beim Unmount),
// damit nichts "in der Luft hängen" bleibt.
export default function useUndoLoeschen() {
  const { toasts, setToasts, toast } = useToast()
  const ausstehendRef = useRef(new Map())

  useEffect(() => {
    const ausstehend = ausstehendRef.current
    return () => {
      ausstehend.forEach(({ timeoutId, ausfuehren }) => {
        clearTimeout(timeoutId)
        ausfuehren()
      })
      ausstehend.clear()
    }
  }, [])

  // id: eindeutiger Schlüssel des Eintrags (z. B. die DB-ID)
  // entfernenLokal: blendet den Eintrag sofort aus der lokalen Liste aus
  // wiederherstellenLokal: macht das bei "Rückgängig" wieder rückgängig
  // ausfuehren: führt nach Ablauf der Frist das eigentliche Server-Delete aus
  // nachricht / rueckgaengigLabel: Toast-Texte
  const loeschenMitUndo = (id, { entfernenLokal, wiederherstellenLokal, ausfuehren, nachricht, rueckgaengigLabel }) => {
    entfernenLokal()

    const timeoutId = setTimeout(() => {
      ausstehendRef.current.delete(id)
      ausfuehren()
    }, UNDO_DAUER_MS)

    ausstehendRef.current.set(id, { timeoutId, ausfuehren })

    toast(nachricht, 'info', {
      dauer: UNDO_DAUER_MS,
      aktion: {
        label: rueckgaengigLabel,
        onClick: () => {
          const bestehend = ausstehendRef.current.get(id)
          if (!bestehend) return
          clearTimeout(bestehend.timeoutId)
          ausstehendRef.current.delete(id)
          wiederherstellenLokal()
        },
      },
    })
  }

  return { toasts, setToasts, toast, loeschenMitUndo }
}
