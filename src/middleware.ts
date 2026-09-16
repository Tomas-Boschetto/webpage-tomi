import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { getSiteUrl } from './lib/site';

/**
 * Send www (and any other public host) to the SITE_URL origin so Google
 * does not treat those URLs as a second indexable copy of each page.
 */
export const onRequest = defineMiddleware((context, next) => {
	const host = context.url.hostname;
	if (host === 'localhost' || host === '127.0.0.1') {
		return next();
	}

	let canonicalHost: string | undefined;
	try {
		canonicalHost = new URL(getSiteUrl(env)).hostname;
	} catch {
		canonicalHost = context.site?.hostname;
	}
	if (!canonicalHost || host === canonicalHost) {
		return next();
	}

	const dest = new URL(context.url.pathname + context.url.search, `https://${canonicalHost}`);
	return context.redirect(dest.href, 301);
});
