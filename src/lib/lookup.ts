/** Movie/book metadata lookup via TMDB + Open Library (no scraping). */

import { groupAwardWins, serializeAccolades } from './accolades';
import {
	serializeExternalRatings,
	type ExternalRating,
} from './external-ratings';
import { mapToStandardGenres } from './genres';

export type LookupSource = 'tmdb' | 'openlibrary';

export interface LookupMatch {
	id: string;
	title: string;
	subtitle: string;
	image_url: string | null;
	source: LookupSource;
}

export interface LookupSelection {
	title: string;
	summary: string | null;
	genre: string | null;
	director: string | null;
	cast_members: string | null;
	imdb_url: string | null;
	goodreads_url: string | null;
	url: string | null;
	image_url: string | null;
	images: string[];
	edition_published_at: string | null;
	original_published_at: string | null;
	accolades: string | null;
	external_ratings: string | null;
	matched_title: string;
	source: LookupSource;
	attribution: string;
}

const TMDB_ATTRIBUTION =
	'This product uses the TMDB API but is not endorsed or certified by TMDB.';
const OPEN_LIBRARY_ATTRIBUTION = 'Cover and book data from Open Library.';

async function fetchWithTimeout(
	url: string,
	init: RequestInit = {},
	timeoutMs = 4500,
): Promise<Response> {
	const attempt = async () => {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			return await fetch(url, {
				...init,
				signal: controller.signal,
			});
		} finally {
			clearTimeout(timer);
		}
	};
	try {
		return await attempt();
	} catch (err) {
		// One retry helps with flaky Open Library / Wikidata connections.
		const msg = err instanceof Error ? err.message : String(err);
		if (/ECONNRESET|fetch failed|aborted|AbortError/i.test(msg)) {
			await new Promise((r) => setTimeout(r, 250));
			return attempt();
		}
		throw err;
	}
}

function tmdbPoster(path: string | null | undefined, size = 'w500'): string | null {
	if (!path) return null;
	return `https://image.tmdb.org/t/p/${size}${path}`;
}

export async function searchMovies(
	query: string,
	apiKey: string,
): Promise<{ matches: LookupMatch[] } | { error: string }> {
	const q = query.trim();
	if (!q) return { error: 'Enter a title to search.' };
	if (!apiKey.trim()) {
		return { error: 'TMDB_API_KEY is not set. Add it in .dev.vars or Cloudflare secrets.' };
	}

	const params = new URLSearchParams({
		api_key: apiKey.trim(),
		query: q,
		include_adult: 'false',
	});
	const res = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`, {
		headers: { Accept: 'application/json' },
	});
	if (!res.ok) return { error: `TMDB search failed (${res.status}).` };

	const data = (await res.json()) as {
		results?: Array<{
			id?: number;
			title?: string;
			release_date?: string;
			poster_path?: string | null;
		}>;
	};

	const matches: LookupMatch[] = (data.results ?? [])
		.filter((r) => r.id != null && r.title)
		.slice(0, 10)
		.map((r) => {
			const year = r.release_date?.slice(0, 4) || '';
			return {
				id: String(r.id),
				title: r.title!,
				subtitle: year ? `Film · ${year}` : 'Film',
				image_url: tmdbPoster(r.poster_path, 'w185'),
				source: 'tmdb' as const,
			};
		});

	if (!matches.length) return { error: 'No movies found for that title.' };
	return { matches };
}

export async function selectMovie(
	id: string,
	apiKey: string,
	options: { omdbApiKey?: string | null } = {},
): Promise<LookupSelection | { error: string }> {
	if (!apiKey.trim()) {
		return { error: 'TMDB_API_KEY is not set. Add it in .dev.vars or Cloudflare secrets.' };
	}
	const movieId = id.trim();
	if (!/^\d+$/.test(movieId)) return { error: 'Invalid movie id.' };

	const key = apiKey.trim();
	const detailUrl = `https://api.themoviedb.org/3/movie/${movieId}?${new URLSearchParams({
		api_key: key,
		append_to_response: 'credits,images',
		include_image_language: 'en,null',
	})}`;

	const res = await fetch(detailUrl, { headers: { Accept: 'application/json' } });
	if (!res.ok) return { error: `TMDB details failed (${res.status}).` };

	const data = (await res.json()) as {
		title?: string;
		overview?: string;
		release_date?: string;
		genres?: Array<{ name?: string }>;
		imdb_id?: string | null;
		poster_path?: string | null;
		homepage?: string | null;
		vote_average?: number;
		vote_count?: number;
		credits?: {
			crew?: Array<{ job?: string; name?: string }>;
			cast?: Array<{ name?: string }>;
		};
		images?: {
			posters?: Array<{ file_path?: string }>;
		};
	};

	const directors = (data.credits?.crew ?? [])
		.filter((c) => c.job === 'Director' && c.name)
		.map((c) => c.name!);
	const cast = (data.credits?.cast ?? [])
		.map((c) => c.name)
		.filter((n): n is string => Boolean(n))
		.slice(0, 6);

	const posters = [
		tmdbPoster(data.poster_path),
		...(data.images?.posters ?? [])
			.map((p) => tmdbPoster(p.file_path))
			.filter((u): u is string => Boolean(u)),
	];
	const images = [...new Set(posters.filter(Boolean))] as string[];

	const imdb = data.imdb_id?.trim();
	const imdbUrl = imdb ? `https://www.imdb.com/title/${imdb}/` : null;
	const tmdbPage = `https://www.themoviedb.org/movie/${movieId}`;

	const [accolades, wikipediaUrl, imdbRating] = await Promise.all([
		imdb ? fetchFilmAccolades(imdb) : Promise.resolve(null),
		imdb
			? wikipediaUrlFromImdb(imdb)
			: wikipediaUrlFromSearch(data.title || '', 'film'),
		imdb
			? fetchImdbRatingViaOmdb(imdb, options.omdbApiKey)
			: Promise.resolve(null),
	]);

	const ratings: ExternalRating[] = [];
	if (
		typeof data.vote_average === 'number' &&
		data.vote_average > 0 &&
		(data.vote_count == null || data.vote_count > 0)
	) {
		ratings.push({
			source: 'tmdb',
			label: 'TMDB',
			value: data.vote_average,
			scale: 10,
			count: data.vote_count ?? null,
			url: tmdbPage,
		});
	}
	if (imdbRating) ratings.push(imdbRating);

	return {
		title: data.title || 'Untitled',
		summary: data.overview?.trim() || null,
		genre: mapToStandardGenres((data.genres ?? []).map((g) => g.name)),
		director: directors.join(', ') || null,
		cast_members: cast.join(', ') || null,
		imdb_url: imdbUrl,
		goodreads_url: null,
		url: wikipediaUrl,
		image_url: images[0] || null,
		images,
		edition_published_at: normalizeLooseDate(data.release_date || null),
		original_published_at: normalizeLooseDate(data.release_date || null),
		accolades,
		external_ratings: serializeExternalRatings(ratings),
		matched_title: data.title || movieId,
		source: 'tmdb',
		attribution: TMDB_ATTRIBUTION,
	};
}

export async function searchBooks(
	query: string,
	options: { author?: string | null } = {},
): Promise<{ matches: LookupMatch[] } | { error: string }> {
	const q = query.trim();
	if (!q) return { error: 'Enter a title to search.' };

	const author = options.author?.trim();
	const expanded = q.replace(/\bDr\.?\b/gi, 'Doctor');
	const titleQueries = expanded !== q ? [expanded, q] : [q];

	type Doc = {
		key?: string;
		title?: string;
		author_name?: string[];
		first_publish_year?: number;
		cover_i?: number;
		cover_edition_key?: string;
	};
	const docsByKey = new Map<string, Doc>();

	for (const titleQ of titleQueries) {
		const params = new URLSearchParams({
			title: titleQ,
			limit: '20',
			fields: 'key,title,author_name,first_publish_year,cover_i,cover_edition_key',
		});
		if (author) params.set('author', author);
		try {
			const res = await fetchWithTimeout(
				`https://openlibrary.org/search.json?${params}`,
				{ headers: { Accept: 'application/json' } },
				6000,
			);
			if (!res.ok) continue;
			const data = (await res.json()) as { docs?: Doc[] };
			for (const doc of data.docs ?? []) {
				if (!doc.key || !doc.title) continue;
				const prev = docsByKey.get(doc.key);
				if (!prev || (!prev.cover_i && doc.cover_i)) docsByKey.set(doc.key, doc);
			}
		} catch {
			/* try next title variant */
		}
	}

	if (!docsByKey.size) return { error: 'No books found for that title.' };

	const qNorm = q
		.toLowerCase()
		.replace(/\./g, '')
		.replace(/\s+/g, ' ')
		.trim();

	const scored = [...docsByKey.values()]
		.filter((doc): doc is Doc & { key: string; title: string } =>
			Boolean(doc.key && doc.title),
		)
		.map((doc) => {
			const year = doc.first_publish_year || 9999;
			const hasCover = Boolean(doc.cover_i || doc.cover_edition_key);
			const tNorm = doc.title
				.toLowerCase()
				.replace(/\./g, '')
				.replace(/\s+/g, ' ')
				.trim();
			const tAlt = tNorm.replace(/\bdr\b/g, 'doctor');
			const qAlt = qNorm.replace(/\bdr\b/g, 'doctor');
			let score = 0;

			if (
				/\[adaptation\]|study guide|sparknotes|cliffnotes|summary of|poems of|companion to|criticism|reader'?s guide|analysis of|pasternak'?s /i.test(
					doc.title,
				)
			) {
				score -= 60;
			}
			if (tNorm === qNorm || tAlt === qAlt) score += 50;
			else if (tAlt === `the ${qAlt}` || tNorm === `the ${qNorm}`) score += 45;
			else if (tAlt.startsWith(qAlt) && tAlt.length <= qAlt.length + 8) score += 25;
			else if (tAlt.includes(qAlt)) score += 8;

			if (hasCover) score += 22;
			if (year > 1000 && year < 2030) {
				score += Math.max(0, 40 - (year - 1850) / 4);
			}
			if ((doc.author_name?.length || 0) > 3) score -= 6;
			return { doc, score, year };
		})
		.sort((a, b) => b.score - a.score || a.year - b.year);

	const matches: LookupMatch[] = [];
	for (const { doc } of scored) {
		const authors = (doc.author_name ?? []).slice(0, 2).join(', ');
		const year = doc.first_publish_year ? String(doc.first_publish_year) : '';
		const parts = [authors, year].filter(Boolean);
		let image_url: string | null = null;
		if (doc.cover_i) {
			image_url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
		} else if (doc.cover_edition_key) {
			image_url = `https://covers.openlibrary.org/b/olid/${doc.cover_edition_key}-M.jpg`;
		}
		matches.push({
			id: doc.key,
			title: doc.title,
			subtitle: parts.length ? `Book · ${parts.join(' · ')}` : 'Book',
			image_url,
			source: 'openlibrary',
		});
		if (matches.length >= 8) break;
	}

	if (!matches.length) return { error: 'No books found for that title.' };
	return { matches };
}

export async function selectBook(workKey: string): Promise<LookupSelection | { error: string }> {
	const key = workKey.trim().replace(/^\/+/, '');
	if (!key.startsWith('works/')) {
		return { error: 'Invalid Open Library work id.' };
	}

	const workRes = await fetchWithTimeout(
		`https://openlibrary.org/${key}.json`,
		{ headers: { Accept: 'application/json' } },
		6000,
	);
	if (!workRes.ok) return { error: `Open Library work lookup failed (${workRes.status}).` };

	const work = (await workRes.json()) as {
		title?: string;
		description?: string | { value?: string };
		subjects?: string[];
		covers?: number[];
		authors?: Array<{ author?: { key?: string } }>;
		first_publish_date?: string;
		links?: Array<{ url?: string; title?: string }>;
		remote_ids?: { wikidata?: string; goodreads?: string };
	};

	const olId = key.replace(/^works\//, '');
	const authorKeys = (work.authors ?? [])
		.map((entry) => entry.author?.key)
		.filter((k): k is string => Boolean(k))
		.slice(0, 3);

	const [authorNames, editionInfo, searchMeta] = await Promise.all([
		fetchAuthorNames(authorKeys),
		fetchEditionBundle(key),
		fetchOpenLibrarySearchMeta(olId, work.title || ''),
	]);

	const authorHint = authorNames[0] || '';
	const wikiFromLinks =
		(work.links ?? []).find((l) => /wikipedia\.org/i.test(l.url || ''))?.url?.trim() || null;

	const wikipediaSeedUrl =
		wikiFromLinks ||
		(await wikipediaUrlFromSearch(work.title || '', 'book', authorHint)) ||
		(await wikipediaUrlFromSearch(
			(work.title || '').replace(/\bDr\.?\b/gi, 'Doctor'),
			'book',
			authorHint,
		));

	const qidFromWiki = wikipediaSeedUrl
		? await wikidataIdFromWikipediaUrl(wikipediaSeedUrl)
		: null;

	const [google, wikidataBundle] = await Promise.all([
		fetchGoogleBooksMeta({
			title: (work.title || '').replace(/\bDr\.?\b/gi, 'Doctor') || work.title || '',
			author: authorHint,
			isbns: editionInfo.isbns,
		}),
		fetchWikidataBookBundle({
			openLibraryId: olId,
			wikidataId: qidFromWiki || work.remote_ids?.wikidata?.trim() || null,
			title: (work.title || '').replace(/\bDr\.?\b/gi, 'Doctor') || work.title || '',
		}),
	]);

	const description =
		(typeof work.description === 'string'
			? work.description
			: work.description?.value || null) ||
		google.summary ||
		null;

	const images: string[] = [];
	for (const coverId of work.covers ?? []) {
		images.push(`https://covers.openlibrary.org/b/id/${coverId}-L.jpg`);
	}
	images.push(...editionInfo.covers);
	if (google.cover) images.push(google.cover);
	for (const isbn of editionInfo.isbns.slice(0, 4)) {
		images.push(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`);
	}
	const uniqueImages = [...new Set(images.filter(Boolean))];

	const wikipediaUrl =
		wikipediaSeedUrl || wikidataBundle.wikipediaUrl || null;

	const goodreadsUrl =
		resolveGoodreadsUrl(work.remote_ids?.goodreads?.trim() || null, editionInfo.isbns) ||
		wikidataBundle.goodreadsUrl ||
		null;

	const originalPublished = earliestDate([
		normalizeLooseDate(work.first_publish_date || null),
		searchMeta.firstPublishYear,
		wikidataBundle.publishedAt,
		google.published,
		editionInfo.earliestPublished,
	]);

	const editionPublished =
		editionInfo.latestPublished ||
		editionInfo.earliestPublished ||
		google.published ||
		null;

	const genre =
		mapToStandardGenres([
			...(work.subjects ?? []),
			...(google.categories ?? []),
			...(searchMeta.subjects ?? []),
			wikidataBundle.isNovel ? 'literary fiction' : null,
			wikidataBundle.isNovel ? 'drama' : null,
		]) || (wikidataBundle.isNovel ? 'Drama' : null);

	const [accolades, olRating, googleRating] = await Promise.all([
		wikidataBundle.accolades
			? Promise.resolve(wikidataBundle.accolades)
			: fetchBookAccolades({
					openLibraryId: olId,
					wikidataId: wikidataBundle.qid || work.remote_ids?.wikidata?.trim() || null,
					title: work.title || '',
					author: authorHint,
				}),
		fetchOpenLibraryRating(olId),
		Promise.resolve(google.rating),
	]);

	const ratings: ExternalRating[] = [];
	if (olRating) ratings.push(olRating);
	if (googleRating) ratings.push(googleRating);

	return {
		title: work.title || 'Untitled',
		summary: description?.trim().slice(0, 2000) || null,
		genre,
		director: authorNames.join(', ') || null,
		cast_members: null,
		imdb_url: null,
		goodreads_url: goodreadsUrl,
		url: wikipediaUrl,
		image_url: uniqueImages[0] || null,
		images: uniqueImages,
		edition_published_at: editionPublished,
		original_published_at: originalPublished,
		accolades,
		external_ratings: serializeExternalRatings(ratings),
		matched_title: work.title || key,
		source: 'openlibrary',
		attribution:
			'Cover and book data from Open Library; cross-checked with Wikidata and Google Books when available.',
	};
}

async function fetchAuthorNames(authorKeys: string[]): Promise<string[]> {
	const results = await Promise.all(
		authorKeys.map(async (authorKey) => {
			try {
				const aRes = await fetchWithTimeout(
					`https://openlibrary.org${authorKey}.json`,
					{ headers: { Accept: 'application/json' } },
					3500,
				);
				if (!aRes.ok) return null;
				const author = (await aRes.json()) as { name?: string };
				return author.name?.trim() || null;
			} catch {
				return null;
			}
		}),
	);
	return results.filter((n): n is string => Boolean(n));
}

async function fetchEditionBundle(workKey: string): Promise<{
	covers: string[];
	isbns: string[];
	earliestPublished: string | null;
	latestPublished: string | null;
}> {
	try {
		const edRes = await fetchWithTimeout(
			`https://openlibrary.org/${workKey}/editions.json?limit=40`,
			{ headers: { Accept: 'application/json' } },
			5000,
		);
		if (!edRes.ok) {
			return { covers: [], isbns: [], earliestPublished: null, latestPublished: null };
		}
		const editions = (await edRes.json()) as {
			entries?: Array<{
				publish_date?: string;
				covers?: number[];
				isbn_13?: string[];
				isbn_10?: string[];
			}>;
		};
		const covers: string[] = [];
		const isbns: string[] = [];
		const dates: string[] = [];
		for (const entry of editions.entries ?? []) {
			if (entry.covers?.[0]) {
				covers.push(`https://covers.openlibrary.org/b/id/${entry.covers[0]}-L.jpg`);
			}
			for (const isbn of [...(entry.isbn_13 ?? []), ...(entry.isbn_10 ?? [])]) {
				if (isbn && !isbns.includes(isbn)) isbns.push(isbn);
			}
			const d = normalizeLooseDate(entry.publish_date || null);
			if (d) dates.push(d);
		}
		dates.sort();
		return {
			covers: [...new Set(covers)].slice(0, 12),
			isbns: isbns.slice(0, 12),
			earliestPublished: dates[0] || null,
			latestPublished: dates[dates.length - 1] || null,
		};
	} catch {
		return { covers: [], isbns: [], earliestPublished: null, latestPublished: null };
	}
}

async function fetchOpenLibrarySearchMeta(
	olId: string,
	title: string,
): Promise<{ firstPublishYear: string | null; subjects: string[] }> {
	try {
		const params = new URLSearchParams({
			q: `key:/works/${olId}`,
			limit: '1',
			fields: 'first_publish_year,subject',
		});
		let res = await fetchWithTimeout(
			`https://openlibrary.org/search.json?${params}`,
			{ headers: { Accept: 'application/json' } },
			4000,
		);
		if (!res.ok && title.trim()) {
			const byTitle = new URLSearchParams({
				title: title.trim(),
				limit: '1',
				fields: 'key,first_publish_year,subject',
			});
			res = await fetchWithTimeout(
				`https://openlibrary.org/search.json?${byTitle}`,
				{ headers: { Accept: 'application/json' } },
				4000,
			);
		}
		if (!res.ok) return { firstPublishYear: null, subjects: [] };
		const data = (await res.json()) as {
			docs?: Array<{ first_publish_year?: number; subject?: string[] }>;
		};
		const doc = data.docs?.[0];
		const year =
			typeof doc?.first_publish_year === 'number' && doc.first_publish_year > 1000
				? `${doc.first_publish_year}-01-01`
				: null;
		return {
			firstPublishYear: year,
			subjects: (doc?.subject ?? []).slice(0, 12),
		};
	} catch {
		return { firstPublishYear: null, subjects: [] };
	}
}

interface GoogleBooksMeta {
	summary: string | null;
	cover: string | null;
	published: string | null;
	categories: string[];
	rating: ExternalRating | null;
}

async function fetchGoogleBooksMeta(options: {
	title: string;
	author?: string | null;
	isbns?: string[];
}): Promise<GoogleBooksMeta> {
	const empty: GoogleBooksMeta = {
		summary: null,
		cover: null,
		published: null,
		categories: [],
		rating: null,
	};
	const queries: string[] = [];
	for (const isbn of (options.isbns ?? []).slice(0, 3)) {
		const clean = isbn.replace(/-/g, '');
		if (clean) queries.push(`isbn:${clean}`);
	}
	if (options.title.trim()) {
		const parts = [`intitle:"${options.title.trim()}"`];
		if (options.author?.trim()) parts.push(`inauthor:"${options.author.trim()}"`);
		queries.push(parts.join(' '));
	}

	for (const q of queries) {
		try {
			const url = `https://www.googleapis.com/books/v1/volumes?${new URLSearchParams({
				q,
				maxResults: '1',
				fields:
					'items(volumeInfo/title,volumeInfo/description,volumeInfo/publishedDate,volumeInfo/categories,volumeInfo/averageRating,volumeInfo/ratingsCount,volumeInfo/imageLinks/thumbnail,volumeInfo/imageLinks/smallThumbnail,volumeInfo/infoLink)',
			})}`;
			const res = await fetchWithTimeout(
				url,
				{
					headers: {
						Accept: 'application/json',
						'User-Agent': 'webpage-tomi/1.0 (personal site; book metadata)',
					},
				},
				3500,
			);
			if (!res.ok) continue;
			const data = (await res.json()) as {
				items?: Array<{
					volumeInfo?: {
						description?: string;
						publishedDate?: string;
						categories?: string[];
						averageRating?: number;
						ratingsCount?: number;
						imageLinks?: { thumbnail?: string; smallThumbnail?: string };
						infoLink?: string;
					};
				}>;
			};
			const info = data.items?.[0]?.volumeInfo;
			if (!info) continue;
			const coverRaw =
				info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
			const cover = coverRaw ? coverRaw.replace(/^http:/, 'https:').replace(/&edge=curl/i, '') : null;
			const rating =
				typeof info.averageRating === 'number' && info.averageRating > 0
					? ({
							source: 'google_books' as const,
							label: 'Google Books',
							value: info.averageRating,
							scale: 5,
							count: typeof info.ratingsCount === 'number' ? info.ratingsCount : null,
							url: info.infoLink || 'https://books.google.com/',
						} satisfies ExternalRating)
					: null;
			return {
				summary: info.description?.trim().slice(0, 2000) || null,
				cover,
				published: normalizeLooseDate(info.publishedDate || null),
				categories: info.categories ?? [],
				rating,
			};
		} catch {
			/* try next */
		}
	}
	return empty;
}

interface WikidataBookBundle {
	qid: string | null;
	publishedAt: string | null;
	wikipediaUrl: string | null;
	goodreadsUrl: string | null;
	accolades: string | null;
	isNovel: boolean;
}

async function fetchWikidataBookBundle(options: {
	openLibraryId?: string | null;
	wikidataId?: string | null;
	title?: string;
}): Promise<WikidataBookBundle> {
	const empty: WikidataBookBundle = {
		qid: null,
		publishedAt: null,
		wikipediaUrl: null,
		goodreadsUrl: null,
		accolades: null,
		isNovel: false,
	};
	const olId = options.openLibraryId?.trim().replace(/^works\//, '') || '';
	const qidIn = options.wikidataId?.trim() || '';
	const title = options.title?.trim() || '';

	const attempts: string[] = [];
	if (/^Q\d+$/i.test(qidIn)) attempts.push(`BIND(wd:${qidIn} AS ?item)`);
	if (/^OL\d+W$/i.test(olId)) attempts.push(`?item wdt:P648 "${olId}" .`);
	if (title) {
		const safe = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
		attempts.push(`
			?item wdt:P31/wdt:P279* wd:Q7725634 ;
				rdfs:label "${safe}"@en .
		`);
	}

	for (const itemMatch of attempts) {
		const query = `
			SELECT ?item ?published ?article ?goodreads ?goodreadsWork ?awardLabel ?conferredLabel ?instanceLabel WHERE {
				${itemMatch}
				OPTIONAL { ?item wdt:P577 ?published . }
				OPTIONAL {
					?article schema:about ?item ;
						schema:isPartOf <https://en.wikipedia.org/> .
				}
				OPTIONAL { ?item wdt:P2969 ?goodreads . }
				OPTIONAL { ?item wdt:P8383 ?goodreadsWork . }
				OPTIONAL { ?item wdt:P31 ?instance . }
				OPTIONAL {
					?item wdt:P166 ?award .
					OPTIONAL { ?award wdt:P1027 ?conferred . }
				}
				SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
			}
			LIMIT 30
		`;
		try {
			const url = `https://query.wikidata.org/sparql?${new URLSearchParams({
				query,
				format: 'json',
			})}`;
			const res = await fetchWithTimeout(
				url,
				{
					headers: {
						Accept: 'application/sparql-results+json',
						'User-Agent': 'webpage-tomi/1.0 (personal site; book enrichment)',
					},
				},
				5500,
			);
			if (!res.ok) continue;
			const data = (await res.json()) as {
				results?: {
					bindings?: Array<{
						item?: { value?: string };
						published?: { value?: string };
						article?: { value?: string };
						goodreads?: { value?: string };
						goodreadsWork?: { value?: string };
						awardLabel?: { value?: string };
						conferredLabel?: { value?: string };
						instanceLabel?: { value?: string };
					}>;
				};
			};
			const rows = data.results?.bindings ?? [];
			if (!rows.length) continue;

			const qid =
				rows[0]?.item?.value?.match(/\/(Q\d+)$/i)?.[1] ||
				(/^Q\d+$/i.test(qidIn) ? qidIn : null);
			const publishedAt = earliestDate(
				rows.map((r) => normalizeLooseDate(r.published?.value?.slice(0, 10) || null)),
			);
			const wikipediaUrl =
				rows.map((r) => r.article?.value?.trim()).find((u) => u?.includes('wikipedia.org')) ||
				null;
			const bookId = rows.map((r) => r.goodreads?.value?.trim()).find((v) => v && /^\d+$/.test(v));
			const workId = rows
				.map((r) => r.goodreadsWork?.value?.trim())
				.find((v) => v && /^\d+$/.test(v));
			const goodreadsUrl = bookId
				? `https://www.goodreads.com/book/show/${bookId}`
				: workId
					? `https://www.goodreads.com/work/editions/${workId}`
					: null;
			const awardEntries = rows
				.map((r) => ({
					title: r.awardLabel?.value?.trim() || '',
					conferredBy: r.conferredLabel?.value?.trim() || null,
				}))
				.filter((e) => e.title && !/^http/i.test(e.title) && e.title !== 'award');
			const accolades = awardEntries.length
				? serializeAccolades(groupAwardWins(awardEntries), 'wikidata')
				: null;
			const isNovel = rows.some((r) =>
				/novel|literary work|written work|book/i.test(r.instanceLabel?.value || ''),
			);

			return { qid, publishedAt, wikipediaUrl, goodreadsUrl, accolades, isNovel };
		} catch {
			/* try next strategy */
		}
	}
	return empty;
}

/** Resolve Wikidata Q-id from an English Wikipedia article URL. */
async function wikidataIdFromWikipediaUrl(articleUrl: string): Promise<string | null> {
	try {
		const path = new URL(articleUrl).pathname;
		const title = decodeURIComponent(path.replace(/^\/wiki\//, '')).replace(/_/g, ' ');
		if (!title) return null;
		const params = new URLSearchParams({
			action: 'query',
			prop: 'pageprops',
			ppprop: 'wikibase_item',
			titles: title,
			format: 'json',
			origin: '*',
		});
		const res = await fetchWithTimeout(
			`https://en.wikipedia.org/w/api.php?${params}`,
			{
				headers: {
					Accept: 'application/json',
					'User-Agent': 'webpage-tomi/1.0 (personal site; wikidata id)',
				},
			},
			3500,
		);
		if (!res.ok) return null;
		const data = (await res.json()) as {
			query?: { pages?: Record<string, { pageprops?: { wikibase_item?: string } }> };
		};
		const pages = Object.values(data.query?.pages || {});
		const qid = pages[0]?.pageprops?.wikibase_item?.trim();
		return qid && /^Q\d+$/i.test(qid) ? qid : null;
	} catch {
		return null;
	}
}

function earliestDate(values: Array<string | null | undefined>): string | null {
	const years = values
		.map((v) => normalizeLooseDate(v || null))
		.filter((v): v is string => Boolean(v))
		.filter((v) => {
			const y = Number(v.slice(0, 4));
			return y >= 1000 && y <= new Date().getFullYear() + 1;
		})
		.sort();
	return years[0] || null;
}

/**
 * Resolve the English Wikipedia article URL for a film via Wikidata (IMDb id → sitelink).
 */
async function wikipediaUrlFromImdb(imdbId: string): Promise<string | null> {
	const id = imdbId.trim();
	if (!/^tt\d+$/.test(id)) return null;

	const query = `
		SELECT ?article WHERE {
			?item wdt:P345 "${id}" .
			?article schema:about ?item ;
				schema:isPartOf <https://en.wikipedia.org/> .
		}
		LIMIT 1
	`;

	try {
		const url = `https://query.wikidata.org/sparql?${new URLSearchParams({
			query,
			format: 'json',
		})}`;
		const res = await fetchWithTimeout(
			url,
			{
				headers: {
					Accept: 'application/sparql-results+json',
					'User-Agent': 'webpage-tomi/1.0 (personal site; wikipedia link)',
				},
			},
			4000,
		);
		if (!res.ok) return null;
		const data = (await res.json()) as {
			results?: { bindings?: Array<{ article?: { value?: string } }> };
		};
		const article = data.results?.bindings?.[0]?.article?.value?.trim();
		return article && article.includes('wikipedia.org') ? article : null;
	} catch {
		return null;
	}
}

/** Resolve English Wikipedia article from a Wikidata Q-id. */
async function wikipediaUrlFromWikidataId(qid: string): Promise<string | null> {
	const query = `
		SELECT ?article WHERE {
			BIND(wd:${qid} AS ?item)
			?article schema:about ?item ;
				schema:isPartOf <https://en.wikipedia.org/> .
		}
		LIMIT 1
	`;
	try {
		const url = `https://query.wikidata.org/sparql?${new URLSearchParams({
			query,
			format: 'json',
		})}`;
		const res = await fetchWithTimeout(
			url,
			{
				headers: {
					Accept: 'application/sparql-results+json',
					'User-Agent': 'webpage-tomi/1.0 (personal site; wikipedia link)',
				},
			},
			4000,
		);
		if (!res.ok) return null;
		const data = (await res.json()) as {
			results?: { bindings?: Array<{ article?: { value?: string } }> };
		};
		const article = data.results?.bindings?.[0]?.article?.value?.trim();
		return article && article.includes('wikipedia.org') ? article : null;
	} catch {
		return null;
	}
}

/** Fallback: MediaWiki opensearch for a film or book title. */
async function wikipediaUrlFromSearch(
	title: string,
	kind: 'film' | 'book',
	author?: string,
): Promise<string | null> {
	const q = title.trim();
	if (!q) return null;
	const expanded = q.replace(/\bDr\.?\b/gi, 'Doctor');
	const queries =
		kind === 'film'
			? [`${q} film`, q]
			: [
					`${expanded} (novel)`,
					`${expanded} novel`,
					author?.trim() ? `${expanded} ${author.trim()}` : '',
					expanded,
					q,
				].filter(Boolean);

	for (const query of queries) {
		try {
			const params = new URLSearchParams({
				action: 'opensearch',
				search: query,
				limit: '3',
				namespace: '0',
				format: 'json',
				origin: '*',
			});
			const res = await fetchWithTimeout(
				`https://en.wikipedia.org/w/api.php?${params}`,
				{
					headers: {
						Accept: 'application/json',
						'User-Agent': 'webpage-tomi/1.0 (personal site; wikipedia link)',
					},
				},
				3500,
			);
			if (!res.ok) continue;
			const data = (await res.json()) as unknown;
			if (!Array.isArray(data) || data.length < 4) continue;
			const titles = data[1];
			const urls = data[3];
			if (!Array.isArray(urls) || !Array.isArray(titles)) continue;
			for (let i = 0; i < urls.length; i++) {
				const url = urls[i];
				const hitTitle = String(titles[i] || '');
				if (typeof url !== 'string' || !url.includes('wikipedia.org')) continue;
				if (kind === 'book' && /\(film\)|\(movie\)|\(miniseries\)/i.test(hitTitle)) continue;
				if (kind === 'film' && /\(novel\)|\(book\)/i.test(hitTitle)) continue;
				return url;
			}
		} catch {
			/* try next query */
		}
	}
	return null;
}

/**
 * Resolve literary award wins via Wikidata (Open Library id, Wikidata Q-id, or title).
 */
async function fetchBookAccolades(options: {
	openLibraryId?: string | null;
	wikidataId?: string | null;
	title?: string;
	author?: string;
}): Promise<string | null> {
	const olId = options.openLibraryId?.trim().replace(/^works\//, '') || '';
	const qid = options.wikidataId?.trim() || '';

	// Prefer exact ids only — title SPARQL is too slow and often times out in Workers.
	const attempts: string[] = [];
	if (/^OL\d+W$/i.test(olId)) {
		attempts.push(`?item wdt:P648 "${olId}" .`);
	}
	if (/^Q\d+$/i.test(qid)) {
		attempts.push(`BIND(wd:${qid} AS ?item)`);
	}

	for (const itemMatch of attempts) {
		const result = await queryWikidataAwards(itemMatch);
		if (result) return result;
	}
	return null;
}

async function queryWikidataAwards(itemMatch: string): Promise<string | null> {
	const query = `
		SELECT DISTINCT ?awardLabel ?conferredLabel WHERE {
			${itemMatch}
			?item wdt:P166 ?award .
			OPTIONAL { ?award wdt:P1027 ?conferred . }
			SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
		}
		LIMIT 24
	`;

	try {
		const url = `https://query.wikidata.org/sparql?${new URLSearchParams({
			query,
			format: 'json',
		})}`;
		const res = await fetchWithTimeout(
			url,
			{
				headers: {
					Accept: 'application/sparql-results+json',
					'User-Agent': 'webpage-tomi/1.0 (personal site; awards; contact via github)',
				},
			},
			5500,
		);
		if (!res.ok) return null;
		const data = (await res.json()) as {
			results?: {
				bindings?: Array<{
					awardLabel?: { value?: string };
					conferredLabel?: { value?: string };
				}>;
			};
		};
		const entries = (data.results?.bindings ?? [])
			.map((b) => ({
				title: b.awardLabel?.value?.trim() || '',
				conferredBy: b.conferredLabel?.value?.trim() || null,
			}))
			.filter((e) => e.title);
		if (!entries.length) return null;
		return serializeAccolades(groupAwardWins(entries), 'wikidata');
	} catch {
		return null;
	}
}

function resolveGoodreadsUrl(
	goodreadsId: string | null,
	isbns: string[],
): string | null {
	if (goodreadsId && /^\d+$/.test(goodreadsId)) {
		return `https://www.goodreads.com/book/show/${goodreadsId}`;
	}
	const isbn = isbns.find((v) => /^[\dXx-]{10,17}$/.test(v));
	if (isbn) {
		return `https://www.goodreads.com/book/isbn/${isbn.replace(/-/g, '')}`;
	}
	return null;
}

async function fetchOpenLibraryRating(workId: string): Promise<ExternalRating | null> {
	const id = workId.trim().replace(/^works\//, '');
	if (!/^OL\d+W$/i.test(id)) return null;
	try {
		const res = await fetchWithTimeout(
			`https://openlibrary.org/works/${id}/ratings.json`,
			{ headers: { Accept: 'application/json' } },
			3500,
		);
		if (!res.ok) return null;
		const data = (await res.json()) as {
			summary?: { average?: number; count?: number };
		};
		const average = data.summary?.average;
		const count = data.summary?.count;
		if (typeof average !== 'number' || average <= 0) return null;
		return {
			source: 'openlibrary',
			label: 'Open Library',
			value: average,
			scale: 5,
			count: typeof count === 'number' ? count : null,
			url: `https://openlibrary.org/works/${id}`,
		};
	} catch {
		return null;
	}
}

/** Optional OMDb lookup for IMDb community rating (needs OMDB_API_KEY). */
async function fetchImdbRatingViaOmdb(
	imdbId: string,
	apiKey?: string | null,
): Promise<ExternalRating | null> {
	const key = apiKey?.trim();
	const id = imdbId.trim();
	if (!key || !/^tt\d+$/.test(id)) return null;
	try {
		const url = `https://www.omdbapi.com/?${new URLSearchParams({
			i: id,
			apikey: key,
		})}`;
		const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 3500);
		if (!res.ok) return null;
		const data = (await res.json()) as {
			Response?: string;
			imdbRating?: string;
			imdbVotes?: string;
		};
		if (data.Response === 'False') return null;
		const value = Number(data.imdbRating);
		if (!Number.isFinite(value) || value <= 0) return null;
		const votes = data.imdbVotes ? Number(data.imdbVotes.replace(/,/g, '')) : null;
		return {
			source: 'imdb',
			label: 'IMDb',
			value,
			scale: 10,
			count: votes != null && Number.isFinite(votes) ? votes : null,
			url: `https://www.imdb.com/title/${id}/`,
		};
	} catch {
		return null;
	}
}

/**
 * TMDB does not expose awards. Resolve major wins via Wikidata using the film's IMDb id,
 * then group by awarding institution (Oscar, BAFTA, etc.).
 */
async function fetchFilmAccolades(imdbId: string): Promise<string | null> {
	const id = imdbId.trim();
	if (!/^tt\d+$/.test(id)) return null;
	return queryWikidataAwards(`?item wdt:P345 "${id}" .`);
}

/** Accepts "2020", "September 2020", "2020-09-01", etc. → YYYY-MM-DD or YYYY-MM-01 or YYYY-01-01 */
function normalizeLooseDate(value: string | null | undefined): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
	if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
	if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`;
	const parsed = Date.parse(trimmed);
	if (!Number.isNaN(parsed)) {
		const d = new Date(parsed);
		const y = d.getUTCFullYear();
		const m = String(d.getUTCMonth() + 1).padStart(2, '0');
		const day = String(d.getUTCDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}
	return null;
}
