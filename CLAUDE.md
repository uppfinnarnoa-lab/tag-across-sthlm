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

### 3. Frontend has 6 pre-existing TypeScript errors — don't add more, but don't assume you introduced these

`frontend/src/pages/Admin.tsx` and `frontend/src/pages/Map.tsx` currently
fail `tsc -b --noEmit` (missing `@types/leaflet`, `MapContainer`/`Marker`
prop typing issues with react-leaflet). A `.claude/hooks/post-edit-typecheck.cjs`
exists (adapted from the template to run from `frontend/`, since that's
where the TS project actually lives) but is **not yet wired into
`settings.json`** — turning it on today would fire on every edit anywhere in
`frontend/`, drowning real new errors in the 6 pre-existing ones. Fix the
pre-existing errors first, then add the `PostToolUse` block (see the
comment at the top of that hook file) to get real per-edit enforcement.

### 4. Verify in Docker before calling anything done

- Start/restart the stack: `docker-compose up -d --build` (first run or after
  dependency changes) or `docker-compose restart` (code-only changes, since
  volumes hot-reload).
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
  `filename` callback strips to `[a-zA-Z0-9.-]`) — never weaken this when
  touching the upload path; it's the main defense against path traversal on
  an endpoint with no real auth in front of it.
- The `/api/auth/join` "auth" is a 4-digit game PIN, not real user
  authentication — don't treat it as a security boundary or store anything
  sensitive behind it.

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
from here). After a change is verified in Docker and pushed:

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
