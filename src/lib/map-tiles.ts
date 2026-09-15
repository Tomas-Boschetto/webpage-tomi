/**
 * Theme-aware raster tiles.
 * CARTO Dark Matter / Positron now watermark "API key required" without a key,
 * so these are Esri Canvas Gray (dark/light), which need no key.
 */

export const MAP_TILE_ATTRIBUTION =
	'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, TomTom, Garmin, FAO, NOAA, USGS';

export const MAP_TILES = {
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
} as const;

export type MapTheme = keyof typeof MAP_TILES;

export function mapThemeFromMedia(dark: boolean): MapTheme {
	return dark ? 'dark' : 'light';
}
