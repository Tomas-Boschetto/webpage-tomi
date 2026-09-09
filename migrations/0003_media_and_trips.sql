-- Movie/book metadata on recommendations
ALTER TABLE recommendations ADD COLUMN rating REAL;
ALTER TABLE recommendations ADD COLUMN genre TEXT;
ALTER TABLE recommendations ADD COLUMN director TEXT;
ALTER TABLE recommendations ADD COLUMN cast_members TEXT;
ALTER TABLE recommendations ADD COLUMN imdb_url TEXT;

-- Trips replace flat travel recommendation rows
CREATE TABLE IF NOT EXISTS trips (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	summary TEXT NOT NULL,
	published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0, 1)),
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trips_published_created
	ON trips(published, created_at DESC);

CREATE TABLE IF NOT EXISTS itinerary_items (
	id TEXT PRIMARY KEY,
	trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
	place_name TEXT NOT NULL,
	place_type TEXT NOT NULL CHECK (
		place_type IN (
			'restaurant',
			'historic',
			'attraction',
			'recreational',
			'lodging',
			'other'
		)
	),
	how_i_got_there TEXT NOT NULL,
	notes TEXT,
	url TEXT,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_itinerary_trip_order
	ON itinerary_items(trip_id, sort_order);

-- Enrich seed movie/book rows when present
UPDATE recommendations
SET
	rating = 5,
	genre = 'Drama',
	director = 'Charlotte Wells',
	cast_members = 'Paul Mescal, Frankie Corio',
	imdb_url = 'https://www.imdb.com/title/tt19770238/'
WHERE id = 'seed-movie-1';

UPDATE recommendations
SET
	rating = 5,
	genre = 'Science Fiction',
	director = 'Ursula K. Le Guin',
	cast_members = NULL,
	imdb_url = NULL,
	url = 'https://en.wikipedia.org/wiki/The_Left_Hand_of_Darkness'
WHERE id = 'seed-book-1';

-- Move seed travel into a trip + sample stops
INSERT OR IGNORE INTO trips (id, title, summary, published, created_at, updated_at)
VALUES (
	'seed-trip-1',
	'Lisbon in late spring',
	'Trams, miradouros at golden hour, and the smell of pastéis after a steep walk.',
	1,
	datetime('now', '-1 days'),
	datetime('now', '-1 days')
);

INSERT OR IGNORE INTO itinerary_items (
	id, trip_id, place_name, place_type, how_i_got_there, notes, url, sort_order
)
VALUES
	(
		'seed-stop-1',
		'seed-trip-1',
		'Miradouro da Senhora do Monte',
		'attraction',
		'Walked up from Graça',
		'Sunset light over the whole city.',
		NULL,
		0
	),
	(
		'seed-stop-2',
		'seed-trip-1',
		'Time Out Market',
		'restaurant',
		'Metro to Cais do Sodré',
		'Crowded but easy for a first dinner.',
		NULL,
		1
	),
	(
		'seed-stop-3',
		'seed-trip-1',
		'Jerónimos Monastery',
		'historic',
		'Tram 15 from the center',
		'Go early before the lines build.',
		NULL,
		2
	);

DELETE FROM recommendations WHERE type = 'travel';
