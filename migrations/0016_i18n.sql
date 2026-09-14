-- Public content translations (EN remains in base tables as fallback)

CREATE TABLE IF NOT EXISTS recommendation_translations (
	recommendation_id TEXT NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
	locale TEXT NOT NULL CHECK (locale IN ('it', 'es', 'de', 'fr')),
	title TEXT,
	summary TEXT,
	commentary TEXT,
	updated_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (recommendation_id, locale)
);

CREATE TABLE IF NOT EXISTS trip_translations (
	trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
	locale TEXT NOT NULL CHECK (locale IN ('it', 'es', 'de', 'fr')),
	title TEXT,
	summary TEXT,
	updated_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (trip_id, locale)
);

CREATE TABLE IF NOT EXISTS itinerary_item_translations (
	item_id TEXT NOT NULL REFERENCES itinerary_items(id) ON DELETE CASCADE,
	locale TEXT NOT NULL CHECK (locale IN ('it', 'es', 'de', 'fr')),
	place_name TEXT,
	notes TEXT,
	how_i_got_there TEXT,
	country_name TEXT,
	updated_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (item_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_rec_translations_locale
	ON recommendation_translations(locale);

CREATE INDEX IF NOT EXISTS idx_trip_translations_locale
	ON trip_translations(locale);

CREATE INDEX IF NOT EXISTS idx_stop_translations_locale
	ON itinerary_item_translations(locale);
