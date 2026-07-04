import { Link } from 'react-router-dom';

export default function Admin() {
  const handleAction = async (action: string) => {
    if (action === 'start') {
      if (window.confirm("Är du säker? Detta återställer hela spelet!")) {
        await fetch('http://localhost:3001/api/game/start', { method: 'POST' });
        alert("Spelet har startat!");
      }
    } else {
      alert(`Utfört admin-action: ${action}`);
    }
  };

  return (
    <>
      <h1>DOMARE / ADMIN</h1>
      <div className="pixel-panel">
        <h2>Spelets Kontrollpanel</h2>
        <button className="yellow" onClick={() => handleAction('start')}>STARTA SPELET (RESET)</button>
        <button className="blue" onClick={() => handleAction('lunch')}>Starta Lunchpaus (45 min)</button>
        <button className="red" onClick={() => handleAction('force_tag')}>Tvinga fram ett Rollbyte</button>
        <button className="green" onClick={() => handleAction('add_points')}>Justera Poäng</button>
      </div>

      <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '16px', color: 'var(--text-color)', fontSize: '10px' }}>
        &lt; Tillbaka
      </Link>
    </>
  );
}
