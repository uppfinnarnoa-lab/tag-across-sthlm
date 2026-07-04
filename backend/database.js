const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'game.db');
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    db.serialize(() => {
      // Teams table extended with game logic
      db.run(`CREATE TABLE IF NOT EXISTS teams (
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

      // Players table for the Lobby system
      db.run(`CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        team_id INTEGER,
        socket_id TEXT,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id)
      )`);

      // Cards table (Destinations have coordinates)
      db.run(`CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL, 
        name TEXT NOT NULL,
        value REAL NOT NULL, 
        lat REAL,
        lng REAL,
        drawn BOOLEAN DEFAULT 0
      )`);

      // Feed table for TAGEN! and Claims
      db.run(`CREATE TABLE IF NOT EXISTS feed (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER,
        player_name TEXT,
        type TEXT,
        message TEXT,
        image_url TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Global Game State
      db.run(`CREATE TABLE IF NOT EXISTS global_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        status TEXT DEFAULT 'waiting',
        game_pin TEXT,
        gps_mode TEXT DEFAULT 'wakelock',
        lunch_break_active BOOLEAN DEFAULT 0,
        lunch_break_until DATETIME
      )`);

      // Seed initial teams if not exists
      db.get("SELECT count(*) as count FROM teams", (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO teams (name, role) VALUES ('Lag Röd', 'chaser'), ('Lag Blå', 'chaser'), ('Lag Grön', 'runner')`);
            db.run(`INSERT INTO global_state (id, status, game_pin, gps_mode) VALUES (1, 'waiting', NULL, 'wakelock')`);
            console.log("Seeded initial teams and state.");
        }
      });

      // Seed initial cards if not exists
      db.get("SELECT count(*) as count FROM cards", (err, row) => {
        if (row && row.count === 0) {
            const destinations = [
              "Spår 19 på Stockholms Central", "Mårten Trotzigs gränd", "Amfiteatern på Långholmen", 
              "Norra Real", "Fatbursparken", "Karlbergs slottspark runsten", "Lilla mamsens bageri", 
              "Hammarby sjöstad observatorium", "UMA-klistermärke på gångbron vid Lilla djurgårdsakademin", 
              "Pizzeria Karavan", "Kaknästornet", "Arenatorget", "Kungseken Djurgården", 
              "Edvard Andersons växthus", "Kronärtskocka Stora Coop Västberga", "Hoppbacken Enskede", 
              "Legobutiken MOS", "Lekplatsen småkryp", "Järlas klubbstuga", "Lidingö Värmeverk", 
              "Nacka Utsiktsplats", "Ålstensskogens Mälarvy", "Systembolaget Lidingö", 
              "Ankomsthallen Bromma", "Coolt C-hus i Pungpinan", "Toppen av pyramiden i Johannisdalsparken", 
              "Natti-natti 2023, sträcka 1, kontroll 2", "Gubbängens IP", "Rissneängarna Plaskdamm", "Nälsta Parkourpark"
            ];
            
            const stmt = db.prepare("INSERT INTO cards (type, name, value, lat, lng, drawn) VALUES ('destination', ?, 10, 59.330, 18.060, 0)");
            destinations.forEach(name => stmt.run(name));
            stmt.finalize();

            const challenges = [
              { name: "Sjung en sång på torget", value: 2 },
              { name: "Ta en selfie med en främling", value: 3 },
              { name: "Åk tre stationer baklänges", value: 2 }
            ];
            const stmtCh = db.prepare("INSERT INTO cards (type, name, value, drawn) VALUES ('challenge', ?, ?, 0)");
            challenges.forEach(ch => stmtCh.run(ch.name, ch.value));
            stmtCh.finalize();

            console.log("Seeded 30 destinations and default challenges.");
        }
      });
    });
  }
});

module.exports = db;
