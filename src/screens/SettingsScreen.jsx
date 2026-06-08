import { supabase } from '../supabase'

function SettingsScreen() {
  const ausloggen = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ padding: 'clamp(14px, 4vw, 20px)', maxWidth: '600px', margin: '0 auto', paddingBottom: 'calc(90px + env(safe-area-inset-bottom))', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '30px' }}>
        Ein<span style={{ color: '#c9a84c' }}>stellungen</span>
      </h1>

      <p style={{ color: '#8892a4', marginBottom: '30px' }}>Kommt bald...</p>

      <button onClick={ausloggen} style={{
        backgroundColor: 'transparent',
        border: '1px solid #c9a84c',
        color: '#c9a84c', padding: '14px 28px', minHeight: '44px',
        borderRadius: '12px', cursor: 'pointer',
        width: 'auto', minWidth: '160px', fontSize: '0.9rem',
        boxSizing: 'border-box', whiteSpace: 'nowrap',
      }}>
        Ausloggen
      </button>
    </div>
  )
}

export default SettingsScreen