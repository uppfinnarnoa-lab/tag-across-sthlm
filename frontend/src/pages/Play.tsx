import { useState } from 'react';
import { Link } from 'react-router-dom';

interface Card {
  id: number;
  type: string;
  name: string;
  value: number;
}

export default function Play() {
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [error, setError] = useState('');

  const drawCard = async (type: 'destination' | 'challenge') => {
    try {
      const res = await fetch('http://localhost:3001/api/cards/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error);
        setDrawnCard(null);
      } else {
        setError('');
        setDrawnCard(data.card);
      }
    } catch (e) {
      setError('Kunde inte ansluta till servern.');
    }
  };

  return (
    <>
      <h1>SPELVY</h1>
      
      <div className="pixel-panel" style={{ minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        {error ? (
          <p style={{ color: 'var(--sl-red)' }}>{error}</p>
        ) : drawnCard ? (
          <>
            <h3 style={{ color: drawnCard.type === 'destination' ? 'var(--sl-blue)' : 'var(--sl-green)' }}>
              {drawnCard.type === 'destination' ? 'DESTINATION' : 'UTMANING'}
            </h3>
            <h2 style={{ margin: '16px 0' }}>{drawnCard.name}</h2>
            <p>Värde: {drawnCard.type === 'destination' ? drawnCard.value + ' p' : drawnCard.value + 'x'}</p>
          </>
        ) : (
          <p>Inget kort draget.</p>
        )}
      </div>

      <button className="blue" onClick={() => drawCard('destination')}>Dra Destinationskort</button>
      <button className="green" onClick={() => drawCard('challenge')}>Dra Extrauppdrag</button>
      
      <button className="red" style={{ marginTop: '32px' }}>TAGEN!</button>

      <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '16px', color: 'var(--text-color)', fontSize: '10px' }}>
        &lt; Tillbaka till Leaderboard
      </Link>
    </>
  );
}
