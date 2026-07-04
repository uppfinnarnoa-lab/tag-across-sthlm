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
      // Teams table
      db.run(`CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        points INTEGER DEFAULT 0,
        role TEXT DEFAULT 'chaser'
      )`);

      // Cards table
      db.run(`CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL, 
        name TEXT NOT NULL,
        value REAL NOT NULL, 
        drawn BOOLEAN DEFAULT 0
      )`);

      // Feed table (for phase 4, but good to have)
      db.run(`CREATE TABLE IF NOT EXISTS feed (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER,
        type TEXT,
        message TEXT,
        image_url TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Seed initial teams if not exists
      db.get("SELECT count(*) as count FROM teams", (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO teams (name, role) VALUES ('Lag Röd', 'chaser'), ('Lag Blå', 'chaser'), ('Lag Grön', 'runner')`);
            console.log("Seeded initial teams.");
        }
      });
    });
  }
});

module.exports = db;
