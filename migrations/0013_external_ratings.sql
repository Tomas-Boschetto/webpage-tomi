-- Community / marketplace ratings (TMDB, IMDb, Open Library, Google Books), separate from personal rating.
ALTER TABLE recommendations ADD COLUMN external_ratings TEXT;
