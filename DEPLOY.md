# Cloudflare deployment guide

## 1. Create the D1 database

```bash
npx wrangler login
npx wrangler d1 create recs-db
```

Copy the returned `database_id` into `wrangler.jsonc` under `d1_databases[0].database_id` (replace the local placeholder).

Apply migrations remotely (also run this after pulling schema changes such as movie fields or trips):

```bash
npm run db:migrate:remote
```

For local testing after new migrations:

```bash
npm run db:migrate:local
```

## 2. Deploy the site

Connect this GitHub repo to **Cloudflare Workers/Pages** (build command `npm run build`, output `dist`), or deploy from your machine:

```bash
npm run deploy
```

Attach your custom domain in the Cloudflare dashboard.

## 3. Production secrets & vars

In the Worker/Pages project → **Settings → Variables and Secrets**, set:

| Name | Type | Notes |
|------|------|--------|
| `LINKEDIN_URL` | var | Your LinkedIn profile URL |
| `CONTACT_TO_EMAIL` | **secret** | Your inbox — do not put this in the public repo |
| `CONTACT_FROM_EMAIL` | var | Verified sender in Resend |
| `SITE_NAME` | var | e.g. `Tomas Boschetto` |
| `TURNSTILE_SITE_KEY` | var | From Turnstile widget |
| `TURNSTILE_SECRET_KEY` | secret | From Turnstile |
| `RESEND_API_KEY` | secret | From Resend |
| `TMDB_API_KEY` | **secret** | From [TMDB API settings](https://www.themoviedb.org/settings/api) — movie poster lookup in admin |
| `UNSPLASH_ACCESS_KEY` | **secret** | From [Unsplash developers](https://unsplash.com/oauth/applications) — trip cover lookup |

Do **not** set `ADMIN_DEV_BYPASS=true` in production.

Also bind the D1 database as `DB` if the dashboard does not pick it up from `wrangler.jsonc`.

### R2 media bucket (stop photos)

1. In the Cloudflare dashboard, enable **R2** for your account (Billing → R2, or R2 overview).
2. Create the bucket once:

```bash
npx wrangler r2 bucket create webpage-tomi-media
```

The `MEDIA` binding in `wrangler.jsonc` points at that bucket. Stop photos are served at `/media/...`.

After pulling schema changes, apply migrations and deploy:

```bash
npm run db:migrate:remote
npm run deploy
```

(Merging to GitHub alone does not update the live Worker.)

## 4. Cloudflare Access (admin)

1. Zero Trust → Access → Applications → Add application → Self-hosted
2. Application domain: your domain
3. Path policies (covers movies/books admin, trips, and itinerary APIs):
   - `/admin*`
   - `/api/admin*`
4. Policy: Allow only your email (One-time PIN or preferred IdP)

After this, only you can open the admin UI or call admin APIs.

## 5. Turnstile

1. Cloudflare dashboard → Turnstile → Add widget for your domain
2. Put site key / secret into the vars above
3. Contact form will show and verify the widget

## 6. Resend

1. Create a Resend account and API key
2. Verify your domain (or use `onboarding@resend.dev` for testing)
3. Set `RESEND_API_KEY` and `CONTACT_FROM_EMAIL`

## 7. TMDB (movie posters)

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/)
2. Request an API key under **Settings → API**
3. Set `TMDB_API_KEY` as a secret (and in `.dev.vars` locally)
4. In `/admin`, open a movie and use **Fetch poster (TMDB)**

Book covers use Open Library (no API key). Attribution appears on `/recommendations` when those images are shown.

## 8. Unsplash (trip covers)

1. Create an app at [unsplash.com/oauth/applications](https://unsplash.com/oauth/applications)
2. Copy the **Access Key**
3. Set `UNSPLASH_ACCESS_KEY` as a secret (and in `.dev.vars` locally)
4. In `/admin/trips`, edit a trip and use **Fetch photo (Unsplash)**

## 9. Bot protection

In Cloudflare for your domain:

- Enable **Bot Fight Mode** (or Super Bot Fight Mode on paid plans)
- Optional: WAF rate limiting on `/api/contact`

## 10. SEO / Google Search Console

Technical SEO is built into the site (canonical URLs, Open Graph, `/sitemap.xml`, structured data on the home page). To appear in Google:

1. Confirm https://tomasboschetto.com/sitemap.xml loads
2. Open [Google Search Console](https://search.google.com/search-console)
3. Add the property for `https://tomasboschetto.com`
4. Verify ownership (DNS TXT via Cloudflare, or HTML meta if you prefer)
5. Submit the sitemap URL: `https://tomasboschetto.com/sitemap.xml`
6. Use **URL Inspection** on the homepage and request indexing

Ranking still depends on unique content, links, and time — the site must be crawlable first.

Public recommendation HTML remains readable by humans; Cloudflare reduces automated scraping and form spam.
