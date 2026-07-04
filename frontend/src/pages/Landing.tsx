import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing({ onJoin }: { onJoin: (player: any) => void }) {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/auth/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, name })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error);
      } else {
        localStorage.setItem('player', JSON.stringify(data.player));
        localStorage.setItem('game_pin', pin);
        onJoin(data.player);
      }
    } catch (e) {
      setError('Kunde inte ansluta till servern.');
    }
  };

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <img src="/bosse.png" alt="Bosse" className="bounce" style={{ width: '96px', height: '96px', imageRendering: 'pixelated', display: 'inline-block' }} />
        <h1>TÅG ACROSS STHLM</h1>
      </div>

      <div className="pixel-panel" style={{ textAlign: 'center' }}>
        <h2>GÅ MED I SPEL</h2>
        {error && <p style={{ color: 'var(--sl-red)' }}>{error}</p>}
        
        <input 
          type="text" 
          placeholder="SPEL-PIN (4 siffror)" 
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{ width: '100%', padding: '16px', fontSize: '16px', marginBottom: '16px', fontFamily: 'inherit', textAlign: 'center' }}
        />
        
        <input 
          type="text" 
          placeholder="DITT NAMN" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', padding: '16px', fontSize: '16px', marginBottom: '16px', fontFamily: 'inherit', textAlign: 'center' }}
        />

        <button className="green" onClick={handleJoin} style={{ padding: '24px', fontSize: '16px' }}>GÅ MED</button>
      </div>

      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <button className="blue" onClick={() => navigate('/install')} style={{ width: 'auto', padding: '12px', marginRight: '8px' }}>APP INSTALL</button>
        <button className="yellow" onClick={() => navigate('/admin')} style={{ width: 'auto', padding: '12px' }}>DOMARE / ADMIN</button>
      </div>
    </>
  );
}
