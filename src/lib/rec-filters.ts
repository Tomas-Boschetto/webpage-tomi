import type { Recommendation, Trip } from './types';

export type RecSort =
	| 'newest'
	| 'oldest'
	| 'rating-desc'
	| 'rating-asc'
	| 'title-asc'
	| 'title-desc';

export type TripSort = 'newest' | 'oldest' | 'title-asc' | 'title-desc';

const REC_SORTS = new Set<RecSort>([
	'newest',
	'oldest',
	'rating-desc',
	'rating-asc',
	'title-asc',
	'title-desc',
]);

const TRIP_SORTS = new Set<TripSort>(['newest', 'oldest', 'title-asc', 'title-desc']);

export function parseRecSort(value: string | null): RecSort {
	if (value && REC_SORTS.has(value as RecSort)) return value as RecSort;
	return 'newest';
}

export function parseTripSort(value: string | null): TripSort {
	if (value && TRIP_SORTS.has(value as TripSort)) return value as TripSort;
	return 'newest';
}

export function parseMinRating(value: string | null): number | null {
	if (value == null || value === '') return null;
	const n = Number(value);
	if (!Number.isFinite(n) || n < 0 || n > 5) return null;
	return n;
}

/** Split free-text genre fields into unique labels. */
export function extractGenres(items: Recommendation[]): string[] {
	const set = new Set<string>();
	for (const item of items) {
		if (!item.genre) continue;
		for (const part of item.genre.split(/[,/|]/)) {
			const label = part.trim();
			if (label) set.add(label);
		}
	}
	return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function genreTokens(genre: string | null): string[] {
	if (!genre) return [];
	return genre
		.split(/[,/|]/)
		.map((part) => part.trim().toLowerCase())
		.filter(Boolean);
}

export function matchesGenre(item: Recommendation, genre: string | null): boolean {
	if (!genre) return true;
	const needle = genre.trim().toLowerCase();
	if (!needle) return true;
	const tokens = genreTokens(item.genre);
	return tokens.includes(needle) || (item.genre || '').trim().toLowerCase() === needle;
}

function dateKey(value: string | null | undefined): number {
	if (!value) return 0;
	const t = Date.parse(`${String(value).slice(0, 10)}T12:00:00`);
	return Number.isNaN(t) ? 0 : t;
}

export function filterAndSortRecommendations(
	items: Recommendation[],
	options: { genre?: string | null; minRating?: number | null; sort?: RecSort },
): Recommendation[] {
	const genre = options.genre?.trim() || null;
	const minRating = options.minRating ?? null;
	const sort = options.sort ?? 'newest';

	const filtered = items.filter((item) => {
		if (!matchesGenre(item, genre)) return false;
		if (minRating != null && (item.rating == null || item.rating < minRating)) return false;
		return true;
	});

	const sorted = [...filtered];
	sorted.sort((a, b) => {
		switch (sort) {
			case 'oldest':
				return dateKey(a.experienced_at) - dateKey(b.experienced_at) || a.title.localeCompare(b.title);
			case 'rating-desc':
				return (b.rating ?? -1) - (a.rating ?? -1) || a.title.localeCompare(b.title);
			case 'rating-asc':
				return (a.rating ?? 99) - (b.rating ?? 99) || a.title.localeCompare(b.title);
			case 'title-asc':
				return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
			case 'title-desc':
				return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
			case 'newest':
			default:
				return dateKey(b.experienced_at) - dateKey(a.experienced_at) || a.title.localeCompare(b.title);
		}
	});
	return sorted;
}

export function sortTrips(trips: Trip[], sort: TripSort): Trip[] {
	const sorted = [...trips];
	sorted.sort((a, b) => {
		switch (sort) {
			case 'oldest':
				return dateKey(a.created_at) - dateKey(b.created_at) || a.title.localeCompare(b.title);
			case 'title-asc':
				return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
			case 'title-desc':
				return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
			case 'newest':
			default:
				return dateKey(b.created_at) - dateKey(a.created_at) || a.title.localeCompare(b.title);
		}
	});
	return sorted;
}
