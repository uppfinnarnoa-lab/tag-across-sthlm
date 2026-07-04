const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const db = require('./database');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost:3000', 'https://tag.helgars.se'];
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://tag.helgars.se'],
    methods: ['GET', 'POST', 'PUT']
  }
});

// Configure Multer for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '/app/data/uploads/'),
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + '-' + cleanName);
  }
});
const upload = multer({ 
  storage, 
  limits: { fileSize: 25 * 1024 * 1024 } 
});

// LOBBY & AUTH API

app.get('/api/game/state', (req, res) => {
  db.all("SELECT id, name, points, role, lat, lng FROM teams ORDER BY points DESC", [], (err, teams) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get("SELECT * FROM global_state WHERE id = 1", (err, state) => {
      res.json({ teams, state });
    });
  });
});

app.post('/api/admin/create_game', (req, res) => {
  const pin = Math.floor(1000 + Math.random() * 9000).toString();
  db.run("DELETE FROM players", [], () => {
    db.run("UPDATE teams SET points = 0, lat = NULL, lng = NULL", [], () => {
      db.run("UPDATE cards SET drawn = 0", [], () => {
        db.run("UPDATE global_state SET status = 'lobby', game_pin = ? WHERE id = 1", [pin], () => {
          io.emit('lobby_updated');
          res.json({ success: true, game_pin: pin });
        });
      });
    });
  });
});

app.post('/api/auth/join', (req, res) => {
  const { pin, name } = req.body;
  if (!pin || !name) return res.status(400).json({ error: 'Data saknas' });

  db.get("SELECT game_pin, status FROM global_state WHERE id = 1", (err, state) => {
    if (err) return res.status(500).json({ error: err.message });
    if (state.game_pin !== pin) return res.status(401).json({ error: 'Fel PIN-kod' });
    if (state.status !== 'lobby' && state.status !== 'waiting') return res.status(400).json({ error: 'Spelet har redan startat' });

    db.run("INSERT INTO players (name) VALUES (?)", [name], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const playerId = this.lastID;
      io.emit('lobby_updated');
      res.json({ success: true, player: { id: playerId, name } });
    });
  });
});

app.get('/api/lobby', (req, res) => {
  db.all("SELECT players.id, players.name, teams.id as team_id, teams.name as team_name FROM players LEFT JOIN teams ON players.team_id = teams.id", [], (err, players) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ players });
  });
});

app.post('/api/admin/assign_team', (req, res) => {
  const { player_id, team_id } = req.body;
  db.run("UPDATE players SET team_id = ? WHERE id = ?", [team_id, player_id], () => {
    io.emit('lobby_updated');
    res.json({ success: true });
  });
});

app.post('/api/admin/randomize_teams', (req, res) => {
  db.all("SELECT id FROM players", [], (err, players) => {
    db.all("SELECT id FROM teams", [], (err, teams) => {
      let shuffled = players.sort(() => 0.5 - Math.random());
      let queries = 0;
      shuffled.forEach((p, index) => {
        const teamId = teams[index % teams.length].id;
        db.run("UPDATE players SET team_id = ? WHERE id = ?", [teamId, p.id], () => {
          queries++;
          if (queries === shuffled.length) {
            io.emit('lobby_updated');
            res.json({ success: true });
          }
        });
      });
    });
  });
});

app.post('/api/game/start', (req, res) => {
  db.run("UPDATE global_state SET status = 'playing' WHERE id = 1", [], () => {
    io.emit('game_started');
    res.json({ success: true });
  });
});

app.post('/api/admin/gps_mode', (req, res) => {
  const { mode } = req.body;
  db.run("UPDATE global_state SET gps_mode = ? WHERE id = 1", [mode], () => {
    io.emit('state_updated');
    res.json({ success: true });
  });
});

// OwnTracks Webhook (Tar emot positioner i bakgrunden utan att webbläsaren är igång!)
app.post('/api/owntracks', (req, res) => {
  const { _type, lat, lon, topic } = req.body;
  
  if (_type === 'location' && topic) {
    // Topic = "tagacross/lag-rod", split by "/" to get "lag-rod"
    const parts = topic.split('/');
    const teamNameSlug = parts[parts.length - 1]; 
    
    // Convert slug back to team name or search
    const searchMap: any = {
      'lag-rod': 'Lag Röd',
      'lag-bla': 'Lag Blå',
      'lag-gron': 'Lag Grön'
    };
    
    const actualTeamName = searchMap[teamNameSlug] || teamNameSlug;

    db.get("SELECT id FROM teams WHERE name = ? COLLATE NOCASE", [actualTeamName], (err, team) => {
      if (team) {
        db.run("UPDATE teams SET lat = ?, lng = ? WHERE id = ?", [lat, lon, team.id], () => {
          io.emit('position_update', { team_id: team.id, lat, lng: lon });
        });
      }
    });
  }
  
  // OwnTracks expects empty JSON or 200 OK
  res.json([]);
});

// REST OF API
app.get('/api/game/destinations', (req, res) => {
  db.all("SELECT id, name, lat, lng FROM cards WHERE type = 'destination'", [], (err, destinations) => {
    res.json({ destinations });
  });
});

app.get('/api/admin/cards', (req, res) => {
  db.all("SELECT * FROM cards", [], (err, cards) => {
    res.json({ cards });
  });
});

app.post('/api/admin/cards', (req, res) => {
  const { type, name, value, lat, lng } = req.body;
  db.run("INSERT INTO cards (type, name, value, lat, lng, drawn) VALUES (?, ?, ?, ?, ?, 0)", [type, name, value, lat, lng], function () {
    res.json({ success: true, id: this.lastID });
  });
});

app.put('/api/admin/cards/:id', (req, res) => {
  const { id } = req.params;
  const { name, value, lat, lng } = req.body;
  db.run("UPDATE cards SET name = ?, value = ?, lat = ?, lng = ? WHERE id = ?", [name, value, lat, lng, id], function () {
    res.json({ success: true });
  });
});

app.post('/api/cards/draw', (req, res) => {
  const { type, team_id } = req.body; 
  db.get("SELECT * FROM cards WHERE type = ? AND drawn = 0 ORDER BY RANDOM() LIMIT 1", [type], (err, card) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!card) return res.status(404).json({ error: 'Inga kort kvar' });
    
    db.run("UPDATE cards SET drawn = 1 WHERE id = ?", [card.id], () => {
      io.emit('card_drawn', { team_id, card });
      res.json({ card });
    });
  });
});

app.post('/api/game/position', (req, res) => {
  const { team_id, lat, lng } = req.body;
  db.run("UPDATE teams SET lat = ?, lng = ? WHERE id = ?", [lat, lng, team_id], () => {
    io.emit('position_update', { team_id, lat, lng });
    res.json({ success: true });
  });
});

app.get('/api/feed', (req, res) => {
  db.all("SELECT feed.*, teams.name as team_name FROM feed LEFT JOIN teams ON feed.team_id = teams.id ORDER BY timestamp DESC LIMIT 50", [], (err, rows) => {
    res.json({ feed: rows });
  });
});

app.post('/api/feed/upload', upload.single('media'), (req, res) => {
  const { team_id, type, message, player_name } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  db.run("INSERT INTO feed (team_id, player_name, type, message, image_url) VALUES (?, ?, ?, ?, ?)", 
    [team_id, player_name, type, message, imageUrl], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const newEntry = { id: this.lastID, team_id, player_name, type, message, image_url: imageUrl };
      io.emit('new_feed_entry', newEntry);
      res.json({ success: true, entry: newEntry });
  });
});

// Socket.io logic
io.on('connection', (socket) => {
  console.log('User connected', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected', socket.id);
  });
});

server.listen(3002, () => {
  console.log('Server running on port 3002');
});
