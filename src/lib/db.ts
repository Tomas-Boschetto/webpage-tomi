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
			 (id, type, title, summary, commentary, url, image_url, rating, genre, director, cast_members, imdb_url, goodreads_url, experienced_at, edition_published_at, original_published_at, accolades, external_ratings, published)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			input.type,
			input.title.trim(),
			input.summary.trim(),
			emptyToNull(input.commentary),
			emptyToNull(input.url),
			emptyToNull(input.image_url),
			input.rating ?? null,
			emptyToNull(input.genre),
			emptyToNull(input.director),
			emptyToNull(input.cast_members),
			emptyToNull(input.imdb_url),
			emptyToNull(input.goodreads_url),
			emptyToNull(input.experienced_at),
			emptyToNull(input.edition_published_at),
			emptyToNull(input.original_published_at),
			emptyToNull(input.accolades),
			emptyToNull(input.external_ratings),
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
			 SET type = ?, title = ?, summary = ?, commentary = ?, url = ?, image_url = ?,
			     rating = ?, genre = ?, director = ?, cast_members = ?, imdb_url = ?, goodreads_url = ?,
			     experienced_at = ?, edition_published_at = ?, original_published_at = ?,
			     accolades = ?, external_ratings = ?,
			     published = ?, updated_at = datetime('now')
			 WHERE id = ?`,
		)
		.bind(
			input.type,
			input.title.trim(),
			input.summary.trim(),
			emptyToNull(input.commentary),
			emptyToNull(input.url),
			emptyToNull(input.image_url),
			input.rating ?? null,
			emptyToNull(input.genre),
			emptyToNull(input.director),
			emptyToNull(input.cast_members),
			emptyToNull(input.imdb_url),
			emptyToNull(input.goodreads_url),
			emptyToNull(input.experienced_at),
			emptyToNull(input.edition_published_at),
			emptyToNull(input.original_published_at),
			emptyToNull(input.accolades),
			emptyToNull(input.external_ratings),
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
		commentary,
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
		edition_published_at,
		original_published_at,
		accolades,
		external_ratings,
		published,
	} = data;

	if (!isRecommendationType(type)) {
		return { error: 'type must be movie or book' };
	}
	if (typeof title !== 'string' || title.trim().length < 1 || title.length > 200) {
		return { error: 'title is required (max 200 chars)' };
	}
	if (typeof summary !== 'string' || summary.trim().length < 1 || summary.length > 2000) {
		return { error: 'summary (synopsis) is required (max 2000 chars)' };
	}
	if (commentary != null && typeof commentary !== 'string') {
		return { error: 'commentary must be a string' };
	}
	if (typeof commentary === 'string' && commentary.length > 4000) {
		return { error: 'commentary max 4000 chars' };
	}

	const parsedRating = parseOptionalRating(rating);
	if ('error' in parsedRating) return parsedRating;

	const parsedDate = parseExperiencedAt(experienced_at, type === 'book');
	if ('error' in parsedDate) return parsedDate;

	const parsedEdition = parseOptionalEditionDate(edition_published_at);
	if ('error' in parsedEdition) return parsedEdition;

	const parsedOriginal = parseOptionalEditionDate(original_published_at, 'original_published_at');
	if ('error' in parsedOriginal) return parsedOriginal;

	if (accolades != null && typeof accolades !== 'string') {
		return { error: 'accolades must be a string' };
	}
	if (typeof accolades === 'string' && accolades.length > 2500) {
		return { error: 'accolades max 2500 chars' };
	}
	if (external_ratings != null && typeof external_ratings !== 'string') {
		return { error: 'external_ratings must be a string' };
	}
	if (typeof external_ratings === 'string' && external_ratings.length > 2500) {
		return { error: 'external_ratings max 2500 chars' };
	}

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
		commentary: typeof commentary === 'string' ? commentary : null,
		url: typeof url === 'string' ? url : null,
		image_url: typeof image_url === 'string' ? image_url : null,
		rating: parsedRating.value,
		genre: typeof genre === 'string' ? genre : null,
		director: typeof director === 'string' ? director : null,
		cast_members: typeof castValue === 'string' ? castValue : null,
		imdb_url: typeof imdb_url === 'string' ? imdb_url : null,
		goodreads_url: typeof goodreads_url === 'string' ? goodreads_url : null,
		experienced_at: parsedDate.value,
		edition_published_at: parsedEdition.value,
		original_published_at: parsedOriginal.value,
		accolades: typeof accolades === 'string' ? accolades : null,
		external_ratings: typeof external_ratings === 'string' ? external_ratings : null,
		published: published === false || published === 0 ? false : true,
	};
}

function parseExperiencedAt(
	value: unknown,
	monthOnly: boolean,
): { value: string } | { error: string } {
	if (value == null || value === '') {
		return { error: 'experienced_at (date watched/read) is required' };
	}
	if (typeof value !== 'string') {
		return { error: 'experienced_at must be a date string' };
	}
	const raw = value.trim();
	if (monthOnly) {
		const month = /^\d{4}-\d{2}$/.test(raw) ? raw : /^\d{4}-\d{2}-\d{2}$/.test(raw.slice(0, 10))
			? raw.slice(0, 7)
			: '';
		if (!month) {
			return { error: 'experienced_at must be a month (YYYY-MM) for books' };
		}
		const day = `${month}-01`;
		const date = new Date(`${day}T12:00:00`);
		if (Number.isNaN(date.getTime())) {
			return { error: 'experienced_at must be a valid month' };
		}
		return { value: day };
	}
	const day = raw.slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
		return { error: 'experienced_at must be a valid date (YYYY-MM-DD)' };
	}
	const date = new Date(`${day}T12:00:00`);
	if (Number.isNaN(date.getTime())) {
		return { error: 'experienced_at must be a valid date' };
	}
	return { value: day };
}

function parseOptionalEditionDate(
	value: unknown,
	field = 'edition_published_at',
): { value: string | null } | { error: string } {
	if (value == null || value === '') return { value: null };
	if (typeof value !== 'string') {
		return { error: `${field} must be a date string` };
	}
	const raw = value.trim();
	let day: string;
	if (/^\d{4}$/.test(raw)) day = `${raw}-01-01`;
	else if (/^\d{4}-\d{2}$/.test(raw)) day = `${raw}-01`;
	else if (/^\d{4}-\d{2}-\d{2}$/.test(raw.slice(0, 10))) day = raw.slice(0, 10);
	else return { error: `${field} must be YYYY, YYYY-MM, or YYYY-MM-DD` };
	const date = new Date(`${day}T12:00:00`);
	if (Number.isNaN(date.getTime())) {
		return { error: `${field} must be a valid date` };
	}
	return { value: day };
}
