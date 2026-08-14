# Implementationsplan: åtgärda hela auditen 2026-08-14

> **Genomförd och arkiverad 2026-08-14.** Allt nedan är levererat och verifierat
> i körande Docker, dels via API, dels i webbläsare.
>
> Två avvikelser från planen, båda för att undvika att skriva samma kod två
> gånger: fas 4 (kortdata) landade tillsammans med fas 2 eftersom `database.js`
> ändå skrevs om då, och fas 6:s backend-del (C2, C3) följde med samma
> omskrivning. Fas 3 delades i två — uppladdningskedjan, och en härdning som
> kom ur den automatiska säkerhetsgranskningen.
>
> Fyra fynd tillkom under arbetet och finns i avsnitt E i auditrapporten. Ett av
> dem — att PIN-koden serverades utan autentisering — var allvarligare än något
> den ursprungliga auditen hittade.

Åtgärdar samtliga fynd i [`docs/audit_2026-08-14.md`](../audit_2026-08-14.md) —
8 blockerare, 7 säkerhetsfynd, 12 korrekthetsfynd, 4 dokumentationsfynd.

Arbetet går i sju faser. Varje fas verifieras i Docker och committas + pushas
separat.

---

## Arkitekturbeslut

### 1. Same-origin API i stället för hårdkodad host (A8)

Frontend slutar helt att adressera backend med absolut URL. Alla anrop blir
relativa (`/api/...`, `/uploads/...`, `/socket.io`). Vite dev-servern proxar
dem till backend; i produktion gör Nginx samma sak.

Detta löser tre saker på en gång: appen fungerar på telefoner över LAN och
bakom Nginx, CORS behövs inte längre alls, och `VITE_API_URL` slutar vara en
fälla.

Undantag: Capacitor-appen laddar från `file://` och har ingen origin att vara
"same" med. Därför behålls en override — `VITE_API_URL` används om den är satt,
annars tom sträng (= same origin). Native-bygget sätter den till
`https://tag.helgars.se`.

Backendens proxymål i dev styrs av `BACKEND_URL` (i Docker `http://backend:3002`).

### 2. Token-baserad identitet i stället för klientsidig teater (A1, B2, B3, C10)

**Spelare:** `POST /api/auth/join` genererar ett slumpat token
(`crypto.randomBytes(24)`), sparar det på `players.token` och returnerar det
tillsammans med `team_id`. Klienten lägger det i localStorage och skickar
`Authorization: Bearer <token>` på alla spelaråtgärder.

Serverns `requirePlayer` slår upp spelaren på token och lägger `req.player` med
aktuellt `team_id`. **`/api/game/position` slutar lita på `team_id` från
bodyn** och använder `req.player.team_id`. Det stänger positionsspoofningen
(B3), och löser samtidigt A1: klienten behöver aldrig gissa sitt lag, den
frågar `GET /api/auth/me`.

**Återanslutning (C10):** `GET /api/auth/me` med token återställer sessionen.
Join med ett namn som redan finns i spelet ger 409 — annars kan vem som helst
ta över en lagkamrats identitet genom att skriva samma namn.

**Admin:** lösenordet flyttar till `ADMIN_PASSWORD` (env, default `Bosse` i dev
med en varning i loggen). `POST /api/admin/login` byter lösenord mot ett
admin-token. `requireAdmin` läggs på samtliga `/api/admin/*` samt
`/api/game/start` och `/api/game/end`.

**OwnTracks (B4):** varje lag får en slumpad `teams.track_key`. Webhooken
identifierar laget via `?key=` i stället för via topic-slug-mappningen — det
autentiserar och tar samtidigt bort den bräckliga `lag-rod`-tabellen.
`Install.tsx` visar den färdiga URL:en med lagets nyckel.

**`gps_mode: 'off'` (B5):** kontrolleras nu på servern. Både
`/api/game/position` och `/api/owntracks` svarar 403 när läget är av.

### 3. Kortdata i en enda källa (C1)

`backend/cards.js` blir enda sanningen för alla 30 destinationer (namn, poäng
10–31, koordinater) och alla 22 utmaningar (namn, multiplikator 1.3–2.0) enligt
regelboken.

`database.js` seedar från den, **och reparerar befintliga rader**: en migrering
uppdaterar `value`/`lat`/`lng` per namn, så databaser som redan fått
platshållarseeden (allt på Stockholms Central, värde 10) rättas utan att behöva
återställas.

`seed.js`, `update_seed.js`, `fetch_coords.js` och `coords.json` tas bort — de
var en engångspipeline vars resultat nu ligger i `cards.js`, och `seed.js`
kunde ändå aldrig köra eftersom `database.js` hann före.

### 4. Spelloopet (A4, A5)

Nya rutter, alla bakom `requirePlayer`:

| Rutt | Vem | Gör |
|------|-----|-----|
| `POST /api/game/draw` | löparlaget | drar destinations- eller utmaningskort |
| `POST /api/game/claim` | löparlaget | bildbevis → poäng, nytt kort får dras |
| `POST /api/game/tag` | jagande lag | videobevis → rollväxling + försprång |
| `POST /api/game/transport` | löparlaget | registrerar tåg/buss/båt, ger deadline |

**Poäng:** `round(destination.value × challenge.multiplier)` enligt regelboken
("Poängen avrundas efter multiplicering till närmaste heltal"). Utan aktiv
utmaning är multiplikatorn 1.

**Tagning:** tagande lag blir löparlag, gammalt löparlag blir jagare,
`head_start_until = nu + 15 min`. Har löparlaget en oavslutad utmaning förlorar
de destinationspoängen för resan (regelboken: "får de inga poäng för den
resan"). Destinationskortet som aldrig nåddes går **tillbaka i leken**
(`drawn = 0`) — antagande, eftersom regeln "endast nå varje destination en
gång" handlar om nådda destinationer.

**Lunch (A5):** första tagningen efter kl. 12 utlöser
`lunch_break_until = nu + 45 min`, och försprånget blir då 10 min i stället för
15 enligt regelboken. Engångshändelse via `global_state.lunch_break_done`.

**Transport:** tåg 10 min, buss 20, båt 30. Servern räknar deadline och nekar
byte till samma färdmedel. Ersättningsbussarna (25/26 räknas som tåg men 20 min;
21L som tåg med 10 min) modelleras som egna transporttyper.

Schemat får kolumnerna `players.token`, `teams.track_key`,
`teams.current_challenge_id`, `global_state.lunch_break_done` och
`global_state.game_ends_at` via idempotent `ALTER TABLE`-migrering
(`PRAGMA table_info` → lägg till det som saknas).

### 5. Uppladdningskedjan (A6, A7, A2, A3, B7)

- `UPLOAD_DIR` blir konfigurerbar (`process.env.UPLOAD_DIR`, default
  `backend/data/uploads`) och skapas med `mkdirSync(..., { recursive: true })`.
  Den hårdkodade `/app/data/uploads/` försvinner, så backend kan köras utanför
  Docker.
- `app.use('/uploads', express.static(UPLOAD_DIR))` så bevisen faktiskt syns.
- `fileFilter` släpper bara igenom `image/*` och `video/*`.
- Filnamnssaneringen (`/[^a-zA-Z0-9.-]/g`) **behålls oförändrad**.
- `Feed.tsx` slutar anropa de icke-existerande rutterna, hämtar `GET /api/feed`
  vid mount och lyssnar på `new_feed_entry`.

---

## Filer

### Nya

| Fil | Roll |
|-----|------|
| `backend/cards.js` | enda källan för destinationer och utmaningar |
| `backend/auth.js` | token-generering, `requirePlayer`, `requireAdmin` |
| `backend/game.js` | spellogik: poäng, rollväxling, försprång, transport |
| `backend/.dockerignore`, `frontend/.dockerignore` | hindrar `COPY . .` från att dra in `node_modules` |
| `frontend/src/api.ts` | `API_URL`, `apiFetch` med token, delad `socket` |
| `frontend/src/usePlayer.ts` | hämtar/uppdaterar spelaren inkl. `team_id` |

### Ändrade

`backend/server.js` (huvuddelen), `backend/database.js` (migrering + seed),
`backend/package.json`, `backend/Dockerfile`, `frontend/vite.config.ts`
(proxy), `frontend/package.json`, `frontend/Dockerfile`, samtliga nio filer i
`frontend/src/`, `docker-compose.yml`, `.gitignore`, `.claude/settings.json`
(typecheck-hook), `frontend/README.md` (API- och WS-kontrakt).

### Borttagna

`backend/seed.js`, `backend/update_seed.js`, `backend/fetch_coords.js`,
`backend/coords.json` — se arkitekturbeslut 3.

---

## Faser

| Fas | Innehåll | Fynd |
|-----|----------|------|
| 0 | `@types/leaflet`, `.gitignore`, Docker- och paketstäd | C11, C12, C13 |
| 1 | Same-origin API, Vite-proxy, delad socket | A8, C5 |
| 2 | Token-auth, `team_id` till klienten, OwnTracks-nyckel | A1, B2–B6, C10 |
| 3 | Uppladdningskatalog, statisk servering, feed hel | A2, A3, A6, A7, B7 |
| 4 | `cards.js` + reparerande migrering | C1 |
| 5 | Spelloopet | A4, A5, C7, C8 |
| 6 | Korrekthetsfixar | C2, C3, C4, C9 |
| 7 | README med API/WS-kontrakt, typecheck-hook på | C6, D2, D3 |

Fas 0 först eftersom typecheck-hooken bara är meningsfull när de 6 befintliga
felen är borta — då fångar den allt som införs i fas 1–7.

## Verifiering

Varje fas: `docker-compose up -d --build` (fas 0, beroendeändringar) eller
`docker-compose restart`, sedan `npx tsc -b --noEmit` (ska ge 0 fel efter fas 0)
och funktionell kontroll mot den körande stacken. Rapporteras per fas.
