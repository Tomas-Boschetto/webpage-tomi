import type { VisitedCountry } from './types';

/** Distinct countries from published trip stops (for the planisphere). */
export async function listCountriesFromPublishedStops(
	db: D1Database,
): Promise<VisitedCountry[]> {
	const { results } = await db
		.prepare(
			`SELECT
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
			 ORDER BY name ASC`,
		)
		.all<VisitedCountry>();
	return results ?? [];
}
