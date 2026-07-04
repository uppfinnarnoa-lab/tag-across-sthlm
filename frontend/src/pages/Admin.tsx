import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';

function LocationPicker({ currentLat, currentLng, onLocationSelected }: { currentLat: number, currentLng: number, onLocationSelected: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<{lat: number, lng: number}>({ lat: currentLat, lng: currentLng });
  useMapEvents({ click(e) { setPosition(e.latlng); onLocationSelected(e.latlng.lat, e.latlng.lng); } });
  return position ? <Marker position={position}></Marker> : null;
}

export default function Admin() {
  const [auth, setAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [cards, setCards] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [gameState, setGameState] = useState<any>(null);

  const fetchData = async () => {
    const resCards = await fetch('http://localhost:3002/api/admin/cards');
    const dataCards = await resCards.json();
    setCards(dataCards.cards);

    const resLobby = await fetch('http://localhost:3002/api/lobby');
    const dataLobby = await resLobby.json();
    setPlayers(dataLobby.players);

    const resState = await fetch('http://localhost:3002/api/game/state');
    const dataState = await resState.json();
    setGameState(dataState.state);
  };

  useEffect(() => {
    if (auth) {
      fetchData();
      const interval = setInterval(fetchData, 2000);
      return () => clearInterval(interval);
    }
  }, [auth]);

  const handleLogin = () => {
    if (password === 'Bosse') setAuth(true);
    else alert('Fel lösenord!');
  };

  const handleCreateGame = async () => {
    await fetch('http://localhost:3002/api/admin/create_game', { method: 'POST' });
    fetchData();
  };

  const handleStartGame = async () => {
    await fetch('http://localhost:3002/api/game/start', { method: 'POST' });
    fetchData();
  };

  const handleRandomize = async () => {
    await fetch('http://localhost:3002/api/admin/randomize_teams', { method: 'POST' });
    fetchData();
  };

  const handleAssign = async (playerId: number, teamId: number) => {
    await fetch('http://localhost:3002/api/admin/assign_team', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId, team_id: teamId })
    });
    fetchData();
  };

  const handleSaveCard = async () => {
    if (!editingCard) return;
    
    if (editingCard.id) {
      await fetch(`http://localhost:3002/api/admin/cards/${editingCard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCard)
      });
    } else {
      await fetch(`http://localhost:3002/api/admin/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCard)
      });
    }
    setEditingCard(null);
    fetchData();
  };

  if (!auth) {
    return (
      <div className="pixel-panel" style={{ textAlign: 'center' }}>
        <h2>ADMIN LOGIN</h2>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Lösenord" style={{ width: '100%', padding: '12px', marginBottom: '16px' }} />
        <button className="blue" onClick={handleLogin}>LOGGA IN</button>
        <Link to="/" style={{ display: 'block', color: 'white', marginTop: '16px' }}>Tillbaka</Link>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '64px' }}>
      <h1>DOMARE / ADMIN</h1>
      
      <div className="pixel-panel">
        <h2>Spelkontroll</h2>
        <p>Status: {gameState?.status} | PIN: <strong style={{color:'var(--sl-yellow)'}}>{gameState?.game_pin || 'Inget aktivt'}</strong></p>
        
        <div style={{ margin: '16px 0', padding: '8px', border: '1px solid #555' }}>
          <label><strong>Välj GPS-läge:</strong></label>
          <select 
            value={gameState?.gps_mode || 'wakelock'} 
            onChange={e => fetch(`http://localhost:3002/api/admin/gps_mode`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ mode: e.target.value }) }).then(fetchData)}
            style={{ width: '100%', padding: '8px', marginTop: '8px', fontFamily: 'inherit', fontSize: '10px' }}
          >
            <option value="wakelock">1. WakeLock (Standard, Håll skärmen på)</option>
            <option value="owntracks">2. OwnTracks Hack (Bakgrunds-GPS via extern App)</option>
            <option value="native">3. Native App (Laddas ner via /install)</option>
            <option value="off">4. Avstängd (Ingen live-positionering)</option>
          </select>
        </div>

        <button className="blue" onClick={handleCreateGame}>1. SKAPA NYTT SPEL</button>
        <button className="yellow" onClick={handleRandomize}>2. SLUMPA LAG</button>
        <button className="green" onClick={handleStartGame}>3. STARTA SPELET</button>
      </div>

      <div className="pixel-panel">
        <h2>Lobbyn (Spelare)</h2>
        {players.map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #555', padding: '8px 0', fontSize: '10px' }}>
            <span>{p.name} - <strong>{p.team_name || 'Inget'}</strong></span>
            <div>
              <button style={{ width: 'auto', padding: '4px', margin: '2px', backgroundColor: 'var(--sl-red)' }} onClick={() => handleAssign(p.id, 1)}>Röd</button>
              <button style={{ width: 'auto', padding: '4px', margin: '2px', backgroundColor: 'var(--sl-light-blue)' }} onClick={() => handleAssign(p.id, 2)}>Blå</button>
              <button style={{ width: 'auto', padding: '4px', margin: '2px', backgroundColor: 'var(--sl-green)' }} onClick={() => handleAssign(p.id, 3)}>Grön</button>
            </div>
          </div>
        ))}
      </div>

      {editingCard ? (
        <div className="pixel-panel">
          <h2>REDIGERA KORT</h2>
          <label>Namn:</label>
          <input value={editingCard.name} onChange={e => setEditingCard({...editingCard, name: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '8px' }} />
          <label>Poäng/Värde:</label>
          <input type="number" value={editingCard.value} onChange={e => setEditingCard({...editingCard, value: Number(e.target.value)})} style={{ width: '100%', padding: '8px', marginBottom: '16px' }} />
          {editingCard.type === 'destination' && (
            <>
              <p>Klicka på kartan för att sätta ny position:</p>
              <div style={{ height: '300px', marginBottom: '16px', border: '2px solid white' }}>
                <MapContainer center={[editingCard.lat || 59.330, editingCard.lng || 18.060]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationPicker currentLat={editingCard.lat || 59.330} currentLng={editingCard.lng || 18.060} onLocationSelected={(lat, lng) => setEditingCard({...editingCard, lat, lng})} />
                </MapContainer>
              </div>
            </>
          )}
          <button className="green" onClick={handleSaveCard}>SPARA ÄNDRINGAR</button>
          <button className="red" onClick={() => setEditingCard(null)}>AVBRYT</button>
        </div>
      ) : (
        <div className="pixel-panel">
          <h2>KORT & PLATSER</h2>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button className="blue" onClick={() => setEditingCard({ name: 'Ny Plats', type: 'destination', value: 10, lat: 59.33, lng: 18.06 })}>+ NY PLATS</button>
            <button className="yellow" onClick={() => setEditingCard({ name: 'Ny Utmaning', type: 'challenge', value: 2 })}>+ NY UTMANING</button>
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {cards.map(card => (
              <div key={card.id} style={{ borderBottom: '1px solid #555', padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '10px' }}><strong>{card.name}</strong> ({card.type === 'destination' ? 'Plats' : 'Utmaning'})</div>
                <button className="blue" style={{ width: 'auto', padding: '8px', margin: 0 }} onClick={() => setEditingCard(card)}>Edit</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
