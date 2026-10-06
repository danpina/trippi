# TripSwap — v1 prototype

Working scaffold of the product sketch: post spare bookings or loose weekend plans, search by
activity/date/price/radius, message the host, rate each other afterwards, with a rule-based
moderation gate on every new listing.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind
- Prisma + Postgres (any host works — Neon and Supabase both have a workable free tier)
- Auth: custom email+password, signed JWT in an httpOnly cookie (no external auth provider yet)
- Server Actions for all writes (register, login, post listing, contact host, send message,
  submit rating, admin moderate) — no separate API layer needed at this scale
- Map: MapLibre GL (open-source vector renderer) + MapTiler vector tiles, needs a free
  `NEXT_PUBLIC_MAPTILER_KEY` (see below)
- Geocoding: MapTiler (same key as the map tiles) — place autocomplete in the browser, plus a
  server-side lookup for listings whose location was typed without picking a suggestion
- Photos: Supabase Storage bucket `listing-photos`, resized in the browser before upload

## Run it

Needs a Postgres database — create a free one at [neon.tech](https://neon.tech) or
[supabase.com](https://supabase.com) and copy its connection string into `.env` as
`DATABASE_URL`. There's no SQLite fallback; the schema targets Postgres directly.

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000.

The search map needs a free MapTiler key: sign up at [maptiler.com](https://www.maptiler.com),
grab the default key from your account page, and set it in `.env`:

```
NEXT_PUBLIC_MAPTILER_KEY="your_key_here"
```

Without it, the map panel shows a placeholder instead of failing.

Demo accounts (from the seed):
- Host: `chamonix.chalet@example.com` / `demo1234`
- Test/buyer: `test@tripswap.dev` / `test1234` — plain account, not an owner or admin, for
  testing the search/contact/rate side without needing a fresh signup each time
- Admin: not created by signup. Register normally, then promote that account once with
  `update "User" set "isAdmin" = true where email = 'you@example.com'` (or Prisma Studio).
  The seed creates an admin for `ADMIN_EMAIL` with the password `admin1234` — change it
  immediately in Settings.

## What's implemented

- Landing page: search bar, category chips, featured listings
- Search: multi-select activity filter (topics + subtopics via checkbox tree), free text,
  date range, max price, geocoded location search (type a city/address, pick a suggestion,
  filter by radius) — all combinable. Real map (MapLibre GL + MapTiler) with clustered,
  category-colored markers (a bubble shows the count until you zoom or click into it),
  click-to-drop-a-point, and a list/map toggle on mobile.
- Listing detail + create form, with the 10-category / subcategory taxonomy from the plan
- Contact → chat thread (1:1 per listing per initiator), gated behind login
- Ratings: 1–5 + comment, unlocked once both sides have sent at least one message,
  denormalized `avgRating`/`ratingCount` shown next to a user's name everywhere
- Moderation: `src/lib/moderation.ts` runs rule checks (banned terms, phone/URL detection,
  price/date sanity, min description length) on every new listing; anything flagged goes to
  `/admin` for a human decision instead of being auto-rejected
- Admin: flagged queue, pending queue, open reports list

## Deliberately not built yet

Matches the "out of scope for v1" list in the product plan: in-app payments, native app,
identity verification, group chats, AI-assisted moderation.

## Known dev-only shortcuts

- Postgres without PostGIS — radius search is haversine math in the app layer, fine at this
  scale, revisit if the listing count gets large enough for it to matter
- `npm audit` still lists Tailwind 3 build-time tooling (braces/micromatch/postcss); they only
  run during builds on trusted input, and fixing them means a Tailwind 4 migration
- Moderation is rule-based only; reports and the admin queue are manual
- Storage objects can't be deleted with the public key, so removed/deleted photos stay in the
  bucket (purge them from the Supabase dashboard if needed)

## Deploying

Live at: [vercel.com/danpinas-projects/trippi](https://vercel.com/danpinas-projects/trippi),
database on Supabase.

1. Create a Postgres database (Neon or Supabase, free tier is enough to start) and copy its
   connection string.
2. Create a [Vercel](https://vercel.com) account (sign in with GitHub) and import this repo —
   it auto-detects Next.js, no build config needed.
3. In the Vercel project's environment variables, set:
   - `DATABASE_URL` — pooled connection string, see the Supabase note below for the exact form
   - `DIRECT_URL` — unpooled connection string, same note
   - `SESSION_SECRET` — a random 32+ byte value, e.g.
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `ADMIN_EMAIL` — used by the seed script only
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_KEY` — Supabase project URL and
     *publishable* key (photo uploads)
   - `NEXT_PUBLIC_SITE_URL` — the public site URL (emails, sitemap, social previews)
   - `NEXT_PUBLIC_CONTACT_EMAIL` — a real, monitored contact address (footer, legal pages)
   - `RESEND_API_KEY`, `EMAIL_FROM` — optional; enables password-reset and new-message emails
     (without them the link/message is only logged and nothing is sent)
   - `NEXT_PUBLIC_MAPTILER_KEY` — your MapTiler key
4. Push the schema to the production database once (from your machine, with `DATABASE_URL`/
   `DIRECT_URL` pointed at production): `npx prisma db push`, then `npm run db:seed` if you
   want the category taxonomy (and demo listings) in place before the first deploy.
5. Deploy. Vercel gives you a live `*.vercel.app` URL; add a custom domain under the project's
   Domains settings whenever you're ready.

**Supabase connection setup — this app uses two different connection strings, and getting it
wrong causes two different failure modes:**

- Supabase's "Direct connection" host (`db.<ref>.supabase.co`) only has an IPv6 address unless
  you pay for the IPv4 add-on — fails outright (`ENOTFOUND`) on any IPv4-only network. Always
  use the pooler host instead: `aws-0-<region>.pooler.supabase.com`.
- On that pooler host, **port 6543 is transaction mode** — this is what `DATABASE_URL` (the
  app's runtime queries) must use, with `?pgbouncer=true` appended. Transaction mode
  multiplexes many short-lived connections over a small shared pool, which is what a
  serverless app actually needs — Vercel spins up many short-lived function instances, and
  each one wants its own DB connection.
- **Port 5432 on the same host is session mode** — this is what `DIRECT_URL` must use, no
  `pgbouncer` param. `prisma db push`/`migrate` need session mode; it doesn't multiplex.
- Using session mode (5432) for `DATABASE_URL` — i.e. the app's runtime queries — is the trap:
  it works fine at first, then fails under any real concurrency with
  `FATAL: max clients reached in session mode, max clients are limited to pool_size: 15`,
  because each serverless invocation holds its own connection instead of sharing a pool. This
  broke *every* page on the live site, not just one — it just surfaces wherever you happen to
  click first.
- Using transaction mode (6543) for `DIRECT_URL` — i.e. migrations — fails differently:
  `P1017: Server has closed the connection`, because transaction mode doesn't support the kind
  of connection `prisma db push` needs.

`prisma/schema.prisma`'s `datasource` block declares both `url` (→ `DATABASE_URL`) and
`directUrl` (→ `DIRECT_URL`) for exactly this split — Prisma uses `directUrl` automatically for
migration commands and `url` for everything else.

## Development

```bash
npm test          # unit tests (vitest)
npm run lint
npm run typecheck
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests and a production build on every push.
