/** Third-party marketplace ratings (separate from personal `rating`). */

export type ExternalRatingSource = 'tmdb' | 'imdb' | 'openlibrary' | 'google_books';

export interface ExternalRating {
	source: ExternalRatingSource;
	label: string;
	value: number;
	scale: number;
	count?: number | null;
	url?: string | null;
}

export interface ExternalRatingsPayload {
	version: 1;
	ratings: ExternalRating[];
}

const SOURCE_META: Record<
	ExternalRatingSource,
	{ label: string; home: string; credit: string }
> = {
	tmdb: {
		label: 'TMDB',
		home: 'https://www.themoviedb.org/',
		credit: 'TMDB community score',
	},
	imdb: {
		label: 'IMDb',
		home: 'https://www.imdb.com/',
		credit: 'IMDb rating',
	},
	openlibrary: {
		label: 'Open Library',
		home: 'https://openlibrary.org/',
		credit: 'Open Library ratings',
	},
	google_books: {
		label: 'Google Books',
		home: 'https://books.google.com/',
		credit: 'Google Books rating',
	},
};

export function externalRatingMeta(source: ExternalRatingSource) {
	return SOURCE_META[source];
}

export function serializeExternalRatings(ratings: ExternalRating[]): string | null {
	const cleaned = ratings
		.filter((r) => r && Number.isFinite(r.value) && r.scale > 0)
		.map((r) => ({
			source: r.source,
			label: r.label || SOURCE_META[r.source]?.label || r.source,
			value: roundRating(r.value),
			scale: r.scale,
			count: r.count != null && Number.isFinite(r.count) ? Math.round(r.count) : null,
			url: r.url?.trim() || null,
		}));
	if (!cleaned.length) return null;
	const payload: ExternalRatingsPayload = { version: 1, ratings: cleaned };
	return JSON.stringify(payload);
}

export function parseExternalRatings(raw: string | null | undefined): ExternalRating[] {
	if (!raw?.trim()) return [];
	const trimmed = raw.trim();
	if (trimmed.startsWith('{')) {
		try {
			const data = JSON.parse(trimmed) as ExternalRatingsPayload;
			if (data?.version === 1 && Array.isArray(data.ratings)) {
				return data.ratings.filter(
					(r) =>
						r &&
						typeof r.source === 'string' &&
						typeof r.value === 'number' &&
						typeof r.scale === 'number' &&
						r.scale > 0,
				);
			}
		} catch {
			/* fall through */
		}
	}
	return parseExternalRatingsText(trimmed);
}

/** Admin-friendly lines: `TMDB: 7.8 / 10 (1234 votes)` */
export function formatExternalRatingsForAdmin(raw: string | null | undefined): string {
	const ratings = parseExternalRatings(raw);
	if (!ratings.length) return raw?.trim() || '';
	return ratings.map(formatExternalRatingLine).join('\n');
}

export function normalizeExternalRatingsInput(raw: string | null | undefined): string | null {
	if (!raw?.trim()) return null;
	const trimmed = raw.trim();
	if (trimmed.startsWith('{')) {
		const parsed = parseExternalRatings(trimmed);
		return serializeExternalRatings(parsed);
	}
	const fromText = parseExternalRatingsText(trimmed);
	return serializeExternalRatings(fromText);
}

export function formatExternalRatingDisplay(rating: ExternalRating): string {
	const value = formatScore(rating.value, rating.scale);
	return `${value} / ${rating.scale}`;
}

export function formatExternalRatingLine(rating: ExternalRating): string {
	const base = `${rating.label}: ${formatExternalRatingDisplay(rating)}`;
	if (rating.count != null && rating.count > 0) {
		return `${base} (${formatCount(rating.count)} votes)`;
	}
	return base;
}

export function externalRatingSourcesUsed(
	items: Array<{ external_ratings?: string | null }>,
): ExternalRatingSource[] {
	const set = new Set<ExternalRatingSource>();
	for (const item of items) {
		for (const r of parseExternalRatings(item.external_ratings)) {
			set.add(r.source);
		}
	}
	return [...set];
}

function parseExternalRatingsText(text: string): ExternalRating[] {
	const out: ExternalRating[] = [];
	for (const line of text.split(/\n+/)) {
		const m = line
			.trim()
			.match(
				/^([A-Za-z][A-Za-z0-9 .’']+?):\s*([\d.]+)\s*\/\s*(\d+)(?:\s*\(([\d,]+)\s*votes?\))?/i,
			);
		if (!m) continue;
		const label = m[1].trim();
		const value = Number(m[2]);
		const scale = Number(m[3]);
		const count = m[4] ? Number(m[4].replace(/,/g, '')) : null;
		if (!Number.isFinite(value) || !Number.isFinite(scale) || scale <= 0) continue;
		const source = sourceFromLabel(label);
		out.push({
			source,
			label: SOURCE_META[source]?.label || label,
			value,
			scale,
			count: count != null && Number.isFinite(count) ? count : null,
			url: null,
		});
	}
	return out;
}

function sourceFromLabel(label: string): ExternalRatingSource {
	const n = label.toLowerCase();
	if (n.includes('tmdb') || n.includes('the movie')) return 'tmdb';
	if (n.includes('imdb')) return 'imdb';
	if (n.includes('open library') || n === 'ol') return 'openlibrary';
	if (n.includes('google')) return 'google_books';
	return 'tmdb';
}

function roundRating(value: number): number {
	return Math.round(value * 10) / 10;
}

function formatScore(value: number, scale: number): string {
	const rounded = roundRating(value);
	if (scale >= 10) return rounded.toFixed(1);
	return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

function formatCount(n: number): string {
	return n.toLocaleString('en-US');
}
