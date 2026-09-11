import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminAuthorized, unauthorizedResponse } from '../../../lib/auth';
import { searchPlaces } from '../../../lib/geocode';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
	if (!isAdminAuthorized(request, env)) return unauthorizedResponse();

	const q = new URL(request.url).searchParams.get('q') || '';
	const googleApiKey = (env as Env & { GOOGLE_MAPS_API_KEY?: string }).GOOGLE_MAPS_API_KEY || '';
	const result = await searchPlaces(q, { googleApiKey });
	if ('error' in result) {
		const status = result.error.startsWith('Enter at least')
			? 400
			: result.error.includes('GOOGLE_MAPS_API_KEY')
				? 503
				: 502;
		return Response.json({ error: result.error }, { status });
	}
	return Response.json({
		results: result,
		provider: googleApiKey ? 'google' : 'nominatim',
	});
};
