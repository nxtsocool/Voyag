// Zeigt einen goldenen Kompass-Ladeindikator der sich beim Pull-to-Refresh dreht
function PullToRefreshIndicator({ ziehen, fortschritt, schwellenwert }) {
  if (fortschritt <= 0 && !ziehen) return null

  const sichtbarkeit = Math.min(fortschritt / schwellenwert, 1)
  const rotation = ziehen ? null : (fortschritt / schwellenwert) * 360

  return (
    <div style={{
      position: 'fixed',
      top: 'calc(10px + env(safe-area-inset-top))',
      left: 0, right: 0, marginLeft: 'auto', marginRight: 'auto',
      width: '44px',
      transform: `translateY(${sichtbarkeit * 6}px)`,
      opacity: sichtbarkeit,
      zIndex: 200,
      pointerEvents: 'none',
      transition: ziehen ? 'none' : 'opacity 0.2s ease, transform 0.2s ease',
    }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '50%',
        backgroundColor: 'var(--card)',
        border: '1px solid rgba(201,168,76,0.25)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg
          width="22" height="22" viewBox="0 0 60 60"
          style={{
            transform: ziehen ? 'none' : `rotate(${rotation}deg)`,
            animation: ziehen ? 'pullSpin 0.8s linear infinite' : 'none',
          }}
        >
          <circle cx="30" cy="30" r="27" fill="none" stroke="var(--gold)" strokeWidth="4" />
          <polygon points="30,5 34,30 30,26 26,30" fill="var(--gold)" />
          <polygon points="30,55 34,30 30,34 26,30" fill="#ffffff" opacity="0.15" />
          <circle cx="30" cy="30" r="4" fill="var(--gold)" />
          <circle cx="30" cy="30" r="2" fill="var(--bg)" />
        </svg>
      </div>
    </div>
  )
}

export default PullToRefreshIndicator
