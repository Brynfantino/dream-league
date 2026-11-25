# Supabase

The Next.js app currently uses **client stubs only** — it does not open a live Supabase connection. Env placeholders live in `.env.example`. Apply these migrations when you are ready to connect the database.

## Project

URL: `https://ghzcdwxoukxngnstanxv.supabase.co`

## Apply migrations

Migrations live in `supabase/migrations/`. Apply them against the project database.

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

Managers:

```sql
update public.profiles
set role = 'manager'
where id = (
  select id from auth.users where email = 'manager@example.com'
);
```

## Scoring (schema notes)

- `goal_events.event_type = 'outfield_goal'` → +1 GF for `team_id`
- `goal_events.event_type = 'gk_conceded'` → +1 GA for `team_id`
- League points = GF − GA; tie-break = GF
