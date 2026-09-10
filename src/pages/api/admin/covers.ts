import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminAuthorized, unauthorizedResponse } from '../../../lib/auth';
import { lookupBookCover, lookupMovieCover } from '../../../lib/covers';
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
	const type = data.type;
	const title = typeof data.title === 'string' ? data.title : '';
	const creator = typeof data.creator === 'string' ? data.creator : '';
	const year = typeof data.year === 'string' ? data.year : null;

	if (!isRecommendationType(type)) {
		return Response.json({ error: 'type must be movie or book' }, { status: 400 });
	}

	const result =
		type === 'movie'
			? await lookupMovieCover(title, env.TMDB_API_KEY || '', {
					year,
					director: creator,
				})
			: await lookupBookCover(title, { author: creator });

	if ('error' in result) {
		const status = result.error.includes('TMDB_API_KEY') ? 503 : 404;
		return Response.json({ error: result.error }, { status });
	}

	return Response.json(result);
};
