import type { Recommendation, ItineraryItem, Trip, TripWithItems } from './types';
import { CONTENT_LOCALES, DEFAULT_LOCALE, isLocale, type Locale } from '../i18n/locales';

export type RecommendationTranslation = {
	recommendation_id: string;
	locale: string;
	title: string | null;
	summary: string | null;
	commentary: string | null;
};

export type TripTranslation = {
	trip_id: string;
	locale: string;
	title: string | null;
	summary: string | null;
};

export type StopTranslation = {
	item_id: string;
	locale: string;
	place_name: string | null;
	notes: string | null;
	how_i_got_there: string | null;
	country_name: string | null;
};

function pick(translated: string | null | undefined, fallback: string): string {
	const t = translated?.trim();
	return t ? t : fallback;
}

function pickNullable(
	translated: string | null | undefined,
	fallback: string | null,
): string | null {
	if (translated == null) return fallback;
	const t = translated.trim();
	return t ? t : fallback;
}

export function resolveContentLocale(value: string | undefined | null): Locale {
	return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getRecommendationTranslation(
	db: D1Database,
	id: string,
	locale: Locale,
): Promise<RecommendationTranslation | null> {
	if (locale === DEFAULT_LOCALE) return null;
	return (
		(await db
			.prepare(
				`SELECT recommendation_id, locale, title, summary, commentary
				 FROM recommendation_translations
				 WHERE recommendation_id = ? AND locale = ?`,
			)
			.bind(id, locale)
			.first<RecommendationTranslation>()) ?? null
	);
}

export async function listRecommendationTranslationsForIds(
	db: D1Database,
	ids: string[],
	locale: Locale,
): Promise<Map<string, RecommendationTranslation>> {
	const map = new Map<string, RecommendationTranslation>();
	if (locale === DEFAULT_LOCALE || ids.length === 0) return map;
	// D1 has no great IN-binding helper; batch in chunks
	const chunk = 40;
	for (let i = 0; i < ids.length; i += chunk) {
		const slice = ids.slice(i, i + chunk);
		const placeholders = slice.map(() => '?').join(',');
		const { results } = await db
			.prepare(
				`SELECT recommendation_id, locale, title, summary, commentary
				 FROM recommendation_translations
				 WHERE locale = ? AND recommendation_id IN (${placeholders})`,
			)
			.bind(locale, ...slice)
			.all<RecommendationTranslation>();
		for (const row of results ?? []) map.set(row.recommendation_id, row);
	}
	return map;
}

export function applyRecommendationTranslation(
	item: Recommendation,
	tr: RecommendationTranslation | null | undefined,
): Recommendation {
	if (!tr) return item;
	return {
		...item,
		title: pick(tr.title, item.title),
		summary: pick(tr.summary, item.summary),
		commentary: pickNullable(tr.commentary, item.commentary),
	};
}

export async function localizeRecommendations(
	db: D1Database,
	items: Recommendation[],
	locale: Locale,
): Promise<Recommendation[]> {
	if (locale === DEFAULT_LOCALE || items.length === 0) return items;
	const map = await listRecommendationTranslationsForIds(
		db,
		items.map((i) => i.id),
		locale,
	);
	return items.map((item) => applyRecommendationTranslation(item, map.get(item.id)));
}

export async function getTripTranslation(
	db: D1Database,
	id: string,
	locale: Locale,
): Promise<TripTranslation | null> {
	if (locale === DEFAULT_LOCALE) return null;
	return (
		(await db
			.prepare(
				`SELECT trip_id, locale, title, summary FROM trip_translations
				 WHERE trip_id = ? AND locale = ?`,
			)
			.bind(id, locale)
			.first<TripTranslation>()) ?? null
	);
}

export function applyTripTranslation(trip: Trip, tr: TripTranslation | null | undefined): Trip {
	if (!tr) return trip;
	return {
		...trip,
		title: pick(tr.title, trip.title),
		summary: pick(tr.summary, trip.summary),
	};
}

export async function localizeTrips(
	db: D1Database,
	trips: Trip[],
	locale: Locale,
): Promise<Trip[]> {
	if (locale === DEFAULT_LOCALE || trips.length === 0) return trips;
	const ids = trips.map((t) => t.id);
	const map = new Map<string, TripTranslation>();
	const chunk = 40;
	for (let i = 0; i < ids.length; i += chunk) {
		const slice = ids.slice(i, i + chunk);
		const placeholders = slice.map(() => '?').join(',');
		const { results } = await db
			.prepare(
				`SELECT trip_id, locale, title, summary FROM trip_translations
				 WHERE locale = ? AND trip_id IN (${placeholders})`,
			)
			.bind(locale, ...slice)
			.all<TripTranslation>();
		for (const row of results ?? []) map.set(row.trip_id, row);
	}
	return trips.map((trip) => applyTripTranslation(trip, map.get(trip.id)));
}

export async function getStopTranslations(
	db: D1Database,
	itemIds: string[],
	locale: Locale,
): Promise<Map<string, StopTranslation>> {
	const map = new Map<string, StopTranslation>();
	if (locale === DEFAULT_LOCALE || itemIds.length === 0) return map;
	const chunk = 40;
	for (let i = 0; i < itemIds.length; i += chunk) {
		const slice = itemIds.slice(i, i + chunk);
		const placeholders = slice.map(() => '?').join(',');
		const { results } = await db
			.prepare(
				`SELECT item_id, locale, place_name, notes, how_i_got_there, country_name
				 FROM itinerary_item_translations
				 WHERE locale = ? AND item_id IN (${placeholders})`,
			)
			.bind(locale, ...slice)
			.all<StopTranslation>();
		for (const row of results ?? []) map.set(row.item_id, row);
	}
	return map;
}

export function applyStopTranslation(
	item: ItineraryItem,
	tr: StopTranslation | null | undefined,
): ItineraryItem {
	if (!tr) return item;
	return {
		...item,
		place_name: pick(tr.place_name, item.place_name),
		notes: pickNullable(tr.notes, item.notes),
		how_i_got_there: pick(tr.how_i_got_there, item.how_i_got_there),
		country_name: pick(tr.country_name, item.country_name),
	};
}

export async function localizeTripWithItems(
	db: D1Database,
	trip: TripWithItems,
	locale: Locale,
): Promise<TripWithItems> {
	if (locale === DEFAULT_LOCALE) return trip;
	const tr = await getTripTranslation(db, trip.id, locale);
	const stopMap = await getStopTranslations(
		db,
		trip.items.map((i) => i.id),
		locale,
	);
	return {
		...applyTripTranslation(trip, tr),
		items: trip.items.map((item) => applyStopTranslation(item, stopMap.get(item.id))),
	};
}

export async function upsertRecommendationTranslation(
	db: D1Database,
	recommendationId: string,
	locale: Exclude<Locale, 'en'>,
	fields: { title?: string | null; summary?: string | null; commentary?: string | null },
): Promise<void> {
	if (!CONTENT_LOCALES.includes(locale)) return;
	await db
		.prepare(
			`INSERT INTO recommendation_translations
			 (recommendation_id, locale, title, summary, commentary, updated_at)
			 VALUES (?, ?, ?, ?, ?, datetime('now'))
			 ON CONFLICT(recommendation_id, locale) DO UPDATE SET
			 	title = excluded.title,
			 	summary = excluded.summary,
			 	commentary = excluded.commentary,
			 	updated_at = datetime('now')`,
		)
		.bind(
			recommendationId,
			locale,
			fields.title?.trim() || null,
			fields.summary?.trim() || null,
			fields.commentary?.trim() || null,
		)
		.run();
}

export async function upsertTripTranslation(
	db: D1Database,
	tripId: string,
	locale: Exclude<Locale, 'en'>,
	fields: { title?: string | null; summary?: string | null },
): Promise<void> {
	if (!CONTENT_LOCALES.includes(locale)) return;
	await db
		.prepare(
			`INSERT INTO trip_translations (trip_id, locale, title, summary, updated_at)
			 VALUES (?, ?, ?, ?, datetime('now'))
			 ON CONFLICT(trip_id, locale) DO UPDATE SET
			 	title = excluded.title,
			 	summary = excluded.summary,
			 	updated_at = datetime('now')`,
		)
		.bind(tripId, locale, fields.title?.trim() || null, fields.summary?.trim() || null)
		.run();
}

export async function upsertStopTranslation(
	db: D1Database,
	itemId: string,
	locale: Exclude<Locale, 'en'>,
	fields: {
		place_name?: string | null;
		notes?: string | null;
		how_i_got_there?: string | null;
		country_name?: string | null;
	},
): Promise<void> {
	if (!CONTENT_LOCALES.includes(locale)) return;
	await db
		.prepare(
			`INSERT INTO itinerary_item_translations
			 (item_id, locale, place_name, notes, how_i_got_there, country_name, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
			 ON CONFLICT(item_id, locale) DO UPDATE SET
			 	place_name = excluded.place_name,
			 	notes = excluded.notes,
			 	how_i_got_there = excluded.how_i_got_there,
			 	country_name = excluded.country_name,
			 	updated_at = datetime('now')`,
		)
		.bind(
			itemId,
			locale,
			fields.place_name?.trim() || null,
			fields.notes?.trim() || null,
			fields.how_i_got_there?.trim() || null,
			fields.country_name?.trim() || null,
		)
		.run();
}

export async function listTranslationsForRecommendation(
	db: D1Database,
	id: string,
): Promise<RecommendationTranslation[]> {
	const { results } = await db
		.prepare(
			`SELECT recommendation_id, locale, title, summary, commentary
			 FROM recommendation_translations WHERE recommendation_id = ?`,
		)
		.bind(id)
		.all<RecommendationTranslation>();
	return results ?? [];
}

export async function listTranslationsForTrip(
	db: D1Database,
	id: string,
): Promise<TripTranslation[]> {
	const { results } = await db
		.prepare(`SELECT trip_id, locale, title, summary FROM trip_translations WHERE trip_id = ?`)
		.bind(id)
		.all<TripTranslation>();
	return results ?? [];
}

export async function listTranslationsForStop(
	db: D1Database,
	id: string,
): Promise<StopTranslation[]> {
	const { results } = await db
		.prepare(
			`SELECT item_id, locale, place_name, notes, how_i_got_there, country_name
			 FROM itinerary_item_translations WHERE item_id = ?`,
		)
		.bind(id)
		.all<StopTranslation>();
	return results ?? [];
}
