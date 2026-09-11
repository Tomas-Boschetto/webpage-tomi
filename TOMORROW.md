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

- [ ] **IMDb / Goodreads metadata lookup** — pull genre and other film/book fields from IMDb and Goodreads (or a stable API proxy if direct scraping is blocked)
- [ ] **Title dropdown** — when looking up a movie/book, show matching titles in a dropdown; choosing one auto-populates the form fields
- [ ] **Cover/image dropdown** — cover lookup should also offer a dropdown of candidate images to pick from (not only the first match)
- [ ] **Books: read month** — store/display **read month** instead of a full read date
- [ ] **Books: edition publication date** — add the publication date of the edition you read

## Admin UX

- [ ] **Larger images** in admin lists/forms (movies, books, trips)
- [ ] **Trip list layout** in admin should match the public travel list (same card structure / visual rhythm)
- [ ] **Manage stops button** — when a trip’s stops panel is open (adding/editing a stop), hide or disable **Manage stops** so it doesn’t stay on screen redundantly
- [ ] **Faster stop entry** — adding stops is too slow; add **map search** (geocode/place search on the Leaflet map) and **auto-populate** stop fields (place name, country, coords, etc.) from lookup sources so less is typed by hand
- [ ] **Add-stop menus collapse** — after clicking actions in the add-stop flow, related menus/panels that are no longer needed should close so the UI doesn’t stay cluttered

## Trip itinerary + map (public)

- [ ] **Split layout** — itinerary list beside the OpenStreetMap (same idea as Travel tab: list + map)
- [ ] **Hover highlight** — hovering a map pin highlights the matching stop in the list (and vice versa if natural)
- [ ] **Routes between stops** — draw paths between points when possible; style/label by **transport mode**
- [ ] **Replace “How I got there”** — if routes + mode cover it, remove that free-text field from stop forms and public itinerary

## Product / UX polish (from earlier)

- [ ] Trip cover: option to **use a stop photo as the trip cover** (no Unsplash required)
- [ ] Travel list cards: tighten spacing / cover sizing now that covers exist
- [ ] Public trip page: photo placement/size polish next to notes and map

## Optional later (not required tomorrow)

- Multi-photo gallery per stop
- Cloudflare Images transforms (resize/CDN) instead of browser-only resize
- Auto-deploy from GitHub so merge to `main` ships without a local `npm run deploy`
- [ ] **Multiple languages** — offer the site in different languages (i18n: UI copy, and decide how content in D1 is handled per locale)
- [ ] **SEO / Google** — technical bits shipped (canonical, OG, sitemap, JSON-LD); still need **Search Console** verify + sitemap submit + request indexing
- [ ] **Accessibility (vision-impaired)** — improve a11y: meaningful alt text, contrast, keyboard/focus, screen-reader labels, skip links, reduced-motion respect

## Reminders

- Secrets stay in `.dev.vars` / Cloudflare — never commit them
- R2 bucket: `webpage-tomi-media` (binding `MEDIA`)
- Docs: `README.md`, `DEPLOY.md`
- IMDb/Goodreads: prefer official or permitted APIs; note ToS/rate limits when implementing lookup
