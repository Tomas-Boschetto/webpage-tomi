# Tomas Boschetto — personal recommendations site

Astro site on Cloudflare Pages/Workers with a D1-backed admin UI for movie, book, and travel recommendations, plus a Turnstile-protected contact form.

## Stack

- **Astro** + **@astrojs/cloudflare**
- **Cloudflare D1** for recommendations and trips
- **Cloudflare R2** for stop photos (`MEDIA` binding)
- **Cloudflare Access** (dashboard) for `/admin` and `/api/admin/*`
- **Cloudflare Turnstile** + **Resend** for contact
- Bot protection via Cloudflare dashboard (Bot Fight Mode)

## Local setup

```bash
cp .dev.vars.example .dev.vars
npm install
npm run db:migrate:local
npm run dev
```

Open:

- [http://localhost:4321](http://localhost:4321) — home
- [http://localhost:4321/recommendations](http://localhost:4321/recommendations)
- [http://localhost:4321/contact](http://localhost:4321/contact)
- [http://localhost:4321/admin](http://localhost:4321/admin) — works locally with `ADMIN_DEV_BYPASS=true`

## Content workflow

1. Open `/admin` for movies & books, or `/admin/trips` for travel (Cloudflare Access in production)
2. For movies/books: start typing a title — matches appear live; pick one to autofill, then choose a cover/poster (set `TMDB_API_KEY` for movies; books use Open Library)
3. For a trip: create it, optionally **Fetch photo (Unsplash)** for the list cover (`UNSPLASH_ACCESS_KEY`), then **Manage stops** — each stop needs a country (feeds the planisphere), visit date, optional map pin, and (after saving) an optional photo upload to R2
4. Published items appear on `/recommendations` (and `/trips/[id]` with maps) immediately — no redeploy for content. Code changes still need `npm run deploy`

## Deploy & Cloudflare dashboard

See [DEPLOY.md](./DEPLOY.md).

## Customize

In `wrangler.jsonc` → `vars`:

- `SITE_NAME`
- `LINKEDIN_URL`
- `SITE_URL` — canonical origin for sitemap / Open Graph (default `https://tomasboschetto.com`)

Secrets (`.dev.vars` locally, Cloudflare dashboard in production — never commit these):

- `CONTACT_TO_EMAIL` — your inbox for the contact form
- `ADMIN_DEV_BYPASS` — local only; never set `true` in production
- `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY` / `CONTACT_FROM_EMAIL`
- `TMDB_API_KEY` — movie metadata + poster lookup in admin (books use Open Library, no key)
- `OMDB_API_KEY` — optional; IMDb community ratings on movie lookup ([OMDb](https://www.omdbapi.com/apikey.aspx))
- `UNSPLASH_ACCESS_KEY` — trip cover lookup in `/admin/trips`
