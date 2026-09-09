import type { Recommendation, RecommendationInput, RecommendationType } from './types';
import { isRecommendationType } from './types';
import { emptyToNull, isSafeHttpUrl, parseOptionalRating } from './validate';

export function getDb(env: { DB: D1Database }): D1Database {
	return env.DB;
}

export async function listPublished(
	db: D1Database,
	type?: RecommendationType,
): Promise<Recommendation[]> {
	if (type) {
		const { results } = await db
			.prepare(
				`SELECT * FROM recommendations
				 WHERE published = 1 AND type = ?
				 ORDER BY
				 	CASE WHEN experienced_at IS NULL OR experienced_at = '' THEN 1 ELSE 0 END,
				 	experienced_at DESC,
				 	created_at DESC`,
			)
			.bind(type)
			.all<Recommendation>();
		return results ?? [];
	}

	const { results } = await db
		.prepare(
			`SELECT * FROM recommendations
			 WHERE published = 1 AND type IN ('movie', 'book')
			 ORDER BY
			 	CASE WHEN experienced_at IS NULL OR experienced_at = '' THEN 1 ELSE 0 END,
			 	experienced_at DESC,
			 	created_at DESC`,
		)
		.all<Recommendation>();
	return results ?? [];
}

export async function listAll(db: D1Database): Promise<Recommendation[]> {
	const { results } = await db
		.prepare(
			`SELECT * FROM recommendations
			 WHERE type IN ('movie', 'book')
			 ORDER BY created_at DESC`,
		)
		.all<Recommendation>();
	return results ?? [];
}

export async function getById(db: D1Database, id: string): Promise<Recommendation | null> {
	return (
		(await db.prepare(`SELECT * FROM recommendations WHERE id = ?`).bind(id).first<Recommendation>()) ??
		null
	);
}

export async function createRecommendation(
	db: D1Database,
	input: RecommendationInput,
): Promise<Recommendation> {
	const id = crypto.randomUUID();
	const published = input.published === false ? 0 : 1;

	await db
		.prepare(
			`INSERT INTO recommendations
			 (id, type, title, summary, url, image_url, rating, genre, director, cast_members, imdb_url, goodreads_url, experienced_at, published)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			input.type,
			input.title.trim(),
			input.summary.trim(),
			emptyToNull(input.url),
			emptyToNull(input.image_url),
			input.rating ?? null,
			emptyToNull(input.genre),
			emptyToNull(input.director),
			emptyToNull(input.cast_members),
			emptyToNull(input.imdb_url),
			emptyToNull(input.goodreads_url),
			emptyToNull(input.experienced_at),
			published,
		)
		.run();

	const row = await getById(db, id);
	if (!row) throw new Error('Failed to create recommendation');
	return row;
}

export async function updateRecommendation(
	db: D1Database,
	id: string,
	input: RecommendationInput,
): Promise<Recommendation | null> {
	const existing = await getById(db, id);
	if (!existing) return null;

	const published = input.published === false ? 0 : 1;

	await db
		.prepare(
			`UPDATE recommendations
			 SET type = ?, title = ?, summary = ?, url = ?, image_url = ?,
			     rating = ?, genre = ?, director = ?, cast_members = ?, imdb_url = ?, goodreads_url = ?,
			     experienced_at = ?, published = ?, updated_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(
			input.type,
			input.title.trim(),
			input.summary.trim(),
			emptyToNull(input.url),
			emptyToNull(input.image_url),
			input.rating ?? null,
			emptyToNull(input.genre),
			emptyToNull(input.director),
			emptyToNull(input.cast_members),
			emptyToNull(input.imdb_url),
			emptyToNull(input.goodreads_url),
			emptyToNull(input.experienced_at),
			published,
			id,
		)
		.run();

	return getById(db, id);
}

export async function deleteRecommendation(db: D1Database, id: string): Promise<boolean> {
	const result = await db.prepare(`DELETE FROM recommendations WHERE id = ?`).bind(id).run();
	return (result.meta.changes ?? 0) > 0;
}

export function parseRecommendationInput(body: unknown): RecommendationInput | { error: string } {
	if (!body || typeof body !== 'object') {
		return { error: 'Invalid JSON body' };
	}

	const data = body as Record<string, unknown>;
	const {
		type,
		title,
		summary,
		url,
		image_url,
		rating,
		genre,
		director,
		cast_members,
		cast,
		imdb_url,
		goodreads_url,
		experienced_at,
		published,
	} = data;

	if (!isRecommendationType(type)) {
		return { error: 'type must be movie or book' };
	}
	if (typeof title !== 'string' || title.trim().length < 1 || title.length > 200) {
		return { error: 'title is required (max 200 chars)' };
	}
	if (typeof summary !== 'string' || summary.trim().length < 1 || summary.length > 2000) {
		return { error: 'summary is required (max 2000 chars)' };
	}

	const parsedRating = parseOptionalRating(rating);
	if ('error' in parsedRating) return parsedRating;

	const parsedDate = parseExperiencedAt(experienced_at);
	if ('error' in parsedDate) return parsedDate;

	for (const [label, value] of [
		['url', url],
		['image_url', image_url],
		['imdb_url', imdb_url],
		['goodreads_url', goodreads_url],
	] as const) {
		if (value != null && typeof value !== 'string') {
			return { error: `${label} must be a string` };
		}
		if (typeof value === 'string' && value.trim() && !isSafeHttpUrl(value)) {
			return { error: `${label} must be an http(s) URL` };
		}
	}

	for (const [label, value] of [
		['genre', genre],
		['director', director],
		['cast_members', cast_members ?? cast],
	] as const) {
		if (value != null && typeof value !== 'string') {
			return { error: `${label} must be a string` };
		}
		if (typeof value === 'string' && value.length > 500) {
			return { error: `${label} max 500 chars` };
		}
	}

	const castValue = cast_members ?? cast;

	return {
		type,
		title,
		summary,
		url: typeof url === 'string' ? url : null,
		image_url: typeof image_url === 'string' ? image_url : null,
		rating: parsedRating.value,
		genre: typeof genre === 'string' ? genre : null,
		director: typeof director === 'string' ? director : null,
		cast_members: typeof castValue === 'string' ? castValue : null,
		imdb_url: typeof imdb_url === 'string' ? imdb_url : null,
		goodreads_url: typeof goodreads_url === 'string' ? goodreads_url : null,
		experienced_at: parsedDate.value,
		published: published === false || published === 0 ? false : true,
	};
}

function parseExperiencedAt(value: unknown): { value: string } | { error: string } {
	if (value == null || value === '') {
		return { error: 'experienced_at (date watched/read) is required' };
	}
	if (typeof value !== 'string') {
		return { error: 'experienced_at must be a date string' };
	}
	const day = value.trim().slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
		return { error: 'experienced_at must be a valid date (YYYY-MM-DD)' };
	}
	const date = new Date(`${day}T12:00:00`);
	if (Number.isNaN(date.getTime())) {
		return { error: 'experienced_at must be a valid date' };
	}
	return { value: day };
}
