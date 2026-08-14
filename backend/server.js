const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const multer = require('multer');

const { run, get, all, ready: dbReady, newKey } = require('./database');
const auth = require('./auth');
const { createGameRoutes } = require('./game');

const app = express();
const server = http.createServer(app);

// Klienten pratar med same origin (Vite-proxy i dev, Nginx i drift), så CORS
// behövs bara för Capacitor-appen som laddas från file:// och därför skickar en
// främmande origin. Wildcard är inte ett alternativ: utan autentisering på
// /api/admin/* kunde vilken sida som helst nollställa ett pågående spel.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  'http://localhost:3001,capacitor://localhost,ionic://localhost').split(',').map(o => o.trim());

// Den publika adressen servern nås på. Används för att bygga OwnTracks-webhooken.
const PUBLIC_URL = (process.env.PUBLIC_URL || 'http://localhost:3001').replace(/\/$/, '');

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST', 'PUT'] }
});

// Uppladdningar
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const uploadDir = process.env.UPLOAD_DIR || path.join(dataDir, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// Explicit allowlist, inte /^(image|video)\//. Ett brett mönster släpper igenom
// image/svg+xml, och en SVG som serveras från appens egen origin kan köra
// script -- alltså lagrad XSS mot alla som öppnar feeden.
const ALLOWED_UPLOAD_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Saneringen är försvaret mot path traversal på en rutt utan riktig auth
    // framför sig. Ändelsen sätts från MIME-typen i stället för från klientens
    // filnamn, så en .html kan inte smygas in bakom ett tillåtet innehåll.
    const base = path.basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .slice(0, 60);
    cb(null, `${Date.now()}-${base}${ALLOWED_UPLOAD_TYPES[file.mimetype]}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (Object.prototype.hasOwnProperty.call(ALLOWED_UPLOAD_TYPES, file.mimetype)) return cb(null, true);
    const err = new Error('Endast foton och filmer får laddas upp');
    err.status = 400;
    cb(err, false);
  }
});

app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res) => {
    // nosniff hindrar att en felmärkt fil tolkas som HTML; sandbox-CSP:n gör
    // allt skriptbart innehåll verkningslöst även om något tar sig förbi
    // allowlistan. Content-Disposition sätts inte -- den skulle stoppa
    // bildbevisen från att visas i feeden.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  }
}));

// Låter rutterna skrivas sekventiellt och skickar fel till felhanteraren i
// stället för att tysta dem eller lämna requesten hängande.
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const requirePlayer = wrap(auth.requirePlayer);
const requireRunner = wrap(auth.requireRunner);
const requireAdmin = wrap(auth.requireAdmin);

// ---------------------------------------------------------------- Speltillstånd

// Det enda en icke-inloggad behöver: vilken vy appen ska visa. Här får varken
// PIN-koden, lagens positioner eller spelarnas namn följa med -- PIN:en är
// nyckeln in i spelet, och den låg tidigare öppet i /api/game/state.
app.get('/api/game/status', wrap(async (req, res) => {
  const state = await get("SELECT status, gps_mode FROM global_state WHERE id = 1");
  res.json({ state });
}));

app.get('/api/game/state', requirePlayer, wrap(async (req, res) => {
  const teams = await all("SELECT id, name, points, role, lat, lng, head_start_until FROM teams ORDER BY points DESC");
  const state = await get(`SELECT id, status, gps_mode, lunch_break_active, lunch_break_until, game_ends_at
    FROM global_state WHERE id = 1`);
  res.json({ teams, state });
}));

app.get('/api/admin/state', requireAdmin, wrap(async (req, res) => {
  const teams = await all("SELECT id, name, points, role, lat, lng, track_key FROM teams ORDER BY id");
  const state = await get("SELECT * FROM global_state WHERE id = 1");
  res.json({ teams, state });
}));

app.get('/api/game/destinations', requirePlayer, wrap(async (req, res) => {
  const destinations = await all("SELECT id, name, lat, lng FROM cards WHERE type = 'destination'");
  res.json({ destinations });
}));

app.get('/api/lobby', requirePlayer, wrap(async (req, res) => {
  const players = await all(`SELECT players.id, players.name, teams.id as team_id, teams.name as team_name
    FROM players LEFT JOIN teams ON players.team_id = teams.id`);
  res.json({ players });
}));

// ------------------------------------------------------------------------ Auth

// Fritext från spelare hamnar i databasen och i feeden. React escapar vid
// rendering, men längden måste kapas vid systemgränsen.
const trimmed = (value, max) => String(value ?? '').trim().slice(0, max);

app.post('/api/auth/join', wrap(async (req, res) => {
  const pin = trimmed(req.body.pin, 8);
  const name = trimmed(req.body.name, 40);
  if (!pin || !name) return res.status(400).json({ error: 'Data saknas' });

  const state = await get("SELECT game_pin, status FROM global_state WHERE id = 1");
  if (state.game_pin !== pin) return res.status(401).json({ error: 'Fel PIN-kod' });
  if (state.status !== 'lobby' && state.status !== 'waiting') {
    return res.status(400).json({ error: 'Spelet har redan startat' });
  }

  // Utan den här kontrollen kunde vem som helst ta över en lagkamrats identitet
  // genom att skriva samma namn. Den som tappat sin session får hjälp av domaren.
  const taken = await get("SELECT id FROM players WHERE name = ? COLLATE NOCASE", [name]);
  if (taken) return res.status(409).json({ error: 'Namnet är upptaget i det här spelet' });

  const token = newKey();
  const result = await run("INSERT INTO players (name, token) VALUES (?, ?)", [name, token]);
  io.emit('lobby_updated');
  res.json({ success: true, player: { id: result.lastID, name, team_id: null }, token });
}));

app.get('/api/auth/me', requirePlayer, wrap(async (req, res) => {
  const player = await get(`SELECT players.id, players.name, players.team_id,
      teams.name as team_name, teams.role, teams.track_key
    FROM players LEFT JOIN teams ON players.team_id = teams.id
    WHERE players.id = ?`, [req.player.id]);

  // Webhook-adressen byggs av servern, inte av klientens window.location.origin
  // -- en callback-URL får aldrig härledas ur något anroparen kontrollerar.
  const owntracksUrl = player.track_key
    ? `${PUBLIC_URL}/api/owntracks?key=${player.track_key}`
    : null;

  res.json({ player, owntracks_url: owntracksUrl });
}));

app.post('/api/admin/login', wrap(async (req, res) => {
  if (!auth.passwordMatches(req.body.password)) {
    return res.status(401).json({ error: 'Fel lösenord' });
  }
  res.json({ success: true, token: await auth.issueAdminToken() });
}));

// --------------------------------------------------------------- Domarpanelen

app.post('/api/admin/create_game', requireAdmin, wrap(async (req, res) => {
  const pin = Math.floor(1000 + Math.random() * 9000).toString();
  await run("DELETE FROM players");
  await run("DELETE FROM feed");
  await run(`UPDATE teams SET points = 0, lat = NULL, lng = NULL, head_start_until = NULL,
    current_transport = NULL, transport_start_time = NULL,
    current_destination_id = NULL, current_challenge_id = NULL`);
  await run("UPDATE cards SET drawn = 0");
  await run(`UPDATE global_state SET status = 'lobby', game_pin = ?, lunch_break_active = 0,
    lunch_break_until = NULL, lunch_break_done = 0, game_ends_at = NULL WHERE id = 1`, [pin]);

  // Exakt ett löparlag vid start, enligt regelboken.
  const teams = await all("SELECT id FROM teams ORDER BY id");
  await run("UPDATE teams SET role = 'chaser'");
  if (teams.length) {
    const runner = teams[Math.floor(Math.random() * teams.length)];
    await run("UPDATE teams SET role = 'runner' WHERE id = ?", [runner.id]);
  }

  io.emit('lobby_updated');
  io.emit('state_updated');
  res.json({ success: true, game_pin: pin });
}));

app.post('/api/admin/assign_team', requireAdmin, wrap(async (req, res) => {
  const { player_id, team_id } = req.body;
  await run("UPDATE players SET team_id = ? WHERE id = ?", [team_id, player_id]);
  io.emit('lobby_updated');
  res.json({ success: true });
}));

app.post('/api/admin/randomize_teams', requireAdmin, wrap(async (req, res) => {
  const players = await all("SELECT id FROM players");
  const teams = await all("SELECT id FROM teams");
  if (!players.length || !teams.length) {
    // Den gamla versionen svarade bara inifrån en räknare i forEach och lämnade
    // requesten hängande för alltid när lobbyn var tom.
    return res.status(400).json({ error: 'Inga spelare eller lag att slumpa' });
  }

  const shuffled = [...players].sort(() => 0.5 - Math.random());
  for (let i = 0; i < shuffled.length; i++) {
    await run("UPDATE players SET team_id = ? WHERE id = ?", [teams[i % teams.length].id, shuffled[i].id]);
  }

  io.emit('lobby_updated');
  res.json({ success: true });
}));

app.post('/api/admin/gps_mode', requireAdmin, wrap(async (req, res) => {
  await run("UPDATE global_state SET gps_mode = ? WHERE id = 1", [req.body.mode]);
  io.emit('state_updated');
  res.json({ success: true });
}));

app.post('/api/game/start', requireAdmin, wrap(async (req, res) => {
  await run("UPDATE global_state SET status = 'playing' WHERE id = 1");

  // "Spelet startar med att löparlaget drar ett destinationskort och ger sig
  // iväg med ett försprång på 10 min."
  const headStartUntil = new Date(Date.now() + 10 * 60000).toISOString();
  await run("UPDATE teams SET head_start_until = ? WHERE role = 'runner'", [headStartUntil]);

  io.emit('game_started', { head_start_until: headStartUntil });
  res.json({ success: true, head_start_until: headStartUntil });
}));

app.get('/api/admin/cards', requireAdmin, wrap(async (req, res) => {
  res.json({ cards: await all("SELECT * FROM cards") });
}));

app.post('/api/admin/cards', requireAdmin, wrap(async (req, res) => {
  const { type, name, value, lat, lng, description } = req.body;
  const result = await run(
    "INSERT INTO cards (type, name, value, lat, lng, description, drawn) VALUES (?, ?, ?, ?, ?, ?, 0)",
    [type, name, value, lat, lng, description]);
  res.json({ success: true, id: result.lastID });
}));

app.put('/api/admin/cards/:id', requireAdmin, wrap(async (req, res) => {
  const { name, value, lat, lng, description } = req.body;
  await run("UPDATE cards SET name = ?, value = ?, lat = ?, lng = ?, description = ? WHERE id = ?",
    [name, value, lat, lng, description, req.params.id]);
  res.json({ success: true });
}));

// -------------------------------------------------------------------- Position

async function storePosition(teamId, lat, lng) {
  await run("UPDATE teams SET lat = ?, lng = ? WHERE id = ?", [lat, lng, teamId]);
  io.emit('position_update', { team_id: teamId, lat, lng });
}

app.post('/api/game/position', requirePlayer, wrap(async (req, res) => {
  const state = await get("SELECT gps_mode FROM global_state WHERE id = 1");
  if (state.gps_mode === 'off') return res.status(403).json({ error: 'Positionering är avstängd av domaren' });
  if (!req.player.team_id) return res.status(403).json({ error: 'Du har inget lag ännu' });

  // team_id kommer från spelarens token, aldrig från bodyn -- annars kan vem som
  // helst skriva löparlagets position till valfri punkt.
  const { lat, lng } = req.body;
  await storePosition(req.player.team_id, lat, lng);
  res.json({ success: true });
}));

// OwnTracks kör i bakgrunden utan att webbläsaren är igång. Laget identifieras
// med sin track_key i stället för med en gissad topic-slug -- det autentiserar
// anropet och tar bort den bräckliga namnmappningen på samma gång.
app.post('/api/owntracks', wrap(async (req, res) => {
  const { _type, lat, lon } = req.body;
  if (_type !== 'location') return res.json([]);

  const key = req.query.key;
  const team = key && await get("SELECT id FROM teams WHERE track_key = ?", [key]);
  if (!team) return res.status(401).json([]);

  const state = await get("SELECT gps_mode FROM global_state WHERE id = 1");
  if (state.gps_mode === 'off') return res.json([]);

  await storePosition(team.id, lat, lon);
  res.json([]);
}));

// ------------------------------------------------------------------------ Feed

app.get('/api/feed', requirePlayer, wrap(async (req, res) => {
  const feed = await all(`SELECT feed.*, teams.name as team_name FROM feed
    LEFT JOIN teams ON feed.team_id = teams.id ORDER BY timestamp DESC LIMIT 50`);
  res.json({ feed });
}));

app.post('/api/feed/upload', requirePlayer, upload.single('media'), wrap(async (req, res) => {
  const type = trimmed(req.body.type, 20);
  const message = trimmed(req.body.message, 280);
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  // Lag och avsändare härleds ur token, aldrig ur bodyn.
  const result = await run(
    "INSERT INTO feed (team_id, player_name, type, message, image_url) VALUES (?, ?, ?, ?, ?)",
    [req.player.team_id, req.player.name, type, message, imageUrl]);

  const entry = await get(`SELECT feed.*, teams.name as team_name FROM feed
    LEFT JOIN teams ON feed.team_id = teams.id WHERE feed.id = ?`, [result.lastID]);
  io.emit('new_feed_entry', entry);
  res.json({ success: true, entry });
}));

// --------------------------------------------------------------- Spelloopet

app.use('/api/game', createGameRoutes({
  io, upload, wrap, requirePlayer, requireRunner, requireAdmin
}));

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

app.use((err, req, res, next) => {
  console.error('Fel i request:', req.method, req.path, err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Filen är för stor (max 25 MB)' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internt serverfel' });
});

Promise.all([dbReady, auth.ready]).then(() => {
  server.listen(3002, () => console.log('Server running on port 3002'));
});
