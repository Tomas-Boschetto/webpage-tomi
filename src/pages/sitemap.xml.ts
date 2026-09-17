import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { absoluteUrl, getSiteUrl } from '../lib/site';
import { listPublished } from '../lib/db';
import { listPublishedTrips } from '../lib/trips';
import { LOCALES, DEFAULT_LOCALE, localizedPath } from '../i18n/locales';

export const prerender = false;

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function alternateLinks(siteUrl: string, pathNoLocale: string, search = '') {
	return LOCALES.map((loc) => {
		const href = absoluteUrl(siteUrl, localizedPath(loc, pathNoLocale) + search);
		return `    <xhtml:link rel="alternate" hreflang="${loc}" href="${escapeXml(href)}" />`;
	}).join('\n');
}

function urlEntry(
	siteUrl: string,
	pathNoLocale: string,
	locale: (typeof LOCALES)[number],
	lastmod?: string | null,
	changefreq = 'weekly',
	priority = '0.7',
	search = '',
) {
	const loc = absoluteUrl(siteUrl, localizedPath(locale, pathNoLocale) + search);
	const last =
		lastmod && /^\d{4}-\d{2}-\d{2}/.test(lastmod)
			? `\n    <lastmod>${escapeXml(lastmod.slice(0, 10))}</lastmod>`
			: '';
	return `  <url>
    <loc>${escapeXml(loc)}</loc>${last}
${alternateLinks(siteUrl, pathNoLocale, search)}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absoluteUrl(siteUrl, (pathNoLocale === '/' ? '/' : pathNoLocale) + search))}" />
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export const GET: APIRoute = async () => {
	const siteUrl = getSiteUrl(env);
	const trips = await listPublishedTrips(env.DB);
	const recs = await listPublished(env.DB);

	const staticPages = [
		{ path: '/', priority: '1.0', changefreq: 'weekly', search: '' },
		{ path: '/about', priority: '0.8', changefreq: 'monthly', search: '' },
		{ path: '/recommendations', priority: '0.9', changefreq: 'daily', search: '?type=travel' },
		{ path: '/recommendations', priority: '0.9', changefreq: 'daily', search: '?type=book' },
		{ path: '/recommendations', priority: '0.9', changefreq: 'daily', search: '?type=movie' },
		{ path: '/contact', priority: '0.5', changefreq: 'yearly', search: '' },
		{ path: '/disclaimer', priority: '0.3', changefreq: 'yearly', search: '' },
	];

	const entries: string[] = [];
	for (const page of staticPages) {
		for (const locale of LOCALES) {
			entries.push(
				urlEntry(siteUrl, page.path, locale, null, page.changefreq, page.priority, page.search),
			);
		}
	}
	for (const item of recs) {
		for (const locale of LOCALES) {
			entries.push(
				urlEntry(
					siteUrl,
					`/recommendations/${item.id}`,
					locale,
					item.updated_at || item.created_at,
					'monthly',
					'0.8',
				),
			);
		}
	}
	for (const trip of trips) {
		for (const locale of LOCALES) {
			entries.push(
				urlEntry(
					siteUrl,
					`/trips/${trip.id}`,
					locale,
					trip.updated_at || trip.created_at,
					'monthly',
					'0.7',
				),
			);
		}
	}

	void DEFAULT_LOCALE;

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
