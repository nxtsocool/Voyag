import { supabase } from '../supabase'

function SettingsScreen() {
  const ausloggen = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '80px' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '30px' }}>
        Ein<span style={{ color: '#c9a84c' }}>stellungen</span>
      </h1>

      <p style={{ color: '#8892a4', marginBottom: '30px' }}>Kommt bald...</p>

      <button onClick={ausloggen} style={{
        backgroundColor: 'transparent',
        
        border: '1px solid #c9a84c',
        color: '#c9a84c', padding: '12px',
        borderRadius: '12px', cursor: 'pointer',
        width: '25%', fontSize: '0.9rem',
      }}>
        Ausloggen
      </button>
    </div>
  )
}

export default SettingsScreen