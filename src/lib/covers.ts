export type CoverSource = 'tmdb' | 'openlibrary' | 'unsplash';

export interface CoverLookupResult {
	image_url: string;
	source: CoverSource;
	attribution: string;
	matched_title: string;
}

const TMDB_ATTRIBUTION =
	'This product uses the TMDB API but is not endorsed or certified by TMDB.';
const OPEN_LIBRARY_ATTRIBUTION = 'Cover from Open Library.';
const UNSPLASH_ATTRIBUTION = 'Photos from Unsplash.';

function yearFromDate(value?: string | null): string | undefined {
	if (!value) return undefined;
	const year = String(value).slice(0, 4);
	return /^\d{4}$/.test(year) ? year : undefined;
}

export async function lookupMovieCover(
	title: string,
	apiKey: string,
	options: { year?: string | null; director?: string | null } = {},
): Promise<CoverLookupResult | { error: string }> {
	const query = title.trim();
	if (!query) return { error: 'Enter a movie title first.' };
	if (!apiKey.trim()) {
		return { error: 'TMDB_API_KEY is not set. Add it in .dev.vars or Cloudflare secrets.' };
	}

	const params = new URLSearchParams({
		api_key: apiKey.trim(),
		query,
		include_adult: 'false',
	});
	const year = yearFromDate(options.year);
	if (year) params.set('year', year);

	const res = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`, {
		headers: { Accept: 'application/json' },
	});
	if (!res.ok) {
		return { error: `TMDB search failed (${res.status}).` };
	}

	const data = (await res.json()) as {
		results?: Array<{
			title?: string;
			poster_path?: string | null;
			release_date?: string;
		}>;
	};
	const results = data.results ?? [];
	const withPoster = results.find((r) => r.poster_path);
	if (!withPoster?.poster_path) {
		return { error: 'No TMDB poster found for that title.' };
	}

	return {
		image_url: `https://image.tmdb.org/t/p/w500${withPoster.poster_path}`,
		source: 'tmdb',
		attribution: TMDB_ATTRIBUTION,
		matched_title: withPoster.title || query,
	};
}

export async function lookupBookCover(
	title: string,
	options: { author?: string | null } = {},
): Promise<CoverLookupResult | { error: string }> {
	const query = title.trim();
	if (!query) return { error: 'Enter a book title first.' };

	const params = new URLSearchParams({
		title: query,
		limit: '8',
	});
	const author = options.author?.trim();
	if (author) params.set('author', author);

	const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
		headers: { Accept: 'application/json' },
	});
	if (!res.ok) {
		return { error: `Open Library search failed (${res.status}).` };
	}

	const data = (await res.json()) as {
		docs?: Array<{
			title?: string;
			cover_i?: number;
			isbn?: string[];
			cover_edition_key?: string;
		}>;
	};

	for (const doc of data.docs ?? []) {
		if (doc.cover_i) {
			return {
				image_url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
				source: 'openlibrary',
				attribution: OPEN_LIBRARY_ATTRIBUTION,
				matched_title: doc.title || query,
			};
		}
		const isbn = doc.isbn?.find((value) => value && value.length >= 10);
		if (isbn) {
			return {
				image_url: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
				source: 'openlibrary',
				attribution: OPEN_LIBRARY_ATTRIBUTION,
				matched_title: doc.title || query,
			};
		}
		if (doc.cover_edition_key) {
			return {
				image_url: `https://covers.openlibrary.org/b/olid/${doc.cover_edition_key}-L.jpg`,
				source: 'openlibrary',
				attribution: OPEN_LIBRARY_ATTRIBUTION,
				matched_title: doc.title || query,
			};
		}
	}

	return { error: 'No Open Library cover found for that title.' };
}

export async function lookupTripCover(
	query: string,
	accessKey: string,
): Promise<CoverLookupResult | { error: string }> {
	const q = query.trim();
	if (!q) return { error: 'Enter a trip title or place first.' };
	if (!accessKey.trim()) {
		return {
			error: 'UNSPLASH_ACCESS_KEY is not set. Add it in .dev.vars or Cloudflare secrets.',
		};
	}

	const params = new URLSearchParams({
		query: q,
		per_page: '1',
		orientation: 'landscape',
		content_filter: 'high',
	});

	const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
		headers: {
			Accept: 'application/json',
			Authorization: `Client-ID ${accessKey.trim()}`,
		},
	});
	if (!res.ok) {
		return { error: `Unsplash search failed (${res.status}).` };
	}

	const data = (await res.json()) as {
		results?: Array<{
			alt_description?: string | null;
			description?: string | null;
			urls?: { regular?: string; small?: string };
			user?: { name?: string; links?: { html?: string } };
		}>;
	};

	const photo = data.results?.[0];
	const imageUrl = photo?.urls?.regular || photo?.urls?.small;
	if (!imageUrl) {
		return { error: 'No Unsplash photo found for that search.' };
	}

	const photographer = photo.user?.name?.trim() || 'Unsplash';
	const attribution = `Photo by ${photographer} on Unsplash. ${UNSPLASH_ATTRIBUTION}`;

	return {
		image_url: imageUrl,
		source: 'unsplash',
		attribution,
		matched_title: photo.alt_description || photo.description || q,
	};
}

export function coverSourceFromUrl(url: string | null | undefined): CoverSource | null {
	if (!url) return null;
	if (url.includes('image.tmdb.org')) return 'tmdb';
	if (url.includes('covers.openlibrary.org') || url.includes('openlibrary.org')) return 'openlibrary';
	if (url.includes('images.unsplash.com') || url.includes('unsplash.com')) return 'unsplash';
	return null;
}
