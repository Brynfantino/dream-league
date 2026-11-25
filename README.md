# Dream League

Fantasy football web app replacing the long-running Dream League spreadsheet.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (prepared, not connected yet)

**Rules source of truth:** Dream League PRD (`Dream-League_PRD.md` in the project docs store). Do not invent game rules; ask if unclear.

## Current status (foundation shell)

- Responsive app shell with **left navigation** and **top navigation**
- Placeholder pages named per PRD §13: Dashboard, League Table, Team Page, Player Directory, Transfer Centre, Cup Centre, Account Settings, Commissioner Console
- Supabase **client stubs** + `.env.example` (no live connection required to run the app)
- SQL migrations under `supabase/migrations/` aligned to the PRD data model (apply when connecting)

No league business logic yet.

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
  lib/supabase/       # Client stubs (not connected)
  types/              # Shared TypeScript types
supabase/migrations/  # PRD-aligned schema + RLS
```

## Scoring (from PRD — not implemented in UI yet)

| Event | Effect |
| --- | --- |
| Outfield player goal (DEF/MID/FWD) | +1 GF for the owning team |
| Goalkeeper club goals conceded | +1 GA for the owning team (−1 point) |
| League points | GF − GA |
| League order | Points, then Goals For; if still equal, teams remain tied |
