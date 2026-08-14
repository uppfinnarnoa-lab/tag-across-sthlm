import { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import { Link } from 'react-router-dom';
import { apiFetch, apiJson, getAdminToken, setAdminToken, clearAdminToken } from '../api';

const markerIcon = new L.Icon({ iconUrl: markerIconUrl, iconSize: [25, 41], iconAnchor: [12, 41] });

interface CardRow { id?: number; type: string; name: string; value: number; lat?: number; lng?: number; description?: string | null; }
interface LobbyRow { id: number; name: string; team_name: string | null; }
interface TeamRow { id: number; name: string; role: string; points: number; }
interface State { status: string; game_pin: string | null; gps_mode: string; }

function LocationPicker({ lat, lng, onPick }: { lat: number, lng: number, onPick: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<L.LatLngLiteral>({ lat, lng });
  useMapEvents({ click(e) { setPosition(e.latlng); onPick(e.latlng.lat, e.latlng.lng); } });
  return <Marker position={position} icon={markerIcon} />;
}

export default function Admin() {
  const [auth, setAuth] = useState(Boolean(getAdminToken()));
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cards, setCards] = useState<CardRow[]>([]);
  const [players, setPlayers] = useState<LobbyRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [state, setState] = useState<State | null>(null);
  const [editingCard, setEditingCard] = useState<CardRow | null>(null);

  const fetchData = useCallback(async () => {
    const [cardsRes, lobbyRes, stateRes] = await Promise.all([
      apiFetch('/api/admin/cards', { admin: true }),
      apiFetch('/api/admin/lobby', { admin: true }),
      apiFetch('/api/admin/state', { admin: true })
    ]);

    if (stateRes.status === 401) {
      clearAdminToken();
      setAuth(false);
      return;
    }
    if (cardsRes.ok) setCards((await cardsRes.json()).cards);
    if (lobbyRes.ok) setPlayers((await lobbyRes.json()).players);
    if (stateRes.ok) {
      const data = await stateRes.json();
      setState(data.state);
      setTeams(data.teams);
    }
  }, []);

  useEffect(() => {
    if (!auth) return;
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [auth, fetchData]);

  const handleLogin = async () => {
    try {
      // Lösenordet kontrolleras av servern. Tidigare låg det hårdkodat i den här
      // filen och kollades bara mot React-state, alltså rent dekorativt.
      const data = await apiJson<{ token: string }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password })
      });
      setAdminToken(data.token);
      setAuth(true);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Inloggning misslyckades');
    }
  };

  const post = (path: string, body?: unknown) => apiFetch(path, {
    method: 'POST',
    admin: true,
    body: body ? JSON.stringify(body) : undefined
  }).then(fetchData);

  const saveCard = async () => {
    if (!editingCard) return;
    const path = editingCard.id ? `/api/admin/cards/${editingCard.id}` : '/api/admin/cards';
    await apiFetch(path, {
      method: editingCard.id ? 'PUT' : 'POST',
      admin: true,
      body: JSON.stringify(editingCard)
    });
    setEditingCard(null);
    fetchData();
  };

  if (!auth) {
    return (
      <div className="pixel-panel" style={{ textAlign: 'center' }}>
        <h2>ADMIN LOGIN</h2>
        {error && <p style={{ color: 'var(--sl-red)' }}>{error}</p>}
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Lösenord" style={{ width: '100%', padding: '12px', marginBottom: '16px' }} />
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
        <p>Status: {state?.status} | PIN: <strong style={{ color: 'var(--sl-yellow)' }}>{state?.game_pin || 'Inget aktivt'}</strong></p>

        <div style={{ margin: '16px 0', padding: '8px', border: '1px solid #555' }}>
          <label><strong>Välj GPS-läge:</strong></label>
          <select
            value={state?.gps_mode || 'wakelock'}
            onChange={e => post('/api/admin/gps_mode', { mode: e.target.value })}
            style={{ width: '100%', padding: '8px', marginTop: '8px', fontFamily: 'inherit', fontSize: '10px' }}
          >
            <option value="wakelock">1. WakeLock (Standard, Håll skärmen på)</option>
            <option value="owntracks">2. OwnTracks (Bakgrunds-GPS via extern App)</option>
            <option value="native">3. Native App (Laddas ner via /install)</option>
            <option value="off">4. Avstängd (Ingen live-positionering)</option>
          </select>
        </div>

        <button className="blue" onClick={() => post('/api/admin/create_game')}>1. SKAPA NYTT SPEL</button>
        <button className="yellow" onClick={() => post('/api/admin/randomize_teams')}>2. SLUMPA LAG</button>
        <button className="green" onClick={() => post('/api/game/start')}>3. STARTA SPELET</button>
        <button className="red" onClick={() => post('/api/game/end')}>AVSLUTA SPELET</button>
      </div>

      <div className="pixel-panel">
        <h2>Ställning</h2>
        {teams.map(t => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '4px 0' }}>
            <span>{t.name} <span style={{ color: t.role === 'runner' ? 'var(--sl-red)' : 'var(--sl-green)' }}>
              ({t.role === 'runner' ? 'Löpare' : 'Jägare'})</span></span>
            <strong>{t.points} p</strong>
          </div>
        ))}
      </div>

      <div className="pixel-panel">
        <h2>Lobbyn (Spelare)</h2>
        {players.map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #555', padding: '8px 0', fontSize: '10px' }}>
            <span>{p.name} - <strong>{p.team_name || 'Inget'}</strong></span>
            <div>
              {teams.map((t, i) => (
                <button key={t.id} style={{ width: 'auto', padding: '4px', margin: '2px', backgroundColor: ['var(--sl-red)', 'var(--sl-light-blue)', 'var(--sl-green)'][i % 3] }}
                  onClick={() => post('/api/admin/assign_team', { player_id: p.id, team_id: t.id })}>
                  {t.name.replace('Lag ', '')}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editingCard ? (
        <div className="pixel-panel">
          <h2>REDIGERA KORT</h2>
          <label>Namn:</label>
          <input value={editingCard.name} onChange={e => setEditingCard({ ...editingCard, name: e.target.value })} style={{ width: '100%', padding: '8px', marginBottom: '8px' }} />
          <label>{editingCard.type === 'destination' ? 'Poäng:' : 'Multiplikator:'}</label>
          <input type="number" step="0.1" value={editingCard.value} onChange={e => setEditingCard({ ...editingCard, value: Number(e.target.value) })} style={{ width: '100%', padding: '8px', marginBottom: '16px' }} />
          {editingCard.type === 'destination' && (
            <>
              <p>Klicka på kartan för att sätta ny position:</p>
              <div style={{ height: '300px', marginBottom: '16px', border: '2px solid white' }}>
                <MapContainer center={[editingCard.lat || 59.330, editingCard.lng || 18.060]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationPicker lat={editingCard.lat || 59.330} lng={editingCard.lng || 18.060}
                    onPick={(lat, lng) => setEditingCard({ ...editingCard, lat, lng })} />
                </MapContainer>
              </div>
            </>
          )}
          <button className="green" onClick={saveCard}>SPARA ÄNDRINGAR</button>
          <button className="red" onClick={() => setEditingCard(null)}>AVBRYT</button>
        </div>
      ) : (
        <div className="pixel-panel">
          <h2>KORT & PLATSER</h2>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button className="blue" onClick={() => setEditingCard({ name: 'Ny Plats', type: 'destination', value: 10, lat: 59.33, lng: 18.06 })}>+ NY PLATS</button>
            <button className="yellow" onClick={() => setEditingCard({ name: 'Ny Utmaning', type: 'challenge', value: 1.5 })}>+ NY UTMANING</button>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {cards.map(card => (
              <div key={card.id} style={{ borderBottom: '1px solid #555', padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '10px' }}>
                  <strong>{card.name}</strong> ({card.type === 'destination' ? `${card.value} p` : `${card.value}x`})
                </div>
                <button className="blue" style={{ width: 'auto', padding: '8px', margin: 0 }} onClick={() => setEditingCard(card)}>Edit</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
