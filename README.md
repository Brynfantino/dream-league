# Dream League

Fantasy football web app replacing the long-running Dream League spreadsheet.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase

## Scoring

| Event | Effect |
| --- | --- |
| Outfield player goal | +1 GF for the owning team |
| Goalkeeper club goals conceded | +1 GA for the owning team |
| League points | GF − GA |
| Tie-breaker | GF |

## Setup

### 1. Environment

```bash
cp .env.example .env.local
```

Fill in keys from the Supabase dashboard (**Project Settings → API**). Do not commit real keys.

| Variable | Where it lives | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Already set in `.env.example` to `https://ghzcdwxoukxngnstanxv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role — never expose to the client |

For Vercel / Cursor secrets, set the same three names. Locally use `.env.local`.

### 2. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (redirects to Dashboard).

### 3. Apply database migrations

See [supabase/README.md](supabase/README.md). Short version: run the SQL files in `supabase/migrations/` in order via the Supabase SQL Editor, or `npx supabase db push` after linking project `ghzcdwxoukxngnstanxv`.

Then promote the commissioner account:

```sql
update public.profiles
set role = 'commissioner'
where id = (select id from auth.users where email = 'your@email.com');
```

### 4. Auth

Email/password and magic-link sign-in are wired on `/login`. Profiles are created automatically on signup (`visitor` by default). Commissioners see extra nav once `profiles.role = 'commissioner'`.

In Supabase Auth settings, add your site URL and redirect URLs (e.g. `http://localhost:3000/auth/callback` and the production `/auth/callback`).

## Scripts

```bash
npm run dev       # development server
npm run build     # production build
npm run typecheck # tsc --noEmit
npm run lint
```

## App structure (Phase 1)

- Primary nav: Dashboard, League Table, Teams, Players, Transfers, Cup, Account
- Commissioner nav (role-gated): Goal Updates, Transfers Approval, Seasons, Auction Import, Administration
- Schema + RLS under `supabase/migrations/`
- Supabase clients: `src/lib/supabase/`
