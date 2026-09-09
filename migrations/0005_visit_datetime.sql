ALTER TABLE itinerary_items ADD COLUMN visited_at TEXT;

-- Backfill seed stops with sample visit times
UPDATE itinerary_items SET visited_at = '2024-05-12T18:30' WHERE id = 'seed-stop-1';
UPDATE itinerary_items SET visited_at = '2024-05-12T20:15' WHERE id = 'seed-stop-2';
UPDATE itinerary_items SET visited_at = '2024-05-13T10:00' WHERE id = 'seed-stop-3';
