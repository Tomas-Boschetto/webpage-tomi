# Tomas Boschetto — personal recommendations site

Astro site on Cloudflare Pages/Workers with a D1-backed admin UI for movie, book, and travel recommendations, plus a Turnstile-protected contact form.

## Stack

- **Astro** + **@astrojs/cloudflare**
- **Cloudflare D1** for recommendations
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
2. For a trip: create it, then **Manage stops** — each stop needs a country (feeds the planisphere), visit time, and optional map coordinates
3. Published items appear on `/recommendations` (and `/trips/[id]` with maps) immediately — no redeploy

## Deploy & Cloudflare dashboard

See [DEPLOY.md](./DEPLOY.md).

## Customize

In `wrangler.jsonc` → `vars`:

- `SITE_NAME`
- `LINKEDIN_URL`

Secrets (`.dev.vars` locally, Cloudflare dashboard in production — never commit these):

- `CONTACT_TO_EMAIL` — your inbox for the contact form
- `ADMIN_DEV_BYPASS` — local only; never set `true` in production
- `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY` / `CONTACT_FROM_EMAIL`

