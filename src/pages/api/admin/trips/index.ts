import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminAuthorized, unauthorizedResponse } from '../../../../lib/auth';
import { createTrip, listAllTrips, parseTripInput } from '../../../../lib/trips';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
	if (!isAdminAuthorized(request, env)) return unauthorizedResponse();
	return Response.json(await listAllTrips(env.DB));
};

export const POST: APIRoute = async ({ request }) => {
	if (!isAdminAuthorized(request, env)) return unauthorizedResponse();

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const parsed = parseTripInput(body);
	if ('error' in parsed) {
		return Response.json({ error: parsed.error }, { status: 400 });
	}

	const trip = await createTrip(env.DB, parsed);
	return Response.json(trip, { status: 201 });
};
