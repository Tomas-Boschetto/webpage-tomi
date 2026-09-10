import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminAuthorized } from '../../../lib/auth';
import { listCountriesFromStops } from '../../../lib/countries';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
	if (!isAdminAuthorized(request, env)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const countries = await listCountriesFromStops(env.DB, { publishedOnly: false });
	return new Response(JSON.stringify(countries), {
		headers: { 'Content-Type': 'application/json' },
	});
};
