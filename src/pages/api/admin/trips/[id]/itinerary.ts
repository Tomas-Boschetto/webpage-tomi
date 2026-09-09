import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminAuthorized, unauthorizedResponse } from '../../../../../lib/auth';
import {
	createItineraryItem,
	getTripById,
	parseItineraryItemInput,
} from '../../../../../lib/trips';

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
	if (!isAdminAuthorized(request, env)) return unauthorizedResponse();
	const tripId = params.id;
	if (!tripId) return Response.json({ error: 'Missing trip id' }, { status: 400 });

	const trip = await getTripById(env.DB, tripId);
	if (!trip) return Response.json({ error: 'Trip not found' }, { status: 404 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const parsed = parseItineraryItemInput(body);
	if ('error' in parsed) {
		return Response.json({ error: parsed.error }, { status: 400 });
	}

	const item = await createItineraryItem(env.DB, tripId, parsed);
	return Response.json(item, { status: 201 });
};
