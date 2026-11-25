# Supabase

The Next.js app currently uses **client stubs only** — it does not open a live Supabase connection. Env placeholders live in `.env.example`. Apply these migrations when you are ready to connect the database.

**Schema authority:** Dream League PRD. Do not invent rules.

## Project

URL: `https://ghzcdwxoukxngnstanxv.supabase.co`

## Core model (foundation)

| Concept | Table(s) |
| --- | --- |
| Seasons | `seasons` |
| Profiles / roles | `profiles` (`visitor` \| `manager` \| `commissioner`) |
| Teams | `teams` (no single `manager_id`) |
| Managers | `team_managers` (multi-manager; one login per person) |
| Outfield players | `players` with position `DEF` \| `MID` \| `FWD` |
| Goalkeeper clubs | `goalkeeper_clubs` (distinct from players) |
| Outfield ownership | `squad_memberships` |
| GK ownership | `goalkeeper_memberships` |
| Goal updates | `goal_events` (`outfield_goal` → `player_id`; `gk_conceded` → `goalkeeper_club_id`) |
| Transfers | `transfers` (outfield pair **or** GK club pair) |
| Cup / honours | `cup_ties`, `honours` |

## Apply migrations

### Option A — Supabase SQL Editor

1. Open the [SQL Editor](https://supabase.com/dashboard/project/ghzcdwxoukxngnstanxv/sql) for the project.
2. Run each file in timestamp order:
   - `20261125190000_core_schema.sql`
   - `20261125190100_rls_policies.sql`

### Option B — Supabase CLI

```bash
npx supabase link --project-ref ghzcdwxoukxngnstanxv
npx supabase db push
```

You will need the database password from the Supabase dashboard (Project Settings → Database).

## After migrate

Promote a commissioner in SQL (replace the email):

```sql
update public.profiles
set role = 'commissioner'
where id = (
  select id from auth.users where email = 'commissioner@example.com'
);
```

Link managers after signup via `team_managers.profile_id`.

## Scoring (schema notes)

- `goal_events.event_type = 'outfield_goal'` → +1 GF for `team_id` (requires `player_id`)
- `goal_events.event_type = 'gk_conceded'` → +1 GA for `team_id` (requires `goalkeeper_club_id`)
- League points = GF − GA; order = points then GF; remain tied if still equal (PRD §8)
