import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { absoluteUrl, getSiteUrl } from '../lib/site';
import { listPublished } from '../lib/db';
import { listPublishedTrips } from '../lib/trips';

export const prerender = false;

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function urlEntry(loc: string, lastmod?: string | null, changefreq = 'weekly', priority = '0.7') {
	const last =
		lastmod && /^\d{4}-\d{2}-\d{2}/.test(lastmod)
			? `\n    <lastmod>${escapeXml(lastmod.slice(0, 10))}</lastmod>`
			: '';
	return `  <url>
    <loc>${escapeXml(loc)}</loc>${last}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export const GET: APIRoute = async () => {
	const siteUrl = getSiteUrl(env);
	const trips = await listPublishedTrips(env.DB);
	const recs = await listPublished(env.DB);

	const staticPages = [
		{ path: '/', priority: '1.0', changefreq: 'weekly' },
		{ path: '/about', priority: '0.8', changefreq: 'monthly' },
		{ path: '/recommendations?type=movie', priority: '0.9', changefreq: 'daily' },
		{ path: '/recommendations?type=book', priority: '0.9', changefreq: 'daily' },
		{ path: '/recommendations?type=travel', priority: '0.9', changefreq: 'daily' },
		{ path: '/contact', priority: '0.5', changefreq: 'yearly' },
		{ path: '/disclaimer', priority: '0.3', changefreq: 'yearly' },
	];

	const entries = [
		...staticPages.map((page) =>
			urlEntry(absoluteUrl(siteUrl, page.path), null, page.changefreq, page.priority),
		),
		...recs.map((item) =>
			urlEntry(
				absoluteUrl(siteUrl, `/recommendations/${item.id}`),
				item.updated_at || item.created_at,
				'monthly',
				'0.8',
			),
		),
		...trips.map((trip) =>
			urlEntry(
				absoluteUrl(siteUrl, `/trips/${trip.id}`),
				trip.updated_at || trip.created_at,
				'monthly',
				'0.7',
			),
		),
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
