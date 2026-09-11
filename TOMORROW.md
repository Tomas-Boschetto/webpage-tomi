# Tomorrow — WebPage Tomi

Date: 2026-09-11  
Context: Continue from trip images, travel split layout, and deploy/R2 setup (2026-09-10).

## Carry over (finish / verify)

- [ ] **Unsplash** — when the app is approved, set `UNSPLASH_ACCESS_KEY` in `.dev.vars` and production (`npx wrangler secret put UNSPLASH_ACCESS_KEY`), then test **Fetch photo (Unsplash)** on `/admin/trips`
- [ ] **Trip covers** — add/adjust covers on live trips (paste URL until Unsplash works; Fetch after key is live)
- [ ] **Stop photos** — upload at least one photo on a published stop; confirm it shows on `/trips/[id]` and loads from `/media/...`
- [ ] **Travel tab** — sanity-check list + map split and country hover filter on desktop and phone
- [ ] **Deploy habit** — after any code change: commit → `npm run deploy` (merge alone does not update the Worker)

## Movies & books — richer lookup

- [x] **Metadata lookup (TMDB / Open Library)** — genre, director/author, cast, IMDb URL, covers (no IMDb/Goodreads scraping)
- [x] **Title dropdown** — type in Title → live autocomplete suggestions → pick one to autofill
- [x] **Cover/image dropdown** — pick among candidate posters/covers after a match
- [x] **Books: read month** — store/display **read month** instead of a full read date
- [x] **Books: edition publication date** — `edition_published_at` from Open Library editions (editable in admin)

## Admin UX

- [x] **Larger images** in admin lists/forms (movies, books, trips)
- [x] **Trip list layout** in admin should match the public travel list (same card structure / visual rhythm)
- [x] **Movie/book admin preview** — admin list/cards for movies and books should look the same as the public recommendations cards (same layout, cover treatment, meta rhythm)
- [x] **White flash after adding a film** — after saving/adding a movie, the page background suddenly turns white; leaving and coming back changes it again. Find and fix the flash / style reset (likely admin after create, or recommendations refresh)
- [x] **Manage stops button** — when a trip’s stops panel is open (adding/editing a stop), hide or disable **Manage stops** so it doesn’t stay on screen redundantly
- [x] **Faster stop entry** — adding stops is too slow; add **map search** (geocode/place search on the Leaflet map) and **auto-populate** stop fields (place name, country, coords, etc.) from lookup sources so less is typed by hand
- [x] **Add-stop menus collapse** — after clicking actions in the add-stop flow, related menus/panels that are no longer needed should close so the UI doesn’t stay cluttered

## Trip itinerary + map (public)

- [ ] **Split layout** — itinerary list beside the OpenStreetMap (same idea as Travel tab: list + map)
- [ ] **Hover highlight** — hovering a map pin highlights the matching stop in the list (and vice versa if natural)
- [ ] **Routes between stops** — draw paths between points when possible; style/label by **transport mode**
- [ ] **Replace “How I got there”** — if routes + mode cover it, remove that free-text field from stop forms and public itinerary

## Product / UX polish (from earlier)

- [x] Trip cover: option to **use a stop photo as the trip cover** (no Unsplash required)
- [x] Travel list cards: tighten spacing / cover sizing now that covers exist
- [x] Public trip page: photo placement/size polish next to notes and map

## Optional later (not required tomorrow)

- Multi-photo gallery per stop
- Cloudflare Images transforms (resize/CDN) instead of browser-only resize
- Auto-deploy from GitHub so merge to `main` ships without a local `npm run deploy`
- [ ] **Multiple languages** — offer the site in different languages (i18n: UI copy, and decide how content in D1 is handled per locale)
- [x] **SEO / Google** — technical bits shipped (canonical, OG, sitemap, JSON-LD); Search Console sitemap OK — wait for indexing
- [ ] **Accessibility (vision-impaired)** — pass 1 in progress: skip link, focus styles, contrast, alts, reduced-motion, external-link announcements; more polish later (maps, admin)

## Reminders

- Secrets stay in `.dev.vars` / Cloudflare — never commit them
- R2 bucket: `webpage-tomi-media` (binding `MEDIA`)
- Docs: `README.md`, `DEPLOY.md`
- IMDb/Goodreads: prefer official or permitted APIs; note ToS/rate limits when implementing lookup
- Movie/book lookup uses TMDB + Open Library via `/api/admin/lookup` (search + select)
