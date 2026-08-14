import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { usePlayer } from '../usePlayer';

export default function Install() {
  const { player, owntracksUrl } = usePlayer();
  const [gpsMode, setGpsMode] = useState('wakelock');

  useEffect(() => {
    apiFetch('/api/game/status')
      .then(res => res.json())
      .then(data => { if (data.state) setGpsMode(data.state.gps_mode); });
  }, []);

  // Adressen kommer från servern, aldrig från window.location.origin -- en
  // callback-URL får inte byggas ur något klienten kontrollerar.
  const configUrl = owntracksUrl
    ? `owntracks:///config?url=${encodeURIComponent(owntracksUrl)}`
    : null;

  return (
    <div style={{ paddingBottom: '64px', textAlign: 'center' }}>
      <h1>INSTALLATION</h1>

      <div className="pixel-panel">
        <h2>Aktuellt Läge: <span style={{ color: 'var(--sl-yellow)' }}>{gpsMode.toUpperCase()}</span></h2>
        <p style={{ fontSize: '10px' }}>Domaren har ställt in ovanstående GPS-krav för spelet.</p>
      </div>

      {gpsMode === 'owntracks' && (
        <div className="pixel-panel">
          <h2 style={{ color: 'var(--sl-red)' }}>OWNTRACKS (iOS/Android)</h2>
          {!player ? (
            <p style={{ fontSize: '10px' }}>Gå med i spelet först — adressen är unik för ditt lag.</p>
          ) : !player.team_id ? (
            <p style={{ fontSize: '10px' }}>Vänta tills domaren delat in lagen.</p>
          ) : (
            <>
              <p style={{ fontSize: '10px' }}>1. Ladda ner appen "OwnTracks" från App Store eller Google Play.</p>
              <p style={{ fontSize: '10px' }}>2. Tryck på knappen nedan för att konfigurera appen.</p>

              <a href={configUrl!} style={{ textDecoration: 'none' }}>
                <button className="green">KONFIGURERA OWNTRACKS</button>
              </a>

              <p style={{ fontSize: '10px', marginTop: '16px', wordBreak: 'break-all' }}>
                Fungerar inte knappen? Lägg in adressen manuellt under Settings &gt; Connection:<br />
                <code style={{ color: 'var(--sl-yellow)' }}>{owntracksUrl}</code>
              </p>
              <p style={{ fontSize: '10px', color: 'var(--sl-red)' }}>
                Adressen innehåller {player.team_name}s nyckel. Dela den inte med de andra lagen.
              </p>
            </>
          )}
        </div>
      )}

      {gpsMode === 'native' && (
        <>
          <div className="pixel-panel">
            <h2>ANDROID (Sideload)</h2>
            <p style={{ fontSize: '10px' }}>Ladda ner spelets APK-fil och tillåt installation från okänd källa.</p>
            <button className="blue" onClick={() => alert('APK-filen genereras via Android Studio (se dokumentation)')}>LADDA NER .APK</button>
          </div>

          <div className="pixel-panel">
            <h2>iOS (AltStore / EU)</h2>
            <p style={{ fontSize: '10px' }}>För iPhone krävs antingen AltStore (inom EU) eller Apple TestFlight.</p>
            <button className="yellow" onClick={() => alert('IPA-filen genereras via Xcode/Appflow (se dokumentation)')}>LADDA NER .IPA</button>
          </div>
        </>
      )}

      {(gpsMode === 'wakelock' || gpsMode === 'off') && (
        <div className="pixel-panel">
          <h2>INGEN INSTALLATION KRÄVS</h2>
          <p style={{ fontSize: '10px' }}>Spelet körs direkt i webbläsaren! Se bara till att du aktiverat WakeLock i kartvyn så stängs inte GPS:en av när du stoppar telefonen i fickan.</p>
        </div>
      )}

      <Link to="/" style={{ display: 'block', color: 'white', marginTop: '16px', fontSize: '10px' }}>Tillbaka</Link>
    </div>
  );
}
