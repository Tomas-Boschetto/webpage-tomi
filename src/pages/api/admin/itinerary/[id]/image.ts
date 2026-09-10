import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
	ALLOWED_STOP_IMAGE_TYPES,
	MAX_STOP_IMAGE_BYTES,
	deleteMediaObject,
	extensionForType,
	mediaUrlFromKey,
} from '../../../../../lib/media';
import { isAdminAuthorized, unauthorizedResponse } from '../../../../../lib/auth';
import {
	getItineraryItem,
	setItineraryItemImageUrl,
} from '../../../../../lib/trips';

export const prerender = false;

type MediaEnv = typeof env & { MEDIA?: R2Bucket };

export const POST: APIRoute = async ({ request, params }) => {
	if (!isAdminAuthorized(request, env)) return unauthorizedResponse();
	const id = params.id;
	if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

	const media = (env as MediaEnv).MEDIA;
	if (!media) {
		return Response.json(
			{ error: 'MEDIA R2 bucket is not bound. Create webpage-tomi-media and redeploy.' },
			{ status: 503 },
		);
	}

	const item = await getItineraryItem(env.DB, id);
	if (!item) return Response.json({ error: 'Not found' }, { status: 404 });

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return Response.json({ error: 'Expected multipart form data' }, { status: 400 });
	}

	const file = form.get('file');
	if (!(file instanceof File)) {
		return Response.json({ error: 'file is required' }, { status: 400 });
	}

	const type = (file.type || '').toLowerCase();
	if (!ALLOWED_STOP_IMAGE_TYPES.has(type)) {
		return Response.json({ error: 'Use JPEG, PNG, or WebP images only.' }, { status: 400 });
	}
	if (file.size <= 0 || file.size > MAX_STOP_IMAGE_BYTES) {
		return Response.json(
			{ error: `Image must be under ${Math.round(MAX_STOP_IMAGE_BYTES / 1024)}KB after resize.` },
			{ status: 400 },
		);
	}

	const bytes = await file.arrayBuffer();
	const key = `trips/${item.trip_id}/stops/${item.id}/${crypto.randomUUID()}.${extensionForType(type)}`;

	await media.put(key, bytes, {
		httpMetadata: { contentType: type },
	});

	const previousUrl = item.image_url;
	const imageUrl = mediaUrlFromKey(key);
	const updated = await setItineraryItemImageUrl(env.DB, id, imageUrl);
	if (!updated) {
		await media.delete(key);
		return Response.json({ error: 'Failed to save image URL' }, { status: 500 });
	}

	if (previousUrl && previousUrl !== imageUrl) {
		await deleteMediaObject(media, previousUrl);
	}

	return Response.json(updated);
};

export const DELETE: APIRoute = async ({ request, params }) => {
	if (!isAdminAuthorized(request, env)) return unauthorizedResponse();
	const id = params.id;
	if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

	const media = (env as MediaEnv).MEDIA;
	const item = await getItineraryItem(env.DB, id);
	if (!item) return Response.json({ error: 'Not found' }, { status: 404 });

	const updated = await setItineraryItemImageUrl(env.DB, id, null);
	await deleteMediaObject(media, item.image_url);

	return Response.json(updated);
};
