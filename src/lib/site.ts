import { localizedPath, stripLocalePrefix, type Locale } from '../i18n/locales';

/** Canonical public origin for SEO (sitemap, Open Graph, JSON-LD). */
export function getSiteUrl(env: { SITE_URL?: string }): string {
	const raw = (env.SITE_URL || 'https://tomasboschetto.com').trim().replace(/\/+$/, '');
	return raw || 'https://tomasboschetto.com';
}

export function absoluteUrl(siteUrl: string, path: string): string {
	if (path.startsWith('http://') || path.startsWith('https://')) return path;
	const base = siteUrl.replace(/\/+$/, '');
	const suffix = path.startsWith('/') ? path : `/${path}`;
	return `${base}${suffix}`;
}

const INDEXABLE_REC_TYPES = new Set(['movie', 'book', 'travel']);

/**
 * Query string that belongs on the canonical URL.
 * Movie / book / travel tabs are distinct indexable pages (see sitemap);
 * filters like sort, genre, and country stay off the canonical.
 */
export function canonicalQuery(pathname: string, searchParams: URLSearchParams): string {
	const pathNoLocale = stripLocalePrefix(pathname);
	if (pathNoLocale !== '/recommendations') return '';
	const type = searchParams.get('type');
	if (type && INDEXABLE_REC_TYPES.has(type)) return `?type=${type}`;
	return '';
}

/** Locale-prefixed path plus indexable query, for canonical / hreflang / og:url. */
export function localizedCanonicalPath(
	locale: Locale,
	pathname: string,
	searchParams: URLSearchParams,
): string {
	const pathNoLocale = stripLocalePrefix(pathname);
	const path =
		pathNoLocale === '/' || pathNoLocale === ''
			? localizedPath(locale, '/')
			: localizedPath(locale, pathNoLocale);
	return `${path}${canonicalQuery(pathname, searchParams)}`;
}
