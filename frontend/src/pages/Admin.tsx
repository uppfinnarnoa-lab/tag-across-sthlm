import { Link } from 'react-router-dom';

export default function Admin() {
  const handleAction = async (action: string) => {
    // I en full implementation anropar detta backend för att modifiera databasen
    alert(`Utfört admin-action: ${action}`);
  };

  return (
    <>
      <h1>DOMARE / ADMIN</h1>
      <div className="pixel-panel">
        <h2>Spelets Kontrollpanel</h2>
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
