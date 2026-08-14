const crypto = require('crypto');
const { run, get, newKey } = require('./database');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Bosse';

if (!process.env.ADMIN_PASSWORD) {
  console.warn('VARNING: ADMIN_PASSWORD är inte satt -- använder utvecklingslösenordet. Sätt den i produktion.');
}

// Domarens sessioner ligger i databasen, inte i minnet: backend startar om vid
// varje kodändring i dev och kan starta om mitt i en sju timmar lång match.
const ready = run(`CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

function passwordMatches(candidate) {
  const a = Buffer.from(String(candidate || ''));
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// En match är en dag lång. En domarsession som aldrig går ut är en nyckel som
// ligger kvar i en telefon för alltid.
const ADMIN_SESSION_HOURS = 12;

async function issueAdminToken() {
  const token = newKey();
  await run("DELETE FROM admin_sessions WHERE created_at < datetime('now', ?)", [`-${ADMIN_SESSION_HOURS} hours`]);
  await run("INSERT INTO admin_sessions (token) VALUES (?)", [token]);
  return token;
}

function bearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function requireAdmin(req, res, next) {
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: 'Domarbehörighet krävs' });
  const session = await get(
    "SELECT token FROM admin_sessions WHERE token = ? AND created_at >= datetime('now', ?)",
    [token, `-${ADMIN_SESSION_HOURS} hours`]);
  if (!session) return res.status(401).json({ error: 'Domarsessionen har gått ut' });
  next();
}

async function requirePlayer(req, res, next) {
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: 'Du är inte med i spelet' });
  const player = await get("SELECT id, name, team_id FROM players WHERE token = ?", [token]);
  if (!player) return res.status(401).json({ error: 'Sessionen gäller inte längre' });
  req.player = player;
  next();
}

// Lagbyten sker under spelets gång, så rollen måste läsas färskt vid varje
// anrop -- den kan inte cachas i spelarens token.
async function requireRunner(req, res, next) {
  if (!req.player.team_id) return res.status(403).json({ error: 'Du har inget lag ännu' });
  const team = await get("SELECT role FROM teams WHERE id = ?", [req.player.team_id]);
  if (!team || team.role !== 'runner') {
    return res.status(403).json({ error: 'Bara löparlaget kan göra det här' });
  }
  next();
}

module.exports = { ready, passwordMatches, issueAdminToken, requireAdmin, requirePlayer, requireRunner };
