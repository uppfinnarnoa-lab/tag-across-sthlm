import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Play from './pages/Play';
import MapView from './pages/Map';
import Feed from './pages/Feed';
import Admin from './pages/Admin';
import Landing from './pages/Landing';
import Lobby from './pages/Lobby';
import Install from './pages/Install';
import { apiFetch, socket } from './api';
import { usePlayer } from './usePlayer';
import './App.css';

function App() {
  const { player, loading, refresh } = usePlayer();
  const [gameState, setGameState] = useState('waiting');
  const [stateLoaded, setStateLoaded] = useState(false);

  // Publik status -- den innehåller varken PIN, positioner eller spelarnamn.
  const fetchState = useCallback(async () => {
    const res = await apiFetch('/api/game/status');
    if (res.ok) {
      const data = await res.json();
      if (data.state) setGameState(data.state.status);
    }
    setStateLoaded(true);
  }, []);

  useEffect(() => {
    fetchState();
    socket.on('game_started', fetchState);
    socket.on('state_updated', fetchState);
    socket.on('game_finished', fetchState);
    return () => {
      socket.off('game_started', fetchState);
      socket.off('state_updated', fetchState);
      socket.off('game_finished', fetchState);
    };
  }, [fetchState]);

  // Utan den här väntan hann /map, /play och /feed alltid kasta ut en spelare
  // som laddade om sidan, eftersom starttillståndet är "waiting" och hämtningen
  // är asynkron.
  if (loading || !stateLoaded) {
    return <div className="pixel-panel" style={{ textAlign: 'center' }}><p className="bounce">Laddar...</p></div>;
  }

  const playing = gameState === 'playing';

  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/install" element={<Install />} />

        <Route path="/" element={
          !player ? <Landing onJoin={refresh} /> :
            !playing ? <Lobby player={player} /> :
              <Home />
        } />

        <Route path="/play" element={playing && player ? <Play /> : <Navigate to="/" />} />
        <Route path="/map" element={playing && player ? <MapView /> : <Navigate to="/" />} />
        <Route path="/feed" element={playing && player ? <Feed /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
