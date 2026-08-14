import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import { apiFetch, socket } from '../api';
import { usePlayer } from '../usePlayer';

// Ikonerna hämtades tidigare från unpkg.com vid varje sidladdning. Under en match
// på mobildata är det en extern beroendepunkt som inte behöver finnas -- och den
// läckte spelarnas IP-adresser till en tredje part.
const markerIcon = new L.Icon({ iconUrl: markerIconUrl, iconSize: [25, 41], iconAnchor: [12, 41] });
const destIcon = new L.Icon({
  iconUrl: markerIconUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'destination-marker'
});

interface Destination { id: number; name: string; lat: number; lng: number; }
interface Team { id: number; name: string; role: string; lat: number | null; lng: number | null; }

export default function MapView() {
  const { player } = usePlayer();
  const [teams, setTeams] = useState<Team[]>([]);
  const [positions, setPositions] = useState<Record<number, [number, number]>>({});
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(true);
  const [gpsMode, setGpsMode] = useState('wakelock');
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  const teamId = player?.team_id ?? null;

  const fetchState = useCallback(async () => {
    const res = await apiFetch('/api/game/state');
    if (!res.ok) return;
    const data = await res.json();
    if (data.state) setGpsMode(data.state.gps_mode);
    if (data.teams) {
      setTeams(data.teams);
      const next: Record<number, [number, number]> = {};
      data.teams.forEach((t: Team) => { if (t.lat && t.lng) next[t.id] = [t.lat, t.lng]; });
      setPositions(next);
    }
  }, []);

  useEffect(() => {
    fetchState();
    apiFetch('/api/game/destinations')
      .then(res => (res.ok ? res.json() : { destinations: [] }))
      .then(data => setDestinations(data.destinations || []));

    const onPosition = (data: { team_id: number; lat: number; lng: number }) => {
      setPositions(prev => ({ ...prev, [data.team_id]: [data.lat, data.lng] }));
    };
    socket.on('position_update', onPosition);
    socket.on('state_updated', fetchState);
    return () => {
      socket.off('position_update', onPosition);
      socket.off('state_updated', fetchState);
    };
  }, [fetchState]);

  // Egen effekt, och watchId hålls i en ref. Tidigare tilldelades den inuti en
  // setTimeout medan städfunktionen läste den direkt -- den var alltid undefined
  // vid städning, så clearWatch kördes aldrig och varje lägesbyte startade
  // ytterligare en watcher som fortsatte posta positioner.
  useEffect(() => {
    if (!teamId || (gpsMode !== 'wakelock' && gpsMode !== 'native')) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        apiFetch('/api/game/position', {
          method: 'POST',
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        });
      },
      (err) => console.error('Positionsfel:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [teamId, gpsMode]);

  useEffect(() => {
    if (gpsMode !== 'wakelock' || !wakeLockEnabled || !('wakeLock' in navigator)) return;

    let released = false;
    navigator.wakeLock.request('screen')
      .then(sentinel => {
        if (released) return sentinel.release();
        wakeLock.current = sentinel;
      })
      .catch(err => console.error('WakeLock misslyckades:', err));

    return () => {
      released = true;
      wakeLock.current?.release();
      wakeLock.current = null;
    };
  }, [gpsMode, wakeLockEnabled]);

  const teamName = (id: string) => teams.find(t => t.id === Number(id))?.name || `Lag ${id}`;

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h1>LIVEKARTA</h1>

        {gpsMode === 'wakelock' && (
          <button className={wakeLockEnabled ? 'yellow' : 'blue'} onClick={() => setWakeLockEnabled(!wakeLockEnabled)} style={{ width: 'auto', padding: '8px', fontSize: '10px' }}>
            {wakeLockEnabled ? 'WakeLock PÅ (Kräver mer batteri)' : 'WakeLock AV (Sparar batteri)'}
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

          {Object.entries(positions).map(([id, coords]) => (
            <Marker key={id} position={coords} icon={markerIcon}>
              <Popup>{teamName(id)}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </>
  );
}
