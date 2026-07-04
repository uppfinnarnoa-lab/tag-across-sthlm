import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

export default function Lobby({ player, onGameStart }: { player: any, onGameStart: () => void }) {
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([]);
  
  const fetchLobby = async () => {
    const res = await fetch('http://localhost:3001/api/lobby');
    const data = await res.json();
    setLobbyPlayers(data.players || []);
  };

  useEffect(() => {
    fetchLobby();

    socket.on('lobby_updated', () => {
      fetchLobby();
    });

    socket.on('game_started', () => {
      onGameStart();
    });

    return () => {
      socket.off('lobby_updated');
      socket.off('game_started');
    };
  }, []);

  const me = lobbyPlayers.find(p => p.id === player.id);
  const myTeam = me?.team_name || 'Väntar på lagindelning...';

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>VÄNTRUM</h1>
      
      <div className="pixel-panel">
        <h2>Välkommen, {player.name}!</h2>
        <p>Ditt lag:</p>
        <h3 style={{ color: 'var(--sl-yellow)', fontSize: '20px' }}>{myTeam}</h3>
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
