/**
 * Theme-aware raster tiles.
 * CARTO Dark Matter / Positron when `CARTO_API_KEY` is set *and* the page is
 * served from the live site host (CARTO keys are hostname-restricted).
 * Otherwise Esri Canvas Gray — CARTO watermarks or 403s unkeyed / disallowed hosts.
 */

export type MapTileSpec = {
	url: string;
	labels?: string;
	casing: string;
	maxZoom: number;
	subdomains?: string;
};

export type MapTileSet = {
	dark: MapTileSpec;
	light: MapTileSpec;
	attribution: string;
};

const ESRI_ATTR =
	'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, TomTom, Garmin, FAO, NOAA, USGS';

const CARTO_ATTR =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const ESRI_TILES: MapTileSet = {
	dark: {
		url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
		labels:
			'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
		casing: '#0a1412',
		maxZoom: 16,
	},
	light: {
		url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
		labels:
			'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
		casing: '#fffdf8',
		maxZoom: 16,
	},
	attribution: ESRI_ATTR,
};

function hostAliases(hostname: string): string[] {
	const host = hostname.trim().toLowerCase().replace(/\.$/, '');
	if (!host) return [];
	const bare = host.replace(/^www\./, '');
	return bare === host ? [host, `www.${host}`] : [host, bare];
}

/** CARTO raster keys are typically locked to the production hostname, not localhost. */
export function cartoHostAllowed(hostname?: string, siteUrl?: string): boolean {
	const host = (hostname || '').trim().toLowerCase().replace(/\.$/, '');
	if (
		!host ||
		host === 'localhost' ||
		host === '127.0.0.1' ||
		host === '[::1]' ||
		host === '0.0.0.0' ||
		host.endsWith('.localhost') ||
		host.endsWith('.local') ||
		host.endsWith('.workers.dev') ||
		host.endsWith('.pages.dev')
	) {
		return false;
	}

	if (!siteUrl?.trim()) return false;
	try {
		const siteHost = new URL(siteUrl).hostname;
		return hostAliases(siteHost).includes(host);
	} catch {
		return false;
	}
}

export function mapTiles(cartoKey?: string, hostname?: string, siteUrl?: string): MapTileSet {
	const key = cartoKey?.trim();
	if (!key || !cartoHostAllowed(hostname, siteUrl)) return ESRI_TILES;

	const q = `?key=${encodeURIComponent(key)}`;
	return {
		dark: {
			url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${q}`,
			casing: '#0a1412',
			maxZoom: 20,
			subdomains: 'abcd',
		},
		light: {
			url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${q}`,
			casing: '#fffdf8',
			maxZoom: 20,
			subdomains: 'abcd',
		},
		attribution: CARTO_ATTR,
	};
}
