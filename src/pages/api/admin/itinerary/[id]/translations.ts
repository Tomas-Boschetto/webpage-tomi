import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminAuthorized, unauthorizedResponse } from '../../../../../lib/auth';
import { getItineraryItem } from '../../../../../lib/trips';
import { listTranslationsForStop, upsertStopTranslation } from '../../../../../lib/i18n-content';
import { CONTENT_LOCALES, isLocale } from '../../../../../i18n/locales';

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
	if (!isAdminAuthorized(request, env)) return unauthorizedResponse();
	const id = params.id;
	if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
	const item = await getItineraryItem(env.DB, id);
	if (!item) return Response.json({ error: 'Not found' }, { status: 404 });
	const translations = await listTranslationsForStop(env.DB, id);
	return Response.json({ item, translations });
};

export const PUT: APIRoute = async ({ request, params }) => {
	if (!isAdminAuthorized(request, env)) return unauthorizedResponse();
	const id = params.id;
	if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
	const item = await getItineraryItem(env.DB, id);
	if (!item) return Response.json({ error: 'Not found' }, { status: 404 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Invalid JSON' }, { status: 400 });
	}
	const data = body as Record<string, unknown>;
	const locale = String(data.locale || '');
	if (!isLocale(locale) || locale === 'en' || !CONTENT_LOCALES.includes(locale as (typeof CONTENT_LOCALES)[number])) {
		return Response.json({ error: 'locale must be it, es, de, or fr' }, { status: 400 });
	}

	await upsertStopTranslation(env.DB, id, locale, {
		place_name: typeof data.place_name === 'string' ? data.place_name : null,
		notes: typeof data.notes === 'string' ? data.notes : null,
		how_i_got_there: typeof data.how_i_got_there === 'string' ? data.how_i_got_there : null,
		country_name: typeof data.country_name === 'string' ? data.country_name : null,
	});

	const translations = await listTranslationsForStop(env.DB, id);
	return Response.json({ ok: true, translations });
};
