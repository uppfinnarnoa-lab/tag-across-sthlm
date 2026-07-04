import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState('Laddar backend...');

  useEffect(() => {
    fetch('http://localhost:3001/api/health')
      .then(res => res.json())
      .then(data => setStatus('Backend: ' + data.status))
      .catch(() => setStatus('Backend ej ansluten'));
  }, []);

  return (
    <>
      <h1>TÅG ACROSS STHLM</h1>
      
      <div className="pixel-panel">
        <img src="/bosse.png" alt="Bosse" style={{ width: '64px', height: '64px', imageRendering: 'pixelated', display: 'block', margin: '0 auto 16px' }} />
        <h2>Välkommen!</h2>
        <p>Spelet är snart igång. Du är för tillfället ett jagande lag.</p>
        <p style={{ color: 'var(--sl-red)', fontSize: '8px' }}>{status}</p>
      </div>

      <button className="green">Dra Destinationskort</button>
      <button className="blue">Karta</button>
      <button className="red" style={{ marginTop: '32px' }}>TAGEN!</button>
    </>
  )
}

export default App
