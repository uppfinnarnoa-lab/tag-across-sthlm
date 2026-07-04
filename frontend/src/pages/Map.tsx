import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

interface Destination {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

export default function MapView() {
  const [positions, setPositions] = useState<{ [teamId: number]: [number, number] }>({});
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const wakeLock = useRef<any>(null);

  useEffect(() => {
    // 1. Lyssna på andras positioner
    socket.on('position_update', (data) => {
      setPositions(prev => ({
        ...prev,
        [data.team_id]: [data.lat, data.lng]
      }));
    });

    // 2. Hämta destinationer från backend
    fetch('http://localhost:3001/api/game/destinations')
      .then(res => res.json())
      .then(data => setDestinations(data.destinations || []))
      .catch(console.error);

    // 3. Skicka egen position
    const teamData = localStorage.getItem('team');
    const teamId = teamData ? JSON.parse(teamData).id : null;

    let watchId: number | null = null;
    if (teamId) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          fetch('http://localhost:3001/api/game/position', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team_id: teamId, lat: latitude, lng: longitude })
          });
        },
        (err) => console.error('Kunde inte hämta plats:', err),
        { enableHighAccuracy: true }
      );
    }

    // 4. Request WakeLock (Håll skärmen vaken)
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.error('WakeLock misslyckades:', err);
      }
    };
    requestWakeLock();

    return () => {
      socket.off('position_update');
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (wakeLock.current) wakeLock.current.release();
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
            attribution="&copy; OpenStreetMap"
          />
          
          {/* Rendera lagen */}
          {Object.entries(positions).map(([tId, coords]) => (
             <Marker key={`team-${tId}`} position={coords}>
               <Popup>Lag {tId}</Popup>
             </Marker>
          ))}

          {/* Rendera destinationer (Dummy ikoner tills riktiga läggs in) */}
          {destinations.map((dest) => dest.lat && dest.lng ? (
             <Marker key={`dest-${dest.id}`} position={[dest.lat, dest.lng]} opacity={0.6}>
               <Popup>{dest.name}</Popup>
             </Marker>
          ) : null)}
        </MapContainer>
      </div>

      <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '16px', color: 'var(--text-color)', fontSize: '10px' }}>
        &lt; Tillbaka till Leaderboard
      </Link>
    </>
  );
}
