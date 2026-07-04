import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Play from './pages/Play';
import MapView from './pages/Map';
import Feed from './pages/Feed';
import Admin from './pages/Admin';
import Login from './pages/Login';
import './App.css';

function App() {
  const [team, setTeam] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('team');
    if (saved) setTeam(JSON.parse(saved));
  }, []);

  if (!team) {
    return <Login onLogin={setTeam} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<Play />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}

export default App;
