const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { destinations, challenges } = require('./cards');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'game.db');

fs.mkdirSync(dataDir, { recursive: true });

const db = new sqlite3.Database(dbPath);

// Promise-omslag. Rutterna i server.js byggde tidigare djupa callback-pyramider
// där fel tystades och svar ibland aldrig skickades -- med de här kan de skrivas
// sekventiellt och låta ett kastat fel bubbla till felhanteraren.
const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
});
const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});
const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
});

const newKey = () => crypto.randomBytes(24).toString('hex');

async function ensureColumn(table, column, definition) {
  const cols = await all(`PRAGMA table_info(${table})`);
  if (!cols.some(c => c.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function createTables() {
  await run(`CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    points REAL DEFAULT 0,
    role TEXT DEFAULT 'chaser',
    lat REAL,
    lng REAL,
    current_transport TEXT,
    transport_start_time DATETIME,
    head_start_until DATETIME,
    current_destination_id INTEGER
  )`);

  await run(`CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    team_id INTEGER,
    socket_id TEXT,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    value REAL NOT NULL,
    lat REAL,
    lng REAL,
    drawn BOOLEAN DEFAULT 0
  )`);

  await run(`CREATE TABLE IF NOT EXISTS feed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER,
    player_name TEXT,
    type TEXT,
    message TEXT,
    image_url TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS global_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    status TEXT DEFAULT 'waiting',
    game_pin TEXT,
    gps_mode TEXT DEFAULT 'wakelock',
    lunch_break_active BOOLEAN DEFAULT 0,
    lunch_break_until DATETIME
  )`);
}

async function migrate() {
  await ensureColumn('players', 'token', 'TEXT');
  await ensureColumn('teams', 'track_key', 'TEXT');
  await ensureColumn('teams', 'current_challenge_id', 'INTEGER');
  await ensureColumn('cards', 'description', 'TEXT');
  await ensureColumn('global_state', 'lunch_break_done', 'BOOLEAN DEFAULT 0');
  await ensureColumn('global_state', 'game_ends_at', 'DATETIME');

  // Lag som fanns före track_key-kolumnen behöver en nyckel för OwnTracks.
  const keyless = await all("SELECT id FROM teams WHERE track_key IS NULL");
  for (const team of keyless) {
    await run("UPDATE teams SET track_key = ? WHERE id = ?", [newKey(), team.id]);
  }
}

async function seed() {
  const teamCount = await get("SELECT count(*) as count FROM teams");
  if (teamCount.count === 0) {
    for (const [name, role] of [['Lag Röd', 'chaser'], ['Lag Blå', 'chaser'], ['Lag Grön', 'runner']]) {
      await run("INSERT INTO teams (name, role, track_key) VALUES (?, ?, ?)", [name, role, newKey()]);
    }
  }

  const stateRow = await get("SELECT count(*) as count FROM global_state");
  if (stateRow.count === 0) {
    await run("INSERT INTO global_state (id, status, gps_mode) VALUES (1, 'waiting', 'wakelock')");
  }

  for (const d of destinations) {
    // Reparerar även befintliga rader. En tidigare seed lade in samtliga 30
    // destinationer på Stockholms Central med värde 10 -- den här UPSERT-en
    // rättar dem utan att databasen behöver återställas.
    const existing = await get("SELECT id FROM cards WHERE type = 'destination' AND name = ?", [d.name]);
    if (existing) {
      await run("UPDATE cards SET value = ?, lat = ?, lng = ? WHERE id = ?", [d.value, d.lat, d.lng, existing.id]);
    } else {
      await run("INSERT INTO cards (type, name, value, lat, lng, drawn) VALUES ('destination', ?, ?, ?, ?, 0)",
        [d.name, d.value, d.lat, d.lng]);
    }
  }

  for (const c of challenges) {
    const existing = await get("SELECT id FROM cards WHERE type = 'challenge' AND name = ?", [c.name]);
    if (existing) {
      await run("UPDATE cards SET value = ?, description = ? WHERE id = ?", [c.value, c.description, existing.id]);
    } else {
      await run("INSERT INTO cards (type, name, value, description, drawn) VALUES ('challenge', ?, ?, ?, 0)",
        [c.name, c.value, c.description]);
    }
  }

  // Platshållarutmaningarna från den ursprungliga seeden finns inte i
  // regelboken och ska bort när de riktiga 22 är på plats.
  await run("DELETE FROM cards WHERE type = 'challenge' AND name NOT IN (" +
    challenges.map(() => '?').join(',') + ")", challenges.map(c => c.name));
}

const ready = (async () => {
  await createTables();
  await migrate();
  await seed();
  console.log(`Databas klar: ${destinations.length} destinationer, ${challenges.length} utmaningar.`);
})();

module.exports = { db, run, get, all, ready, newKey };
