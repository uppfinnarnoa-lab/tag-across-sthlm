# CLAUDE.md — Tåg across Stockholm

## Project Overview

A live GPS scavenger-hunt/tag party game played across Stockholm's public
transit ("Tåg across Stockholm", rules in `Tåg across Stockholm 1.1.md`).
Teams race between destination stations for points while a runner team tries
to avoid being "tagged" (filmed for 10s) by chaser teams; live positions and
photo proof are coordinated in-app (and historically also via WhatsApp).

- **Stack:** Frontend — React 19 + Vite + TypeScript + Capacitor (iOS/Android
  native wrapper) + Leaflet/react-leaflet (maps) + Socket.io-client
  (realtime). Backend — Node.js + Express + Socket.io + SQLite3 + Multer
  (photo uploads).
- **Production URL / deploy target:** self-hosted behind Nginx. **Claude has
  no SSH access** — write the exact deploy command and give it to the user to
  run themselves (same pattern as TrainingLab).
- **Repo:** local git repo (`master` branch), not yet confirmed pushed to a
  remote — check before assuming a `git push` step is meaningful.
- **Dev environment:** Docker (`docker-compose.yml` — `frontend` on 3001,
  `backend` on 3002, hot-reload volumes).

## Directory Roles

| Path | Role | Editable? |
|------|------|-----------|
| `frontend/` | React/Vite/Capacitor client | ✅ Yes |
| `backend/` | Express/Socket.io/SQLite server | ✅ Yes |
| `docs/plans/` | Active implementation plans (this project's own convention — see Core Rule 1) | ✅ Yes |
| `docs/archive/` | Completed/archived plans | ✅ Yes |
| `.aidocs/agent_procedure.md` | This project's original agent procedure — superseded by this file, kept for history | ⚠️ Don't delete, but this CLAUDE.md is now authoritative |

## Core Rules

### 1. Write an implementation plan before non-trivial changes, in this project's existing location

- Before code changes, create a `.md` plan in `docs/plans/` (this project's
  own established convention, predates this CLAUDE.md — kept as-is rather
  than switching to a different projects' single-running-log style). Include
  which files change/are added/removed, and any architecture decisions.
- Once verified working, move the plan file to `docs/archive/`.
- Trivial one-line fixes don't need a plan file.

### 2. Stay scoped to this project's own folder unless explicitly told otherwise

Do not read, search, or reference files outside this project's directory
tree (other projects under `Kodprojekt/`, Downloads, Desktop root, etc.)
without the user's explicit, per-instance permission. Standing user
preference across all projects in this `Kodprojekt/` folder.

### 3. Frontend typechecks clean — keep it that way

`npx tsc -b --noEmit` from `frontend/` gives **0 errors**. The 6 errors this
rule used to describe were all one root cause (missing `@types/leaflet`, which
made `react-leaflet` v5 degrade `MapContainerProps`/`MarkerProps`); installing
that package fixed all six.

`.claude/hooks/post-edit-typecheck.cjs` is now wired into `settings.json` as a
`PostToolUse` hook and runs on every `.ts`/`.tsx` edit under `frontend/`. A new
type error blocks the edit — fix it rather than working around the hook.

### 4. Verify in Docker before calling anything done

- Start/restart the stack: `docker-compose up -d --build` (first run or after
  dependency changes) or `docker-compose restart` (code-only changes).
- **`node --watch` does not pick up changes across the Windows bind mount.**
  The frontend hot-reloads (`CHOKIDAR_USEPOLLING`), the backend does not — run
  `docker-compose restart backend` after every edit under `backend/`, or you
  will be testing the previous version and drawing wrong conclusions from it.
- Confirm the feature actually works in the running Docker environment and
  that the app builds without errors before reporting done — don't just trust
  that the code "looks right."

## Documentation — After Every Change

Update documentation immediately after each task, before declaring it done:

- Plan file in `docs/plans/` (see Core Rule 1) — keep it truthful as work
  progresses, move to `docs/archive/` once shipped and verified.
- Update `frontend/README.md` or any relevant doc if behavior, endpoints, or
  the WebSocket event contract between frontend/backend changed.

## Hard Rules

- No comments unless the WHY is non-obvious to a future reader.
- No error handling for scenarios that cannot happen; validate only at real system boundaries.
- Uploaded photo filenames are sanitized (`backend/server.js`, Multer
  `filename` callback strips to `[a-zA-Z0-9.-]`) and the extension is set from
  the MIME type, not the client filename. The accepted types are an explicit
  allowlist — **never widen it to `image/*`**, that lets `image/svg+xml`
  through and an SVG served from our own origin is stored XSS.
- **The actor always comes from the token, never from the request body.**
  `req.player.team_id` decides which team a position or a claim belongs to.
  Accepting `team_id` from the body is how position spoofing got in the first
  time.
- The 4-digit game PIN is a join code, not authentication — but it *is* the
  key into the game, so it must never appear in an unauthenticated response.
  Public callers get `/api/game/status`; everything else needs a token.

## Git Workflow

- Commit and push after every meaningful change. Do not batch unrelated
  changes into one commit.
- Stage files explicitly by name — never blind `git add -A`/`git add .`
  (the project's original `.aidocs/agent_procedure.md` said plain `git add .`;
  upgraded here to match the explicit-staging convention used across every
  other project in this `Kodprojekt/` folder, to avoid accidentally
  committing build output, `.env`, or uploaded user photos in `backend/data/`).
- Write commit messages that explain *why*, not just *what*.

## Deployment

Deploy target is an Nginx webserver, reached only by the user (no SSH access
from here).

Nginx must proxy `/api`, `/uploads` and `/socket.io` (with WebSocket upgrade)
to the backend — the client only ever uses relative URLs, so nothing works
without it. Required backend env vars in production: `ADMIN_PASSWORD` (the dev
default is `Bosse` and the server warns when it's unset), `PUBLIC_URL`, and
`ALLOWED_ORIGINS` if the Capacitor app is used. See `frontend/README.md`.

After a change is verified in Docker and pushed:

1. Generate the exact deploy command(s) for the change (rebuild/restart
   sequence appropriate to what changed — dependency changes need a full
   rebuild, code-only changes may just need a restart).
2. Give the command to the user in chat to run themselves — don't assume you
   can run it.

## Summary

| Scenario | Action |
|----------|--------|
| Session start | Automatic via hook (`git pull --ff-only` if tree is clean) |
| Non-trivial change | Write plan in `docs/plans/` first (Core Rule 1) |
| Plan fully shipped | Move plan to `docs/archive/` |
| Any code change | Verify in Docker, update docs, commit (explicit staging) + push |
| Deploying | Generate the Nginx deploy command, hand it to the user — don't run it yourself |
