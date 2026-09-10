import type { VisitedCountry } from './types';

/** Distinct countries from trip stops (for the planisphere). */
export async function listCountriesFromStops(
	db: D1Database,
	options: { publishedOnly?: boolean } = {},
): Promise<VisitedCountry[]> {
	const publishedOnly = options.publishedOnly !== false;
	const { results } = await db
		.prepare(
			publishedOnly
				? `SELECT
						UPPER(i.country_code) AS country_code,
						MAX(i.country_name) AS name,
						NULL AS notes,
						MIN(i.created_at) AS created_at
					 FROM itinerary_items i
					 INNER JOIN trips t ON t.id = i.trip_id
					 WHERE t.published = 1
					   AND i.country_code IS NOT NULL
					   AND TRIM(i.country_code) != ''
					 GROUP BY UPPER(i.country_code)
					 ORDER BY name ASC`
				: `SELECT
						UPPER(i.country_code) AS country_code,
						MAX(i.country_name) AS name,
						NULL AS notes,
						MIN(i.created_at) AS created_at
					 FROM itinerary_items i
					 WHERE i.country_code IS NOT NULL
					   AND TRIM(i.country_code) != ''
					 GROUP BY UPPER(i.country_code)
					 ORDER BY name ASC`,
		)
		.all<VisitedCountry>();
	return results ?? [];
}

/** Distinct countries from published trip stops (for the public planisphere). */
export async function listCountriesFromPublishedStops(
	db: D1Database,
): Promise<VisitedCountry[]> {
	return listCountriesFromStops(db, { publishedOnly: true });
}

/** Trip IDs that include at least one published stop in the given country. */
export async function listPublishedTripIdsForCountry(
	db: D1Database,
	countryCode: string,
): Promise<Set<string>> {
	const code = countryCode.trim().toUpperCase();
	if (!/^[A-Z]{2}$/.test(code)) return new Set();

	const { results } = await db
		.prepare(
			`SELECT DISTINCT i.trip_id AS trip_id
			 FROM itinerary_items i
			 INNER JOIN trips t ON t.id = i.trip_id
			 WHERE t.published = 1
			   AND UPPER(i.country_code) = ?`,
		)
		.bind(code)
		.all<{ trip_id: string }>();

	return new Set((results ?? []).map((row) => row.trip_id));
}
