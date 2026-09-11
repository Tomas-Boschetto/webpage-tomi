-- Structured transport mode for map paths / legends (how_i_got_there stays as optional detail text)
ALTER TABLE itinerary_items ADD COLUMN transport_mode TEXT NOT NULL DEFAULT 'other'
	CHECK (
		transport_mode IN (
			'walk',
			'transit',
			'taxi',
			'car',
			'bike',
			'flight',
			'boat',
			'other'
		)
	);
