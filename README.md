# TripSwap — v1 prototype

Working scaffold of the product sketch: post spare bookings or loose weekend plans, search by
activity/date/price/radius, message the host, rate each other afterwards, with a rule-based
moderation gate on every new listing.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Prisma + SQLite for local dev (zero setup — swap the `datasource` provider to `postgresql`
  and set `DATABASE_URL` when moving toward the Postgres/PostGIS setup from the product plan)
- Auth: custom email+password, signed JWT in an httpOnly cookie (no external auth provider yet)
- Server Actions for all writes (register, login, post listing, contact host, send message,
  submit rating, admin moderate) — no separate API layer needed at this scale
- Map: MapLibre GL (open-source vector renderer) + MapTiler vector tiles, needs a free
  `NEXT_PUBLIC_MAPTILER_KEY` (see below)
- Geocoding: OpenStreetMap's Nominatim, free, no key — fine for this stage's traffic, revisit
  before real volume (their usage policy caps automated/heavy use)

## Run it

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

- SQLite instead of Postgres/PostGIS — fine for this stage, revisit before real traffic
- Photo "upload" is just pasting image URLs — no actual file upload/storage wired up
- `npm audit` flags Next.js 14.2.x CVEs that mostly affect self-hosted production deployments
  (image optimizer, server actions edge cases) — worth an upgrade pass before any real deploy
