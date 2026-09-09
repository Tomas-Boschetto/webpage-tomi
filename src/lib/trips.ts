import type {
	ItineraryItem,
	ItineraryItemInput,
	Trip,
	TripInput,
	TripWithItems,
} from './types';
import { isPlaceType } from './types';
import { emptyToNull, isSafeHttpUrl } from './validate';

export async function listPublishedTrips(db: D1Database): Promise<Trip[]> {
	const { results } = await db
		.prepare(
			`SELECT * FROM trips
			 WHERE published = 1
			 ORDER BY created_at DESC`,
		)
		.all<Trip>();
	return results ?? [];
}

export async function listAllTrips(db: D1Database): Promise<Trip[]> {
	const { results } = await db
		.prepare(`SELECT * FROM trips ORDER BY created_at DESC`)
		.all<Trip>();
	return results ?? [];
}

export async function getTripById(db: D1Database, id: string): Promise<Trip | null> {
	return (await db.prepare(`SELECT * FROM trips WHERE id = ?`).bind(id).first<Trip>()) ?? null;
}

export async function listItineraryForTrip(
	db: D1Database,
	tripId: string,
): Promise<ItineraryItem[]> {
	const { results } = await db
		.prepare(
			`SELECT * FROM itinerary_items
			 WHERE trip_id = ?
			 ORDER BY
			 	CASE WHEN visited_at IS NULL OR visited_at = '' THEN 1 ELSE 0 END,
			 	visited_at ASC,
			 	sort_order ASC,
			 	created_at ASC`,
		)
		.bind(tripId)
		.all<ItineraryItem>();
	return results ?? [];
}

export async function getTripWithItems(
	db: D1Database,
	id: string,
	opts: { publishedOnly?: boolean } = {},
): Promise<TripWithItems | null> {
	const trip = await getTripById(db, id);
	if (!trip) return null;
	if (opts.publishedOnly && !trip.published) return null;
	const items = await listItineraryForTrip(db, id);
	return { ...trip, items };
}

export async function createTrip(db: D1Database, input: TripInput): Promise<Trip> {
	const id = crypto.randomUUID();
	const published = input.published === false ? 0 : 1;

	await db
		.prepare(`INSERT INTO trips (id, title, summary, published) VALUES (?, ?, ?, ?)`)
		.bind(id, input.title.trim(), input.summary.trim(), published)
		.run();

	const row = await getTripById(db, id);
	if (!row) throw new Error('Failed to create trip');
	return row;
}

export async function updateTrip(
	db: D1Database,
	id: string,
	input: TripInput,
): Promise<Trip | null> {
	const existing = await getTripById(db, id);
	if (!existing) return null;

	const published = input.published === false ? 0 : 1;

	await db
		.prepare(
			`UPDATE trips
			 SET title = ?, summary = ?, published = ?, updated_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(input.title.trim(), input.summary.trim(), published, id)
		.run();

	return getTripById(db, id);
}

export async function deleteTrip(db: D1Database, id: string): Promise<boolean> {
	await db.prepare(`DELETE FROM itinerary_items WHERE trip_id = ?`).bind(id).run();
	const result = await db.prepare(`DELETE FROM trips WHERE id = ?`).bind(id).run();
	return (result.meta.changes ?? 0) > 0;
}

export async function getItineraryItem(
	db: D1Database,
	id: string,
): Promise<ItineraryItem | null> {
	return (
		(await db
			.prepare(`SELECT * FROM itinerary_items WHERE id = ?`)
			.bind(id)
			.first<ItineraryItem>()) ?? null
	);
}

export async function createItineraryItem(
	db: D1Database,
	tripId: string,
	input: ItineraryItemInput,
): Promise<ItineraryItem> {
	const trip = await getTripById(db, tripId);
	if (!trip) throw new Error('Trip not found');

	const id = crypto.randomUUID();
	let sortOrder = input.sort_order;
	if (sortOrder == null) {
		const row = await db
			.prepare(`SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM itinerary_items WHERE trip_id = ?`)
			.bind(tripId)
			.first<{ max_order: number }>();
		sortOrder = (row?.max_order ?? -1) + 1;
	}

	await db
		.prepare(
			`INSERT INTO itinerary_items
			 (id, trip_id, place_name, place_type, how_i_got_there, visited_at, notes, url, lat, lng, country_code, country_name, sort_order)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			tripId,
			input.place_name.trim(),
			input.place_type,
			input.how_i_got_there.trim(),
			input.visited_at,
			emptyToNull(input.notes),
			emptyToNull(input.url),
			input.lat ?? null,
			input.lng ?? null,
			input.country_code,
			input.country_name.trim(),
			sortOrder,
		)
		.run();

	await db
		.prepare(`UPDATE trips SET updated_at = datetime('now') WHERE id = ?`)
		.bind(tripId)
		.run();

	const item = await getItineraryItem(db, id);
	if (!item) throw new Error('Failed to create itinerary item');
	return item;
}

export async function updateItineraryItem(
	db: D1Database,
	id: string,
	input: ItineraryItemInput,
): Promise<ItineraryItem | null> {
	const existing = await getItineraryItem(db, id);
	if (!existing) return null;

	const sortOrder = input.sort_order ?? existing.sort_order;

	await db
		.prepare(
			`UPDATE itinerary_items
			 SET place_name = ?, place_type = ?, how_i_got_there = ?, visited_at = ?, notes = ?, url = ?,
			     lat = ?, lng = ?, country_code = ?, country_name = ?, sort_order = ?, updated_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(
			input.place_name.trim(),
			input.place_type,
			input.how_i_got_there.trim(),
			input.visited_at,
			emptyToNull(input.notes),
			emptyToNull(input.url),
			input.lat ?? null,
			input.lng ?? null,
			input.country_code,
			input.country_name.trim(),
			sortOrder,
			id,
		)
		.run();

	await db
		.prepare(`UPDATE trips SET updated_at = datetime('now') WHERE id = ?`)
		.bind(existing.trip_id)
		.run();

	return getItineraryItem(db, id);
}

export async function deleteItineraryItem(db: D1Database, id: string): Promise<boolean> {
	const existing = await getItineraryItem(db, id);
	if (!existing) return false;

	const result = await db.prepare(`DELETE FROM itinerary_items WHERE id = ?`).bind(id).run();
	await db
		.prepare(`UPDATE trips SET updated_at = datetime('now') WHERE id = ?`)
		.bind(existing.trip_id)
		.run();
	return (result.meta.changes ?? 0) > 0;
}

export function parseTripInput(body: unknown): TripInput | { error: string } {
	if (!body || typeof body !== 'object') {
		return { error: 'Invalid JSON body' };
	}
	const data = body as Record<string, unknown>;
	const { title, summary, published } = data;

	if (typeof title !== 'string' || title.trim().length < 1 || title.length > 200) {
		return { error: 'title is required (max 200 chars)' };
	}
	if (typeof summary !== 'string' || summary.trim().length < 1 || summary.length > 4000) {
		return { error: 'summary is required (max 4000 chars)' };
	}

	return {
		title,
		summary,
		published: published === false || published === 0 ? false : true,
	};
}

export function parseItineraryItemInput(body: unknown): ItineraryItemInput | { error: string } {
	if (!body || typeof body !== 'object') {
		return { error: 'Invalid JSON body' };
	}
	const data = body as Record<string, unknown>;
	const {
		place_name,
		place_type,
		how_i_got_there,
		visited_at,
		notes,
		url,
		lat,
		lng,
		country_code,
		country_name,
		sort_order,
	} = data;

	if (typeof place_name !== 'string' || place_name.trim().length < 1 || place_name.length > 200) {
		return { error: 'place_name is required (max 200 chars)' };
	}
	if (!isPlaceType(place_type)) {
		return { error: 'place_type is invalid' };
	}
	if (
		typeof how_i_got_there !== 'string' ||
		how_i_got_there.trim().length < 1 ||
		how_i_got_there.length > 500
	) {
		return { error: 'how_i_got_there is required (max 500 chars)' };
	}

	const visit = parseVisitedAt(visited_at);
	if ('error' in visit) return visit;

	const coords = parseOptionalCoords(lat, lng);
	if ('error' in coords) return coords;

	if (typeof country_code !== 'string' || !/^[A-Za-z]{2}$/.test(country_code.trim())) {
		return { error: 'country_code must be a 2-letter ISO code (e.g. PT)' };
	}
	if (typeof country_name !== 'string' || country_name.trim().length < 1 || country_name.length > 120) {
		return { error: 'country_name is required (max 120 chars)' };
	}

	if (notes != null && typeof notes !== 'string') {
		return { error: 'notes must be a string' };
	}
	if (typeof notes === 'string' && notes.length > 2000) {
		return { error: 'notes max 2000 chars' };
	}
	if (url != null && typeof url !== 'string') {
		return { error: 'url must be a string' };
	}
	if (typeof url === 'string' && url.trim() && !isSafeHttpUrl(url)) {
		return { error: 'url must be an http(s) URL' };
	}

	let order: number | undefined;
	if (sort_order != null) {
		const n = typeof sort_order === 'number' ? sort_order : Number(sort_order);
		if (!Number.isInteger(n) || n < 0) {
			return { error: 'sort_order must be a non-negative integer' };
		}
		order = n;
	}

	return {
		place_name,
		place_type,
		how_i_got_there,
		visited_at: visit.value,
		notes: typeof notes === 'string' ? notes : null,
		url: typeof url === 'string' ? url : null,
		lat: coords.lat,
		lng: coords.lng,
		country_code: country_code.trim().toUpperCase(),
		country_name: country_name.trim(),
		sort_order: order,
	};
}

function parseOptionalCoords(
	lat: unknown,
	lng: unknown,
): { lat: number | null; lng: number | null } | { error: string } {
	const latEmpty = lat == null || lat === '';
	const lngEmpty = lng == null || lng === '';
	if (latEmpty && lngEmpty) {
		return { lat: null, lng: null };
	}
	if (latEmpty || lngEmpty) {
		return { error: 'Provide both lat and lng for map pins, or leave both empty' };
	}
	const latN = typeof lat === 'number' ? lat : Number(lat);
	const lngN = typeof lng === 'number' ? lng : Number(lng);
	if (!Number.isFinite(latN) || latN < -90 || latN > 90) {
		return { error: 'lat must be between -90 and 90' };
	}
	if (!Number.isFinite(lngN) || lngN < -180 || lngN > 180) {
		return { error: 'lng must be between -180 and 180' };
	}
	return { lat: latN, lng: lngN };
}

/** Accepts datetime-local values like 2024-05-12T18:30 or full ISO strings. */
function parseVisitedAt(value: unknown): { value: string } | { error: string } {
	if (typeof value !== 'string' || !value.trim()) {
		return { error: 'visited_at (date and time) is required' };
	}
	const trimmed = value.trim();
	const normalized = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
	const date = new Date(normalized);
	if (Number.isNaN(date.getTime())) {
		return { error: 'visited_at must be a valid date and time' };
	}
	// Store as YYYY-MM-DDTHH:mm for datetime-local round-trips
	const pad = (n: number) => String(n).padStart(2, '0');
	const localLike =
		trimmed.length >= 16
			? trimmed.slice(0, 16)
			: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	return { value: localLike };
}

export function formatVisitedAt(value: string | null | undefined): string {
	if (!value) return '';
	const date = new Date(value.length === 16 ? `${value}:00` : value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleString(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
}
