import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, apiJson, socket } from '../api';
import Countdown from '../Countdown';

interface Card { id: number; name: string; value: number; description?: string | null; }
interface Transport { id: string; label: string; minutes: number; deadline: string; }
interface Mine {
  team: { id: number; name: string; role: 'runner' | 'chaser'; points: number; head_start_until: string | null } | null;
  destination: Card | null;
  challenge: Card | null;
  transport: Transport | null;
  potential_points: number;
}

const TRANSPORT_CHOICES = [
  { id: 'train', label: 'Tåg (10 min)' },
  { id: 'bus', label: 'Buss (20 min)' },
  { id: 'boat', label: 'Båt (30 min)' },
  { id: 'bus_25_26', label: 'Ersättningsbuss 25/26 (20 min)' },
  { id: 'bus_21l', label: 'Ersättningsbuss 21L (10 min)' }
];

export default function Play() {
  const [mine, setMine] = useState<Mine | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const res = await apiFetch('/api/game/mine');
    if (res.ok) setMine(await res.json());
  }, []);

  useEffect(() => {
    refresh();
    socket.on('roles_changed', refresh);
    socket.on('state_updated', refresh);
    return () => {
      socket.off('roles_changed', refresh);
      socket.off('state_updated', refresh);
    };
  }, [refresh]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel');
    } finally {
      setBusy(false);
    }
  };

  const draw = (type: 'destination' | 'challenge') =>
    act(() => apiJson('/api/game/draw', { method: 'POST', body: JSON.stringify({ type }) }));

  const setTransport = (mode: string) =>
    act(() => apiJson('/api/game/transport', { method: 'POST', body: JSON.stringify({ mode }) }));

  const uploadProof = (endpoint: '/api/game/claim' | '/api/game/tag') => act(async () => {
    const file = fileInput.current?.files?.[0];
    if (!file) throw new Error(endpoint === '/api/game/tag' ? 'Välj filmen som bevis' : 'Välj bilden som bevis');
    const body = new FormData();
    body.append('media', file);
    await apiJson(endpoint, { method: 'POST', body });
    if (fileInput.current) fileInput.current.value = '';
  });

  if (!mine) return <p className="bounce">Laddar...</p>;
  if (!mine.team) return <p>Du har inget lag ännu. Vänta på domaren.</p>;

  const isRunner = mine.team.role === 'runner';
  const headStart = mine.team.head_start_until;
  const headStartActive = Boolean(headStart) && new Date(headStart!).getTime() > Date.now();

  return (
    <>
      <h1>SPELVY</h1>

      <div className="pixel-panel" style={{ textAlign: 'center' }}>
        <h2 style={{ color: isRunner ? 'var(--sl-red)' : 'var(--sl-green)' }}>
          {mine.team.name} — {isRunner ? 'LÖPARE' : 'JÄGARE'}
        </h2>
        <p>{mine.team.points} poäng</p>
        {headStartActive && (
          <p style={{ color: 'var(--sl-yellow)' }}>
            {isRunner ? 'Ert försprång: ' : 'Löparlaget har försprång: '}
            <Countdown until={headStart!} onExpire={refresh} />
          </p>
        )}
      </div>

      {error && <div className="pixel-panel" style={{ color: 'var(--sl-red)' }}>{error}</div>}

      {isRunner ? (
        <>
          <div className="pixel-panel" style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'var(--sl-blue)' }}>DESTINATION</h3>
            {mine.destination ? (
              <>
                <h2 style={{ margin: '16px 0' }}>{mine.destination.name}</h2>
                <p>{mine.destination.value} p{mine.challenge ? ` × ${mine.challenge.value}` : ''} = <strong>{mine.potential_points} p</strong></p>
              </>
            ) : (
              <>
                <p>Inget destinationskort draget.</p>
                <button className="blue" disabled={busy} onClick={() => draw('destination')}>DRA DESTINATIONSKORT</button>
              </>
            )}
          </div>

          {mine.destination && (
            <div className="pixel-panel" style={{ textAlign: 'center' }}>
              <h3 style={{ color: 'var(--sl-green)' }}>EXTRAUPPDRAG</h3>
              {mine.challenge ? (
                <>
                  <h3 style={{ margin: '8px 0' }}>{mine.challenge.name} — {mine.challenge.value}x</h3>
                  <p style={{ fontSize: '10px' }}>{mine.challenge.description}</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '10px' }}>Klarar ni inte uppdraget innan ni blir tagna får ni inga poäng för resan.</p>
                  <button className="green" disabled={busy} onClick={() => draw('challenge')}>DRA EXTRAUPPDRAG</button>
                </>
              )}
            </div>
          )}

          <div className="pixel-panel">
            <h3>FÄRDMEDEL</h3>
            {mine.transport ? (
              <p>
                {mine.transport.label} — kvar: <strong><Countdown until={mine.transport.deadline} /></strong>
              </p>
            ) : (
              <p style={{ fontSize: '10px' }}>Registrera färdmedlet när ni kliver på.</p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {TRANSPORT_CHOICES.map(t => (
                <button key={t.id} className="blue" disabled={busy} onClick={() => setTransport(t.id)}
                  style={{ width: 'auto', flex: '1 1 45%', padding: '8px', fontSize: '9px', margin: 0 }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {mine.destination && (
            <div className="pixel-panel">
              <h3>NÅDD DESTINATION?</h3>
              <p style={{ fontSize: '10px' }}>Ta en bild på laget vid hållplatsskylten.</p>
              <input ref={fileInput} type="file" accept="image/*" capture="environment" style={{ marginBottom: '16px' }} />
              <button className="green" disabled={busy} onClick={() => uploadProof('/api/game/claim')}>
                HÄMTA {mine.potential_points} POÄNG
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="pixel-panel">
          <h3 style={{ color: 'var(--sl-red)' }}>TAGEN!</h3>
          <p style={{ fontSize: '10px' }}>
            Ni måste ha minst en person ur löparlaget i bild i 10 sekunder utan att den försvinner.
          </p>
          <input ref={fileInput} type="file" accept="video/*" capture="environment" style={{ marginBottom: '16px' }} />
          <button className="red" disabled={busy || headStartActive} onClick={() => uploadProof('/api/game/tag')}>
            {headStartActive ? 'LÖPARLAGET HAR FÖRSPRÅNG' : 'SKICKA TAGEN!'}
          </button>
        </div>
      )}

      <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '16px', color: 'var(--text-color)', fontSize: '10px' }}>
        &lt; Tillbaka till Leaderboard
      </Link>
    </>
  );
}
