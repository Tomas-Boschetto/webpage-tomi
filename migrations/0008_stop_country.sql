-- Country lives on each itinerary stop; planisphere is derived from these.
ALTER TABLE itinerary_items ADD COLUMN country_code TEXT;
ALTER TABLE itinerary_items ADD COLUMN country_name TEXT;

UPDATE itinerary_items
SET country_code = 'PT', country_name = 'Portugal'
WHERE trip_id = 'seed-trip-1' AND (country_code IS NULL OR country_code = '');
