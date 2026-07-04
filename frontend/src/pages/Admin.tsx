import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';

interface Card {
  id: number;
  type: string;
  name: string;
  value: number;
  lat: number | null;
  lng: number | null;
}

function LocationPicker({ currentLat, currentLng, onLocationSelected }: { currentLat: number, currentLng: number, onLocationSelected: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<{lat: number, lng: number}>({ lat: currentLat, lng: currentLng });

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    },
  });

  return position ? <Marker position={position}></Marker> : null;
}

export default function Admin() {
  const [auth, setAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const fetchCards = async () => {
    const res = await fetch('http://localhost:3001/api/admin/cards');
    const data = await res.json();
    setCards(data.cards);
  };

  useEffect(() => {
    if (auth) fetchCards();
  }, [auth]);

  const handleLogin = () => {
    if (password === 'Bosse') setAuth(true);
    else alert('Fel lösenord!');
  };

  const handleAction = async (action: string) => {
    if (action === 'start') {
      if (window.confirm("Är du säker? Detta återställer hela spelet!")) {
        await fetch('http://localhost:3001/api/game/start', { method: 'POST' });
        alert("Spelet har startat!");
      }
    }
  };

  const handleSaveCard = async () => {
    if (!editingCard) return;
    await fetch(`http://localhost:3001/api/admin/cards/${editingCard.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingCard)
    });
    setEditingCard(null);
    fetchCards();
  };

  if (!auth) {
    return (
      <div className="pixel-panel" style={{ textAlign: 'center' }}>
        <h2>ADMIN LOGIN</h2>
        <input 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          placeholder="Lösenord" 
          style={{ width: '100%', padding: '12px', fontSize: '16px', marginBottom: '16px', fontFamily: 'inherit' }}
        />
        <button className="blue" onClick={handleLogin}>LOGGA IN</button>
        <Link to="/" style={{ display: 'block', color: 'white', marginTop: '16px' }}>Tillbaka</Link>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '64px' }}>
      <h1>DOMARE / ADMIN</h1>
      <div className="pixel-panel">
        <h2>Spelets Kontrollpanel</h2>
        <button className="yellow" onClick={() => handleAction('start')}>STARTA SPELET (RESET)</button>
      </div>

      {editingCard ? (
        <div className="pixel-panel">
          <h2>REDIGERA: {editingCard.name}</h2>
          <label>Namn:</label>
          <input 
            value={editingCard.name} 
            onChange={e => setEditingCard({...editingCard, name: e.target.value})}
            style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
          />
          <label>Poäng/Värde:</label>
          <input 
            type="number" 
            value={editingCard.value} 
            onChange={e => setEditingCard({...editingCard, value: Number(e.target.value)})}
            style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
          />
          
          {editingCard.type === 'destination' && (
            <>
              <p>Klicka på kartan för att sätta ny position:</p>
              <div style={{ height: '300px', marginBottom: '16px', border: '2px solid white' }}>
                <MapContainer center={[editingCard.lat || 59.330, editingCard.lng || 18.060]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationPicker 
                    currentLat={editingCard.lat || 59.330} 
                    currentLng={editingCard.lng || 18.060} 
                    onLocationSelected={(lat, lng) => setEditingCard({...editingCard, lat, lng})} 
                  />
                </MapContainer>
              </div>
              <p style={{ fontSize: '10px' }}>Lat: {editingCard.lat}, Lng: {editingCard.lng}</p>
            </>
          )}

          <button className="green" onClick={handleSaveCard}>SPARA ÄNDRINGAR</button>
          <button className="red" onClick={() => setEditingCard(null)}>AVBRYT</button>
        </div>
      ) : (
        <div className="pixel-panel">
          <h2>KORT & PLATSER</h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {cards.map(card => (
              <div key={card.id} style={{ borderBottom: '1px solid #555', padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '10px' }}>
                  <strong>{card.name}</strong> ({card.type})<br/>
                  {card.type === 'destination' && `GPS: ${card.lat?.toFixed(4)}, ${card.lng?.toFixed(4)}`}
                </div>
                <button className="blue" style={{ width: 'auto', padding: '8px', margin: 0 }} onClick={() => setEditingCard(card)}>Edit</button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '16px', color: 'var(--text-color)', fontSize: '10px' }}>
        &lt; Tillbaka till Leaderboard
      </Link>
    </div>
  );
}
