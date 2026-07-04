import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Play from './pages/Play';
import MapView from './pages/Map';
import Feed from './pages/Feed';
import Admin from './pages/Admin';
import Landing from './pages/Landing';
import Lobby from './pages/Lobby';
import './App.css';

function App() {
  const [player, setPlayer] = useState<any>(null);
  const [gameState, setGameState] = useState<string>('waiting');

  const fetchState = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/game/state');
      const data = await res.json();
      if (data.state) setGameState(data.state.status);
    } catch(e) {}
  };

  useEffect(() => {
    const saved = localStorage.getItem('player');
    if (saved) setPlayer(JSON.parse(saved));
    fetchState();
    
    // Polling is fine here, or we can rely on Socket.io in components
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        
        <Route path="/" element={
          !player ? <Landing onJoin={setPlayer} /> : 
          gameState !== 'playing' ? <Lobby player={player} onGameStart={fetchState} /> : 
          <Home />
        } />
        
        <Route path="/play" element={gameState === 'playing' ? <Play /> : <Navigate to="/" />} />
        <Route path="/map" element={gameState === 'playing' ? <MapView /> : <Navigate to="/" />} />
        <Route path="/feed" element={gameState === 'playing' ? <Feed /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
