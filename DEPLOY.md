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
| `SITE_NAME` | var | e.g. `Tomi` |
| `TURNSTILE_SITE_KEY` | var | From Turnstile widget |
| `TURNSTILE_SECRET_KEY` | secret | From Turnstile |
| `RESEND_API_KEY` | secret | From Resend |

Do **not** set `ADMIN_DEV_BYPASS=true` in production.

Also bind the D1 database as `DB` if the dashboard does not pick it up from `wrangler.jsonc`.

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

## 7. Bot protection

In Cloudflare for your domain:

- Enable **Bot Fight Mode** (or Super Bot Fight Mode on paid plans)
- Optional: WAF rate limiting on `/api/contact`

Public recommendation HTML remains readable by humans; Cloudflare reduces automated scraping and form spam.
