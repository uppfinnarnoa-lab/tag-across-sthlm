# Tåg across Stockholm — frontend

React 19 + Vite + TypeScript + Capacitor. Spelklienten för
[regelboken](../Tåg%20across%20Stockholm%201.1.md).

## Köra

Hela stacken körs i Docker från repo-roten:

```bash
docker-compose up -d --build   # första gången eller efter beroendeändringar
docker-compose restart          # kodändringar i frontend (Vite hot-reloadar)
```

Frontend ligger på `http://localhost:3001`, backend på `http://localhost:3002`.

> **`node --watch` plockar inte upp ändringar över Windows bind-mount.** Frontend
> hot-reloadar (`CHOKIDAR_USEPOLLING`), men backend gör det inte — kör
> `docker-compose restart backend` efter varje ändring i `backend/`.

Utan Docker: `npm install && npm run dev` i den här katalogen, med backend
igång på 3002.

## Adressering — allt är same origin

Klienten anropar **aldrig** backend på en absolut adress. Alla anrop är
relativa (`/api/...`, `/uploads/...`, `/socket.io`), och `apiFetch` i
[`src/api.ts`](src/api.ts) lägger på rätt `Authorization`-header.

- **Dev:** Vite proxar `/api`, `/uploads` och `/socket.io` till `BACKEND_URL`.
- **Drift:** Nginx gör samma sak.
- **Capacitor:** laddas från `file://` och har ingen origin att vara "same"
  med. Bara där sätts `VITE_API_URL` till den absoluta adressen.

Det gör att samma kod fungerar i dev, på en telefon över LAN och bakom Nginx —
och att CORS inte behövs alls i de två första fallen.

## Identitet

Spelaren får ett token vid `POST /api/auth/join`. Det ligger i localStorage och
skickas som `Authorization: Bearer <token>`.

**Laget läses aldrig ur localStorage.** Domaren delar in lag *efter* att
spelaren gått med, och rollen byter ägare vid varje tagning, så
[`usePlayer`](src/usePlayer.ts) hämtar spelarens post från `/api/auth/me` och
uppdaterar den vid `lobby_updated` och `roles_changed`.

Domaren loggar in separat via `POST /api/admin/login` och får ett eget token
som gäller i 12 timmar.

## API

Alla svar är JSON. `401` betyder saknat eller ogiltigt token.

### Publikt

| Metod | Rutt | Svar |
|-------|------|------|
| `GET` | `/api/game/status` | `{ state: { status, gps_mode } }` |
| `POST` | `/api/auth/join` | `{ player, token }` — `409` om namnet är upptaget |
| `POST` | `/api/admin/login` | `{ token }` |
| `POST` | `/api/owntracks?key=<track_key>` | `[]` — webhook, autentiseras med lagets nyckel |

`/api/game/status` innehåller medvetet varken PIN, positioner eller
spelarnamn — PIN:en är nyckeln in i spelet.

### Kräver spelartoken

| Metod | Rutt | Svar |
|-------|------|------|
| `GET` | `/api/auth/me` | `{ player, owntracks_url }` |
| `GET` | `/api/game/state` | `{ teams, state }` — utan PIN |
| `GET` | `/api/game/mine` | `{ team, destination, challenge, transport, potential_points }` |
| `GET` | `/api/game/destinations` | `{ destinations }` |
| `GET` | `/api/game/transports` | `{ transports }` |
| `GET` | `/api/lobby` | `{ players }` |
| `GET` | `/api/feed` | `{ feed }` — senaste 50 |
| `POST` | `/api/game/position` | `{ success }` — laget tas från token, inte bodyn |
| `POST` | `/api/feed/upload` | `{ entry }` — multipart `media` |
| `POST` | `/api/game/tag` | `{ head_start_until, lunch_break_until }` — multipart `media`, jagare |

### Kräver spelartoken + löparroll

| Metod | Rutt | Svar |
|-------|------|------|
| `POST` | `/api/game/draw` | `{ card }` — `{ type: 'destination' \| 'challenge' }` |
| `POST` | `/api/game/transport` | `{ transport }` — `{ mode }` |
| `POST` | `/api/game/claim` | `{ points, total }` — multipart `media` |

### Kräver domartoken

`GET /api/admin/state`, `GET /api/admin/lobby`, `GET /api/admin/cards`,
`POST /api/admin/cards`, `PUT /api/admin/cards/:id`,
`POST /api/admin/create_game`, `POST /api/admin/assign_team`,
`POST /api/admin/randomize_teams`, `POST /api/admin/gps_mode`,
`POST /api/game/start`, `POST /api/game/end`.

Bara `/api/admin/state` innehåller `game_pin`.

## WebSocket-kontrakt

Servern sänder, klienten lyssnar. En delad anslutning per klient
(`socket` i `src/api.ts`).

| Event | Payload | Sänds när |
|-------|---------|-----------|
| `lobby_updated` | — | spelare går med, tilldelas lag, eller nytt spel skapas |
| `game_started` | `{ head_start_until }` | domaren startar spelet |
| `state_updated` | — | gps-läge, poäng eller roller har ändrats |
| `position_update` | `{ team_id, lat, lng }` | ett lag rapporterar position |
| `card_drawn` | `{ team_id, card }` | löparlaget drar ett kort |
| `new_feed_entry` | hela feed-raden | claim, tagning eller uppladdning |
| `roles_changed` | `{ runner_team_id, head_start_until, lunch_break_until }` | ett lag har tagits |
| `game_finished` | `{ teams }` | domaren avslutar spelet |

Avregistrera alltid med handler-referens (`socket.off('event', handler)`) —
`socket.off('event')` river även andra komponenters lyssnare på samma event.

## Spelregler i koden

Regelboken är sanningen; [`backend/game.js`](../backend/game.js) implementerar
den. Kortdatan — 30 destinationer med poäng 10–31 och 22 utmaningar med
multiplikator 1.3–2.0 — ligger i [`backend/cards.js`](../backend/cards.js).

- Poäng = `round(destination × multiplikator)`.
- Ett destinationskort i taget; extrauppdrag bara under en pågående resa.
- Tåg 10 min, buss 20, båt 30. Ersättningsbuss 25/26 räknas som tåg men
  behåller bussens 20 minuter; 21L räknas som tåg med tågets 10.
- Tagning byter roller och ger 15 min försprång. Destinationen som aldrig nåddes
  går tillbaka i leken.
- Första tagningen efter kl. 12 startar 45 min lunch, och försprånget blir då
  10 min.

## Miljövariabler

| Variabel | Var | Betydelse |
|----------|-----|-----------|
| `BACKEND_URL` | frontend (dev) | Vite-proxyns mål |
| `VITE_API_URL` | frontend (Capacitor) | absolut backend-adress, tom annars |
| `ADMIN_PASSWORD` | backend | domarlösenord — **måste sättas i drift** |
| `PUBLIC_URL` | backend | adressen OwnTracks-webhooken byggs av |
| `ALLOWED_ORIGINS` | backend | CORS-allowlist för Capacitor-appen |
| `DATA_DIR` / `UPLOAD_DIR` | backend | var SQLite-basen och uppladdningarna ligger |
