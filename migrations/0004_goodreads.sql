ALTER TABLE recommendations ADD COLUMN goodreads_url TEXT;

UPDATE recommendations
SET goodreads_url = NULL
WHERE id = 'seed-book-1';
