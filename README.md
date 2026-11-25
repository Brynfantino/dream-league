# Dream League

Fantasy football web app replacing the long-running Dream League spreadsheet.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase

**Rules source of truth:** Dream League PRD (`Dream-League_PRD.md` in the project docs store). Do not invent game rules; ask if unclear.

## Current status

- Responsive app shell with **left navigation** and **top navigation**
- Placeholder pages named per PRD §13 (except League Table and Team Page — live read-only)
- **League Table** derives Position / Team / Goals For / Goals Against / League Points from `goal_events` for the active season
- **Team Page** shows Team Name, Manager(s), League Position, Current Squad, Player Goals, Goalkeeper Concessions, League Points (active season)
- Supabase browser + server clients wired for reads (`.env.example`); app still runs without env (shows a configure message)
- SQL migrations under `supabase/migrations/` aligned to the PRD data model

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (redirects to Dashboard). Env vars are optional for the shell.

### Optional env (future Supabase connection)

```bash
cp .env.example .env.local
```

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (example uses `https://ghzcdwxoukxngnstanxv.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key from Supabase → API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — server only; never expose to the browser |

### Database migrations

See [supabase/README.md](supabase/README.md). Apply SQL files in `supabase/migrations/` in order when ready.

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
```

## Folder structure

```
src/
  app/(app)/          # PRD §13 routes + AppShell layout
  app/login/          # Sign-in placeholder
  components/layout/  # TopNav, SideNav, AppShell
  config/             # Navigation (PRD labels)
  lib/supabase/       # Browser + server clients (reads)
  lib/league/         # Standings derived from goal_events
  types/              # Shared TypeScript types
supabase/migrations/  # PRD-aligned schema + RLS
```

## Scoring (from PRD — League Table UI)

| Event | Effect |
| --- | --- |
| Outfield player goal (DEF/MID/FWD) | +1 GF for the owning team |
| Goalkeeper club goals conceded | +1 GA for the owning team (−1 point) |
| League points | GF − GA |
| League order | Points, then Goals For; if still equal, teams remain tied |
