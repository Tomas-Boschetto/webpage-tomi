import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminAuthorized, unauthorizedResponse } from '../../../lib/auth';
import { searchPlaces } from '../../../lib/geocode';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
	if (!isAdminAuthorized(request, env)) return unauthorizedResponse();

	const q = new URL(request.url).searchParams.get('q') || '';
	const result = await searchPlaces(q);
	if ('error' in result) {
		const status = result.error.startsWith('Enter at least') ? 400 : 502;
		return Response.json({ error: result.error }, { status });
	}
	return Response.json({ results: result });
};
