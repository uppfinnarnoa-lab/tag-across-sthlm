import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Install() {
  const [gpsMode, setGpsMode] = useState<string>('wakelock');
  const [player, setPlayer] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('player');
    if (saved) setPlayer(JSON.parse(saved));

    fetch('http://localhost:3002/api/game/state')
      .then(res => res.json())
      .then(data => {
        if (data.state) setGpsMode(data.state.gps_mode);
      });
  }, []);

  const getTopic = () => {
    if (!player || !player.team_id) return 'din-lag-slug';
    const teams = ['lag-rod', 'lag-bla', 'lag-gron'];
    return teams[player.team_id - 1] || 'okant-lag';
  };

  const owntracksConfigUrl = `owntracks:///config?url=http://localhost:3002/api/owntracks`;

  return (
    <div style={{ paddingBottom: '64px', textAlign: 'center' }}>
      <h1>INSTALLATION</h1>
      
      <div className="pixel-panel">
        <h2>Aktuellt Läge: <span style={{color:'var(--sl-yellow)'}}>{(gpsMode || 'wakelock').toUpperCase()}</span></h2>
        <p style={{fontSize:'10px'}}>Domaren har ställt in ovanstående GPS-krav för spelet.</p>
      </div>

      {gpsMode === 'owntracks' && (
        <div className="pixel-panel">
          <h2 style={{color:'var(--sl-red)'}}>OWNTRACKS (iOS/Android)</h2>
          <p style={{fontSize:'10px'}}>1. Ladda ner appen "OwnTracks" från App Store eller Google Play.</p>
          <p style={{fontSize:'10px'}}>2. Tryck på knappen nedan för att automatiskt konfigurera appen att skicka position till spelet.</p>
          
          <a href={owntracksConfigUrl} style={{textDecoration:'none'}}>
            <button className="green">KONFIGURERA OWNTRACKS</button>
          </a>
          
          <p style={{fontSize:'10px', marginTop: '16px'}}>
            <strong>Viktigt:</strong> Gå in i OwnTracks Inställningar -{'>'} Tracker, och skriv in Device ID / Topic som: <br/>
            <code style={{color:'var(--sl-yellow)'}}>tagacross/{getTopic()}</code>
          </p>
        </div>
      )}

      {gpsMode === 'native' && (
        <>
          <div className="pixel-panel">
            <h2>ANDROID (Sideload)</h2>
            <p style={{fontSize:'10px'}}>Ladda ner spelets APK-fil direkt härifrån och tillåt installation från okänd källa.</p>
            <button className="blue" onClick={() => alert("APK-filen genereras via Android Studio (se dokumentation)")}>LADDA NER .APK</button>
          </div>

          <div className="pixel-panel">
            <h2>iOS (AltStore / EU)</h2>
            <p style={{fontSize:'10px'}}>För att installera på iPhone krävs antingen AltStore (inom EU) eller Apple TestFlight.</p>
            <button className="yellow" onClick={() => alert("IPA-filen genereras via Xcode/Appflow (se dokumentation)")}>LADDA NER .IPA</button>
          </div>
        </>
      )}

      {(gpsMode === 'wakelock' || gpsMode === 'off') && (
        <div className="pixel-panel">
          <h2>INGEN INSTALLATION KRÄVS</h2>
          <p style={{fontSize:'10px'}}>Spelet körs direkt i webbläsaren! Se bara till att du aktiverat WakeLock i kart-vyn så stängs inte GPS:en av när du stoppar telefonen i fickan.</p>
        </div>
      )}

      <Link to="/" style={{ display: 'block', color: 'white', marginTop: '16px', fontSize: '10px' }}>Tillbaka</Link>
    </div>
  );
}
