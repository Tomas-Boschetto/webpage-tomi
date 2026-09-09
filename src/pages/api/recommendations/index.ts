import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { listPublished } from '../../../lib/db';
import { isRecommendationType } from '../../../lib/types';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	const typeParam = url.searchParams.get('type');
	const type = isRecommendationType(typeParam) ? typeParam : undefined;
	const items = await listPublished(env.DB, type);
	return Response.json(items, {
		headers: {
			'Cache-Control': 'public, max-age=30',
		},
	});
};
