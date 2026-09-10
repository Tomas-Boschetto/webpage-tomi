import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminAuthorized, unauthorizedResponse } from '../../../../lib/auth';
import { deleteMediaObject } from '../../../../lib/media';
import {
	deleteItineraryItem,
	parseItineraryItemInput,
	updateItineraryItem,
} from '../../../../lib/trips';

export const prerender = false;

type MediaEnv = typeof env & { MEDIA?: R2Bucket };

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

	const parsed = parseItineraryItemInput(body);
	if ('error' in parsed) {
		return Response.json({ error: parsed.error }, { status: 400 });
	}

	const item = await updateItineraryItem(env.DB, id, parsed);
	if (!item) return Response.json({ error: 'Not found' }, { status: 404 });
	return Response.json(item);
};

export const DELETE: APIRoute = async ({ request, params }) => {
	if (!isAdminAuthorized(request, env)) return unauthorizedResponse();
	const id = params.id;
	if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

	const removed = await deleteItineraryItem(env.DB, id);
	if (!removed) return Response.json({ error: 'Not found' }, { status: 404 });

	await deleteMediaObject((env as MediaEnv).MEDIA, removed.image_url);
	return Response.json({ ok: true });
};
