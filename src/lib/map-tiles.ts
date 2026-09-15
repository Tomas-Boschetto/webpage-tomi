/**
 * Theme-aware raster tiles.
 * CARTO Dark Matter / Positron when `CARTO_API_KEY` is set; otherwise Esri Canvas Gray
 * (CARTO watermarks unkeyed raster requests).
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

const ESRI_TILES: MapTileSet = {
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

export function mapTiles(cartoKey?: string): MapTileSet {
	const key = cartoKey?.trim();
	if (!key) return ESRI_TILES;

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
