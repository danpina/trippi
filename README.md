# TripSwap — v1 prototype

Working scaffold of the product sketch: post spare bookings or loose weekend plans, search by
activity/date/price/radius, message the host, rate each other afterwards, with a rule-based
moderation gate on every new listing.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Prisma + Postgres (any host works — Neon and Supabase both have a workable free tier)
- Auth: custom email+password, signed JWT in an httpOnly cookie (no external auth provider yet)
- Server Actions for all writes (register, login, post listing, contact host, send message,
  submit rating, admin moderate) — no separate API layer needed at this scale
- Map: MapLibre GL (open-source vector renderer) + MapTiler vector tiles, needs a free
  `NEXT_PUBLIC_MAPTILER_KEY` (see below)
- Geocoding: OpenStreetMap's Nominatim, free, no key — fine for this stage's traffic, revisit
  before real volume (their usage policy caps automated/heavy use)

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
- Admin: `admin@tripswap.dev` / `admin1234` (or whatever `ADMIN_EMAIL` you set — the first user to
  register with that email is auto-promoted to admin)

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
- Photo "upload" is just pasting image URLs — no actual file upload/storage wired up
- Pinned to Next.js 14.2.35 — the latest patch release in the 14.x line, but a few CVEs remain
  that only a 15.x/16.x major upgrade fixes (mostly self-hosted/server-action edge cases). That
  upgrade touches `cookies()` and `searchParams` across most pages (they become async in 15+),
  so it's a deliberate follow-up, not bundled into going live.

## Deploying

Live at: [vercel.com/danpinas-projects/trippi](https://vercel.com/danpinas-projects/trippi),
database on Supabase.

1. Create a Postgres database (Neon or Supabase, free tier is enough to start) and copy its
   connection string.
2. Create a [Vercel](https://vercel.com) account (sign in with GitHub) and import this repo —
   it auto-detects Next.js, no build config needed.
3. In the Vercel project's environment variables, set:
   - `DATABASE_URL` — the Postgres connection string from step 1
   - `SESSION_SECRET` — a random 32+ byte value, e.g.
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `ADMIN_EMAIL` — whichever email should be auto-promoted to admin on first registration
   - `NEXT_PUBLIC_MAPTILER_KEY` — your MapTiler key
4. Push the schema to the production database once (from your machine, with `DATABASE_URL`
   pointed at production): `npx prisma db push`, then `npm run db:seed` if you want the
   category taxonomy (and demo listings) in place before the first deploy.
5. Deploy. Vercel gives you a live `*.vercel.app` URL; add a custom domain under the project's
   Domains settings whenever you're ready.

**Supabase connection gotcha:** Supabase's "Direct connection" host (`db.<ref>.supabase.co`)
only has an IPv6 address unless you pay for the IPv4 add-on — it'll fail outright (`ENOTFOUND`)
on any IPv4-only network. Use the pooler host instead
(`aws-0-<region>.pooler.supabase.com`), and mind the port: **6543 is transaction-mode**, which
doesn't support the connection type `prisma db push`/`migrate` needs and fails with
`P1017: Server has closed the connection`; **5432 on that same pooler host is session-mode**,
which works for both migrations and normal app queries. `DATABASE_URL` here uses the session
pooler on 5432 for exactly that reason.
