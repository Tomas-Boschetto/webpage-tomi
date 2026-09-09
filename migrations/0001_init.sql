CREATE TABLE IF NOT EXISTS recommendations (
	id TEXT PRIMARY KEY,
	type TEXT NOT NULL CHECK (type IN ('movie', 'book', 'travel')),
	title TEXT NOT NULL,
	summary TEXT NOT NULL,
	url TEXT,
	image_url TEXT,
	published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0, 1)),
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recommendations_type ON recommendations(type);
CREATE INDEX IF NOT EXISTS idx_recommendations_published_created
	ON recommendations(published, created_at DESC);

CREATE TABLE IF NOT EXISTS contact_rate (
	ip TEXT PRIMARY KEY,
	count INTEGER NOT NULL DEFAULT 0,
	window_start INTEGER NOT NULL
);
