import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminAuthorized, unauthorizedResponse } from '../../../../lib/auth';
import { createRecommendation, listAll, parseRecommendationInput } from '../../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
	if (!isAdminAuthorized(request, env)) return unauthorizedResponse();
	const items = await listAll(env.DB);
	return Response.json(items);
};

export const POST: APIRoute = async ({ request }) => {
	if (!isAdminAuthorized(request, env)) return unauthorizedResponse();

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const parsed = parseRecommendationInput(body);
	if ('error' in parsed) {
		return Response.json({ error: parsed.error }, { status: 400 });
	}

	const item = await createRecommendation(env.DB, parsed);
	return Response.json(item, { status: 201 });
};
