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
