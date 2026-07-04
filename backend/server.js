const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Will be restricted to tag.helgars.se in production
    methods: ["GET", "POST"]
  }
});

const db = require('./database');
require('./seed');

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Tåg across Stockholm API is running' });
});

// Hämta spelstatus (lag och poäng)
app.get('/api/game/state', (req, res) => {
  db.all("SELECT * FROM teams ORDER BY points DESC", [], (err, teams) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ teams });
  });
});

// Dra ett kort slumpmässigt
app.post('/api/cards/draw', (req, res) => {
  const { type } = req.body; // 'destination' eller 'challenge'
  if (!['destination', 'challenge'].includes(type)) {
    return res.status(400).json({ error: 'Invalid card type' });
  }

  db.get("SELECT * FROM cards WHERE type = ? AND drawn = 0 ORDER BY RANDOM() LIMIT 1", [type], (err, card) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!card) return res.status(404).json({ error: 'No cards left in this deck!' });

    // Markera som draget
    db.run("UPDATE cards SET drawn = 1 WHERE id = ?", [card.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // I en full implementation skulle vi koppla kortet till ett specifikt lag, 
      // men vi returnerar det till klienten för nu.
      res.json({ card });
    });
  });
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
