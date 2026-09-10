import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminAuthorized, unauthorizedResponse } from '../../../lib/auth';
import { lookupTripCover } from '../../../lib/covers';

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
	const query = typeof data.query === 'string' ? data.query : typeof data.title === 'string' ? data.title : '';

	const result = await lookupTripCover(query, env.UNSPLASH_ACCESS_KEY || '');
	if ('error' in result) {
		const status = result.error.includes('UNSPLASH_ACCESS_KEY') ? 503 : 404;
		return Response.json({ error: result.error }, { status });
	}

	return Response.json(result);
};
