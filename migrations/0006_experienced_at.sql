ALTER TABLE recommendations ADD COLUMN experienced_at TEXT;

UPDATE recommendations SET experienced_at = '2023-11-02' WHERE id = 'seed-movie-1';
UPDATE recommendations SET experienced_at = '2022-06-18' WHERE id = 'seed-book-1';
