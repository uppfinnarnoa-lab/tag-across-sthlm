import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

export default function MapView() {
  const [positions, setPositions] = useState<{ [teamId: number]: [number, number] }>({});

  useEffect(() => {
    // Lyssna på andras positioner
    socket.on('position_update', (data) => {
      setPositions(prev => ({
        ...prev,
        [data.team_id]: [data.lat, data.lng]
      }));
    });

    // Skicka egen position (Bug fix: Implementerad geolocation)
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetch('http://localhost:3001/api/game/position', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team_id: 1, lat: latitude, lng: longitude }) // Hårdkodat team_id för MVP
        });
      },
      (err) => console.error('Kunde inte hämta plats:', err),
      { enableHighAccuracy: true }
    );

    return () => {
      socket.off('position_update');
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h1>LIVEKARTA</h1>
      </div>

      <div className="pixel-panel" style={{ padding: '4px', height: '400px' }}>
        <MapContainer center={[59.3293, 18.0686]} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {Object.entries(positions).map(([teamId, coords]) => (
             <Marker key={teamId} position={coords}>
               <Popup>Lag {teamId}</Popup>
             </Marker>
          ))}
        </MapContainer>
      </div>

      <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '16px', color: 'var(--text-color)', fontSize: '10px' }}>
        &lt; Tillbaka till Leaderboard
      </Link>
    </>
  );
}
