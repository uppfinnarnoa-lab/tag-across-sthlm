import { useCallback, useEffect, useState } from 'react';
import { apiFetch, socket } from '../api';
import type { Player } from '../usePlayer';

interface LobbyPlayer { id: number; name: string; team_id: number | null; team_name: string | null; }

export default function Lobby({ player }: { player: Player }) {
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);

  const fetchLobby = useCallback(async () => {
    const res = await apiFetch('/api/lobby');
    if (!res.ok) return;
    const data = await res.json();
    setLobbyPlayers(data.players || []);
  }, []);

  useEffect(() => {
    fetchLobby();
    // Avregistrera med handler-referensen, inte socket.off('lobby_updated') --
    // den senare river även usePlayers lyssnare på samma event.
    socket.on('lobby_updated', fetchLobby);
    return () => { socket.off('lobby_updated', fetchLobby); };
  }, [fetchLobby]);

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>VÄNTRUM</h1>

      <div className="pixel-panel">
        <h2>Välkommen, {player.name}!</h2>
        <p>Ditt lag:</p>
        <h3 style={{ color: 'var(--sl-yellow)', fontSize: '20px' }}>
          {player.team_name || 'Väntar på lagindelning...'}
        </h3>
        <p style={{ fontSize: '10px', marginTop: '16px' }} className="bounce">Väntar på att spelet ska starta...</p>
      </div>

      <div className="pixel-panel">
        <h3>Anslutna spelare:</h3>
        <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
          {lobbyPlayers.map(p => (
            <li key={p.id} style={{ borderBottom: '1px solid #555', padding: '8px 0', fontSize: '12px' }}>
              <strong>{p.name}</strong>
              <span style={{ float: 'right', color: p.team_name ? 'white' : 'gray' }}>
                {p.team_name || 'Inget lag'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
