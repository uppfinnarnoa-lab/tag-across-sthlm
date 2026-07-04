import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';
import L from 'leaflet';

const socket = io('http://localhost:3002');

// Custom ikoner
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
const destIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'destination-marker' // opacity i css
});

interface Destination { id: number; name: string; lat: number; lng: number; }

export default function MapView() {
  const [positions, setPositions] = useState<{ [teamId: number]: [number, number] }>({});
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(true);
  const [gpsMode, setGpsMode] = useState<string>('wakelock');
  const wakeLock = useRef<any>(null);

  useEffect(() => {
    const fetchState = async () => {
      const res = await fetch('http://localhost:3002/api/game/state');
      const data = await res.json();
      if (data.state) setGpsMode(data.state.gps_mode);
      
      const posMap: any = {};
      if (data.teams) {
        data.teams.forEach((t: any) => { if (t.lat && t.lng) posMap[t.id] = [t.lat, t.lng]; });
        setPositions(posMap);
      }
    };
    fetchState();

    fetch('http://localhost:3002/api/game/destinations')
      .then(res => res.json())
      .then(data => setDestinations(data.destinations));

    socket.on('position_update', (data: any) => {
      setPositions(prev => ({ ...prev, [data.team_id]: [data.lat, data.lng] }));
    });

    let watchId: number;
    const team = JSON.parse(localStorage.getItem('player') || '{}');

    // Starta tracking baserat på gps_mode
    setTimeout(() => {
      if (team.team_id && (gpsMode === 'wakelock' || gpsMode === 'native')) {
        // För native kan vi lägga in capacitor anropet här framöver
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            fetch('http://localhost:3002/api/game/position', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ team_id: team.team_id, lat: latitude, lng: longitude })
            });
          },
          (err) => console.error(err),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    }, 1000);

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && wakeLockEnabled && gpsMode === 'wakelock') {
          wakeLock.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.error('WakeLock misslyckades:', err);
      }
    };
    if (gpsMode === 'wakelock') requestWakeLock();

    return () => {
      socket.off('position_update');
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (wakeLock.current) { wakeLock.current.release(); wakeLock.current = null; }
    };
  }, [wakeLockEnabled, gpsMode]);

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h1>LIVEKARTA</h1>
        
        {gpsMode === 'wakelock' && (
          <button className={wakeLockEnabled ? "yellow" : "blue"} onClick={() => setWakeLockEnabled(!wakeLockEnabled)} style={{ width: 'auto', padding: '8px', fontSize: '10px' }}>
            {wakeLockEnabled ? "WakeLock PÅ (Kräver mer batteri)" : "WakeLock AV (Sparar batteri)"}
          </button>
        )}

        {gpsMode === 'owntracks' && (
          <div className="pixel-panel" style={{ padding: '8px', fontSize: '10px', backgroundColor: 'var(--sl-red)' }}>
            LÄGE: OWNTRACKS. Din webbläsare hämtar INTE din position! Öppna OwnTracks-appen i bakgrunden.
          </div>
        )}

        {gpsMode === 'off' && (
          <div className="pixel-panel" style={{ padding: '8px', fontSize: '10px', backgroundColor: '#555' }}>
            LÄGE: AV. All GPS-spårning är avstängd av Domaren.
          </div>
        )}
      </div>

      <div className="pixel-panel" style={{ padding: '4px', height: '400px' }}>
        <MapContainer center={[59.3293, 18.0686]} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {destinations.map(d => (
            d.lat ? <Marker key={`dest-${d.id}`} position={[d.lat, d.lng]} icon={destIcon}><Popup>{d.name}</Popup></Marker> : null
          ))}

          {Object.entries(positions).map(([teamId, coords]) => (
            <Marker key={teamId} position={coords as [number, number]} icon={markerIcon}>
              <Popup>Lag {teamId}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </>
  );
}
