import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Team {
  id: number;
  name: string;
  points: number;
  role: string;
}

export default function Home() {
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    fetch('http://localhost:3002/api/game/state')
      .then(res => res.json())
      .then(data => setTeams(data.teams || []))
      .catch(console.error);
  }, []);

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <img src="/bosse.png" alt="Bosse" style={{ width: '64px', height: '64px', imageRendering: 'pixelated', display: 'inline-block' }} />
        <h1>TÅG ACROSS STHLM</h1>
      </div>

      <div className="pixel-panel">
        <h2 style={{ textAlign: 'center', marginBottom: '16px' }}>LEADERBOARD</h2>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '8px' }}>Lag</th>
              <th style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '8px' }}>Poäng</th>
              <th style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '8px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, idx) => (
              <tr key={team.id}>
                <td style={{ padding: '8px 0' }}>{idx + 1}. {team.name}</td>
                <td style={{ padding: '8px 0' }}>{team.points}</td>
                <td style={{ padding: '8px 0', color: team.role === 'runner' ? 'var(--sl-red)' : 'var(--sl-green)' }}>
                  {team.role === 'runner' ? 'Löpare' : 'Jägare'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link to="/play" style={{ textDecoration: 'none' }}>
        <button className="blue">Gå till Spelvyn &gt;</button>
      </Link>
      <Link to="/map" style={{ textDecoration: 'none' }}>
        <button className="green">Gå till Karta &gt;</button>
      </Link>
      <Link to="/feed" style={{ textDecoration: 'none' }}>
        <button className="red">Live Feed (TAGEN!) &gt;</button>
      </Link>
      <Link to="/admin" style={{ textDecoration: 'none' }}>
        <button className="blue" style={{ background: '#333' }}>Domarpanel &gt;</button>
      </Link>
    </>
  );
}
