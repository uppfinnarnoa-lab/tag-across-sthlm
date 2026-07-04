import { useState } from 'react';

export default function Login({ onLogin }: { onLogin: (team: any) => void }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error);
      } else {
        localStorage.setItem('team', JSON.stringify(data.team));
        onLogin(data.team);
      }
    } catch (e) {
      setError('Kunde inte ansluta till servern.');
    }
  };

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <img src="/bosse.png" alt="Bosse" className="bounce" style={{ width: '64px', height: '64px', imageRendering: 'pixelated', display: 'inline-block' }} />
        <h1>TÅG ACROSS STHLM</h1>
      </div>

      <div className="pixel-panel" style={{ textAlign: 'center' }}>
        <h2>LOGGA IN</h2>
        {error && <p style={{ color: 'var(--sl-red)' }}>{error}</p>}
        <input 
          type="password" 
          placeholder="PIN-KOD" 
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          style={{ width: '100%', padding: '12px', fontSize: '16px', marginBottom: '16px', fontFamily: 'inherit' }}
        />
        <button className="blue" onClick={handleLogin}>Logga In</button>
      </div>
    </>
  );
}
