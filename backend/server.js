const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = require('./database');
require('./seed');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://tag.helgars.se", "http://localhost:3000"], 
    methods: ["GET", "POST"]
  }
});

// Setup uploads folder securely
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer storage with secure filenames
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    // Avoid directory traversal by sanitizing filename
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, Date.now() + '-' + safeName)
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB limit
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API running' });
});

// Login logik
app.post('/api/auth/login', (req, res) => {
  const { passcode } = req.body;
  if (!passcode) return res.status(400).json({ error: 'Passcode saknas' });

  db.get("SELECT id, name, role FROM teams WHERE passcode = ?", [passcode], (err, team) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!team) return res.status(401).json({ error: 'Felaktig PIN-kod' });
    res.json({ success: true, team });
  });
});

// Game state
app.get('/api/game/state', (req, res) => {
  db.all("SELECT id, name, points, role, lat, lng FROM teams ORDER BY points DESC", [], (err, teams) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get("SELECT * FROM global_state WHERE id = 1", (err, state) => {
      res.json({ teams, state });
    });
  });
});

// Starta spelet (Admin)
app.post('/api/game/start', (req, res) => {
  db.run("UPDATE teams SET points = 0, role = 'chaser' WHERE name != 'Lag Grön' AND name != 'Admin'", [], () => {
    db.run("UPDATE teams SET role = 'runner' WHERE name = 'Lag Grön'", [], () => {
      db.run("UPDATE cards SET drawn = 0", [], () => {
        db.run("UPDATE global_state SET status = 'playing' WHERE id = 1", [], () => {
          io.emit('game_started', { message: 'Spelet har börjat!' });
          res.json({ success: true });
        });
      });
    });
  });
});

// Hämta destinationer (för kartan)
app.get('/api/game/destinations', (req, res) => {
  db.all("SELECT id, name, lat, lng FROM cards WHERE type = 'destination'", [], (err, destinations) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ destinations });
  });
});

// ADMIN: Hämta alla kort
app.get('/api/admin/cards', (req, res) => {
  db.all("SELECT * FROM cards", [], (err, cards) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ cards });
  });
});

// ADMIN: Uppdatera ett kort
app.put('/api/admin/cards/:id', (req, res) => {
  const { id } = req.params;
  const { name, value, lat, lng } = req.body;
  
  db.run(
    "UPDATE cards SET name = ?, value = ?, lat = ?, lng = ? WHERE id = ?",
    [name, value, lat, lng, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, changes: this.changes });
    }
  );
});

// Draw a card
app.post('/api/cards/draw', (req, res) => {
  const { type, team_id } = req.body; 
  db.get("SELECT * FROM cards WHERE type = ? AND drawn = 0 ORDER BY RANDOM() LIMIT 1", [type], (err, card) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!card) return res.status(404).json({ error: 'No cards left!' });

    db.run("UPDATE cards SET drawn = 1 WHERE id = ?", [card.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      io.emit('card_drawn', { team_id, card });
      res.json({ card });
    });
  });
});

// TAGEN! logic
app.post('/api/game/tag', upload.single('media'), (req, res) => {
  const { team_id } = req.body;
  if (!team_id) return res.status(400).json({ error: 'Missing team_id' });

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const fifteenMinsLater = new Date(Date.now() + 15 * 60000).toISOString();

  // 1. All teams become chasers
  db.run("UPDATE teams SET role = 'chaser', head_start_until = NULL", [], (err) => {
    // 2. The tagging team becomes runner and gets 15 min head start
    db.run("UPDATE teams SET role = 'runner', head_start_until = ? WHERE id = ?", [fifteenMinsLater, team_id], (err) => {
      // 3. Post to feed
      db.run("INSERT INTO feed (team_id, type, message, image_url) VALUES (?, 'tag', 'TAGEN!', ?)", [team_id, imageUrl], (err) => {
        io.emit('tagged', { team_id, imageUrl, head_start_until: fifteenMinsLater });
        res.json({ success: true, message: 'Tagen registrerad!' });
      });
    });
  });
});

// Update position
app.post('/api/game/position', (req, res) => {
  const { team_id, lat, lng } = req.body;
  db.run("UPDATE teams SET lat = ?, lng = ? WHERE id = ?", [lat, lng, team_id], (err) => {
    io.emit('position_update', { team_id, lat, lng });
    res.json({ success: true });
  });
});

// Claim destination
app.post('/api/game/claim', upload.single('media'), (req, res) => {
  const { team_id, points } = req.body;
  if (!team_id || !points) return res.status(400).json({ error: 'Missing team_id or points' });

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const numPoints = parseFloat(points);

  db.run("UPDATE teams SET points = points + ? WHERE id = ?", [numPoints, team_id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.run("INSERT INTO feed (team_id, type, message, image_url) VALUES (?, 'claim', 'Framme vid destination!', ?)", [team_id, imageUrl], (err) => {
      io.emit('claimed', { team_id, points: numPoints, imageUrl });
      res.json({ success: true, message: 'Poäng registrerade!' });
    });
  });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
