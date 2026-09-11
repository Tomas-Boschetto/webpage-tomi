import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminAuthorized, unauthorizedResponse } from '../../../lib/auth';
import { searchBooks, searchMovies, selectBook, selectMovie } from '../../../lib/lookup';
import { isRecommendationType } from '../../../lib/types';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	if (!isAdminAuthorized(request, env)) return unauthorizedResponse();

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Invalid JSON' }, { status: 400 });
	}
	if (!body || typeof body !== 'object') {
		return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const data = body as Record<string, unknown>;
	const action = data.action === 'select' ? 'select' : 'search';
	const type = data.type;
	if (!isRecommendationType(type)) {
		return Response.json({ error: 'type must be movie or book' }, { status: 400 });
	}

	if (action === 'search') {
		const query = typeof data.query === 'string' ? data.query : typeof data.title === 'string' ? data.title : '';
		const creator = typeof data.creator === 'string' ? data.creator : '';
		const result =
			type === 'movie'
				? await searchMovies(query, env.TMDB_API_KEY || '')
				: await searchBooks(query, { author: creator });
		if ('error' in result) {
			const status = result.error.includes('TMDB_API_KEY') ? 503 : 404;
			return Response.json({ error: result.error }, { status });
		}
		return Response.json(result);
	}

	const id = typeof data.id === 'string' ? data.id : '';
	if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

	const result =
		type === 'movie'
			? await selectMovie(id, env.TMDB_API_KEY || '', {
					omdbApiKey: (env as Env & { OMDB_API_KEY?: string }).OMDB_API_KEY,
				})
			: await selectBook(id);

	if ('error' in result) {
		const status = result.error.includes('TMDB_API_KEY') ? 503 : 404;
		return Response.json({ error: result.error }, { status });
	}
	return Response.json(result);
};
