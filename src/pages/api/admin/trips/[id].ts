import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminAuthorized, unauthorizedResponse } from '../../../../lib/auth';
import {
	deleteTrip,
	getTripWithItems,
	parseTripInput,
	updateTrip,
} from '../../../../lib/trips';

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
	if (!isAdminAuthorized(request, env)) return unauthorizedResponse();
	const id = params.id;
	if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

	const trip = await getTripWithItems(env.DB, id);
	if (!trip) return Response.json({ error: 'Not found' }, { status: 404 });
	return Response.json(trip);
};

export const PUT: APIRoute = async ({ request, params }) => {
	if (!isAdminAuthorized(request, env)) return unauthorizedResponse();
	const id = params.id;
	if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

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

	const trip = await updateTrip(env.DB, id, parsed);
	if (!trip) return Response.json({ error: 'Not found' }, { status: 404 });
	return Response.json(trip);
};

export const DELETE: APIRoute = async ({ request, params }) => {
	if (!isAdminAuthorized(request, env)) return unauthorizedResponse();
	const id = params.id;
	if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

	const deleted = await deleteTrip(env.DB, id);
	if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 });
	return Response.json({ ok: true });
};
