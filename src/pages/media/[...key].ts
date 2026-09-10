import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { contentTypeFromKey } from '../../lib/media';

export const prerender = false;

type MediaEnv = typeof env & { MEDIA?: R2Bucket };

export const GET: APIRoute = async ({ params }) => {
	const raw = params.key;
	const key = Array.isArray(raw) ? raw.join('/') : raw;
	if (!key || key.includes('..')) {
		return new Response('Not found', { status: 404 });
	}

	const media = (env as MediaEnv).MEDIA;
	if (!media) {
		return new Response('Media storage unavailable', { status: 503 });
	}

	const object = await media.get(key);
	if (!object) {
		return new Response('Not found', { status: 404 });
	}

	const headers = new Headers();
	headers.set(
		'Content-Type',
		object.httpMetadata?.contentType || contentTypeFromKey(key),
	);
	headers.set('Cache-Control', 'public, max-age=31536000, immutable');
	if (object.httpEtag) headers.set('ETag', object.httpEtag);

	return new Response(object.body, { headers });
};
