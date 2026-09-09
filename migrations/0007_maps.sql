ALTER TABLE itinerary_items ADD COLUMN lat REAL;
ALTER TABLE itinerary_items ADD COLUMN lng REAL;

CREATE TABLE IF NOT EXISTS visited_countries (
	country_code TEXT PRIMARY KEY CHECK (length(country_code) = 2),
	name TEXT NOT NULL,
	notes TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO visited_countries (country_code, name, notes)
VALUES ('PT', 'Portugal', 'Lisbon and beyond');

-- Approximate coordinates for seed Lisbon stops
UPDATE itinerary_items SET lat = 38.7190, lng = -9.1317 WHERE id = 'seed-stop-1';
UPDATE itinerary_items SET lat = 38.7071, lng = -9.1455 WHERE id = 'seed-stop-2';
UPDATE itinerary_items SET lat = 38.6979, lng = -9.2067 WHERE id = 'seed-stop-3';
