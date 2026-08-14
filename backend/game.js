const express = require('express');
const { run, get, all } = require('./database');

// Regelboken: tåg 10 min, buss 20, båt 30, innan man måste byta till ett av de
// andra två färdmedlen. Ersättningsbussarna är undantag -- de räknas som tåg
// (så en buss får följa på dem) men 25/26 har bussens 20 minuter medan 21L har
// tågets 10.
const TRANSPORTS = {
  train: { label: 'Tåg', category: 'train', minutes: 10 },
  bus: { label: 'Buss', category: 'bus', minutes: 20 },
  boat: { label: 'Båt', category: 'boat', minutes: 30 },
  bus_25_26: { label: 'Ersättningsbuss 25/26', category: 'train', minutes: 20 },
  bus_21l: { label: 'Ersättningsbuss 21L', category: 'train', minutes: 10 }
};

const HEAD_START_MINUTES = 15;
const HEAD_START_AFTER_LUNCH_MINUTES = 10;
const LUNCH_MINUTES = 45;
const LUNCH_FROM_HOUR = 12;

// Lunchregeln går på svensk lokaltid. Containern kör UTC (node:20-alpine har
// ingen tzdata, så TZ-variabeln biter inte), och att lita på systemets tidszon
// hade gjort regeln två timmar fel på sommaren.
const stockholmHour = () => Number(new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm', hour: 'numeric', hour12: false
}).format(new Date()));

const nowIso = () => new Date().toISOString();
const isFuture = (value) => Boolean(value) && new Date(value).getTime() > Date.now();
const plusMinutes = (from, minutes) => new Date(new Date(from).getTime() + minutes * 60000).toISOString();

async function addFeedEntry(io, { teamId, playerName, type, message, imageUrl }) {
  const result = await run(
    "INSERT INTO feed (team_id, player_name, type, message, image_url) VALUES (?, ?, ?, ?, ?)",
    [teamId, playerName, type, message, imageUrl]);
  const entry = await get(`SELECT feed.*, teams.name as team_name FROM feed
    LEFT JOIN teams ON feed.team_id = teams.id WHERE feed.id = ?`, [result.lastID]);
  io.emit('new_feed_entry', entry);
  return entry;
}

function createGameRoutes({ io, upload, wrap, requirePlayer, requireRunner, requireAdmin, trimmed }) {
  const router = express.Router();

  router.get('/transports', (req, res) => {
    res.json({
      transports: Object.entries(TRANSPORTS).map(([id, t]) => ({ id, label: t.label, minutes: t.minutes }))
    });
  });

  // Löparlagets aktuella läge: destination, utmaning och restidsgräns.
  router.get('/mine', requirePlayer, wrap(async (req, res) => {
    if (!req.player.team_id) return res.json({ team: null });

    const team = await get(`SELECT id, name, role, points, head_start_until,
      current_transport, transport_start_time, current_destination_id, current_challenge_id
      FROM teams WHERE id = ?`, [req.player.team_id]);

    const destination = team.current_destination_id
      ? await get("SELECT id, name, value, lat, lng FROM cards WHERE id = ?", [team.current_destination_id])
      : null;
    const challenge = team.current_challenge_id
      ? await get("SELECT id, name, value, description FROM cards WHERE id = ?", [team.current_challenge_id])
      : null;

    const transport = TRANSPORTS[team.current_transport];
    const transportDeadline = transport && team.transport_start_time
      ? plusMinutes(team.transport_start_time, transport.minutes)
      : null;

    res.json({
      team,
      destination,
      challenge,
      transport: transport ? { id: team.current_transport, ...transport, deadline: transportDeadline } : null,
      potential_points: destination ? Math.round(destination.value * (challenge ? challenge.value : 1)) : 0
    });
  }));

  router.post('/draw', requirePlayer, requireRunner, wrap(async (req, res) => {
    const type = req.body.type === 'challenge' ? 'challenge' : 'destination';
    const team = await get("SELECT current_destination_id, current_challenge_id FROM teams WHERE id = ?",
      [req.player.team_id]);

    // "De får alltså inte dra ett andra kort i förväg."
    if (type === 'destination' && team.current_destination_id) {
      return res.status(409).json({ error: 'Ni har redan ett destinationskort. Nå det först.' });
    }
    if (type === 'challenge' && !team.current_destination_id) {
      return res.status(409).json({ error: 'Extrauppdrag dras under resan till en destination.' });
    }
    if (type === 'challenge' && team.current_challenge_id) {
      return res.status(409).json({ error: 'Ni har redan ett extrauppdrag igång.' });
    }

    const card = await get("SELECT * FROM cards WHERE type = ? AND drawn = 0 ORDER BY RANDOM() LIMIT 1", [type]);
    if (!card) return res.status(404).json({ error: 'Inga kort kvar i leken' });

    await run("UPDATE cards SET drawn = 1 WHERE id = ?", [card.id]);
    const column = type === 'destination' ? 'current_destination_id' : 'current_challenge_id';
    await run(`UPDATE teams SET ${column} = ? WHERE id = ?`, [card.id, req.player.team_id]);

    io.emit('card_drawn', { team_id: req.player.team_id, card });
    res.json({ card });
  }));

  router.post('/transport', requirePlayer, requireRunner, wrap(async (req, res) => {
    const mode = req.body.mode;
    const next = TRANSPORTS[mode];
    if (!next) return res.status(400).json({ error: 'Okänt färdmedel' });

    const team = await get("SELECT current_transport FROM teams WHERE id = ?", [req.player.team_id]);
    const previous = TRANSPORTS[team.current_transport];

    // "Man kan inte efter 20 min buss byta till en annan buss, utan måste ha åkt
    // minst en station med ett annat färdmedel innan."
    if (previous && previous.category === next.category) {
      return res.status(409).json({ error: `Ni måste byta färdmedel innan ni tar ${next.label} igen.` });
    }

    const startedAt = nowIso();
    await run("UPDATE teams SET current_transport = ?, transport_start_time = ? WHERE id = ?",
      [mode, startedAt, req.player.team_id]);

    res.json({ transport: { id: mode, ...next, deadline: plusMinutes(startedAt, next.minutes) } });
  }));

  router.post('/claim', requirePlayer, requireRunner, upload.single('media'), wrap(async (req, res) => {
    const team = await get(`SELECT id, name, points, current_destination_id, current_challenge_id
      FROM teams WHERE id = ?`, [req.player.team_id]);

    if (!team.current_destination_id) {
      return res.status(409).json({ error: 'Ni har ingen destination att göra anspråk på' });
    }
    if (!req.file) return res.status(400).json({ error: 'Bildbevis krävs' });

    const destination = await get("SELECT name, value FROM cards WHERE id = ?", [team.current_destination_id]);
    const challenge = team.current_challenge_id
      ? await get("SELECT name, value FROM cards WHERE id = ?", [team.current_challenge_id])
      : null;

    // "Poängen avrundas efter multiplicering till närmaste heltal."
    const points = Math.round(destination.value * (challenge ? challenge.value : 1));

    await run("UPDATE teams SET points = points + ? WHERE id = ?", [points, team.id]);
    // Reseperioden tar slut när man når sin destination, oavsett hur långt in i
    // tidsfönstret man är -- därför nollas färdmedlet här.
    await run(`UPDATE teams SET current_destination_id = NULL, current_challenge_id = NULL,
      current_transport = NULL, transport_start_time = NULL WHERE id = ?`, [team.id]);

    const message = challenge
      ? `${destination.name} — ${destination.value} p × ${challenge.value} (${challenge.name}) = ${points} p`
      : `${destination.name} — ${points} p`;

    await addFeedEntry(io, {
      teamId: team.id,
      playerName: req.player.name,
      type: 'claim',
      message,
      imageUrl: `/uploads/${req.file.filename}`
    });

    io.emit('state_updated');
    res.json({ success: true, points, total: team.points + points });
  }));

  router.post('/tag', requirePlayer, upload.single('media'), wrap(async (req, res) => {
    if (!req.player.team_id) return res.status(403).json({ error: 'Du har inget lag ännu' });
    if (!req.file) return res.status(400).json({ error: 'Videobevis krävs' });

    const state = await get("SELECT status, lunch_break_done FROM global_state WHERE id = 1");
    if (state.status !== 'playing') return res.status(409).json({ error: 'Spelet pågår inte' });

    const tagger = await get("SELECT id, name, role FROM teams WHERE id = ?", [req.player.team_id]);
    if (tagger.role === 'runner') return res.status(409).json({ error: 'Löparlaget kan inte ta sig självt' });

    const runner = await get("SELECT * FROM teams WHERE role = 'runner'");
    if (!runner) return res.status(409).json({ error: 'Det finns inget löparlag' });

    // "Övriga lag måste stå stilla under den tiden."
    if (isFuture(runner.head_start_until)) {
      return res.status(409).json({ error: 'Löparlaget har fortfarande försprång' });
    }

    // Destinationen nåddes aldrig, så kortet går tillbaka i leken. Utmaningen
    // gör det inte -- den drogs och förbrukades.
    if (runner.current_destination_id) {
      await run("UPDATE cards SET drawn = 0 WHERE id = ?", [runner.current_destination_id]);
    }

    // Lunchen bryter spelet första gången ett lag tas efter klockan tolv.
    const startLunch = !state.lunch_break_done && stockholmHour() >= LUNCH_FROM_HOUR;
    const lunchUntil = startLunch ? plusMinutes(nowIso(), LUNCH_MINUTES) : null;
    const headStartFrom = lunchUntil || nowIso();
    const headStartMinutes = startLunch ? HEAD_START_AFTER_LUNCH_MINUTES : HEAD_START_MINUTES;
    const headStartUntil = plusMinutes(headStartFrom, headStartMinutes);

    await run(`UPDATE teams SET role = 'chaser', current_destination_id = NULL,
      current_challenge_id = NULL, current_transport = NULL, transport_start_time = NULL,
      head_start_until = NULL WHERE id = ?`, [runner.id]);
    await run("UPDATE teams SET role = 'runner', head_start_until = ? WHERE id = ?",
      [headStartUntil, tagger.id]);

    if (startLunch) {
      await run(`UPDATE global_state SET lunch_break_active = 1, lunch_break_until = ?,
        lunch_break_done = 1 WHERE id = 1`, [lunchUntil]);
    }

    await addFeedEntry(io, {
      teamId: tagger.id,
      playerName: req.player.name,
      type: 'tag',
      message: `TAGEN! ${tagger.name} tog ${runner.name}${startLunch ? ' — lunchpaus startar' : ''}`,
      imageUrl: `/uploads/${req.file.filename}`
    });

    io.emit('roles_changed', {
      runner_team_id: tagger.id,
      head_start_until: headStartUntil,
      lunch_break_until: lunchUntil
    });
    io.emit('state_updated');

    res.json({ success: true, head_start_until: headStartUntil, lunch_break_until: lunchUntil });
  }));

  router.post('/end', requireAdmin, wrap(async (req, res) => {
    await run("UPDATE global_state SET status = 'finished' WHERE id = 1");
    const teams = await all("SELECT id, name, points FROM teams ORDER BY points DESC");
    io.emit('game_finished', { teams });
    res.json({ success: true, teams });
  }));

  return router;
}

module.exports = { createGameRoutes, TRANSPORTS };
