/** CARTO basemaps (OSM data). Dark Matter in dark mode, Positron in light. */

export const MAP_TILE_ATTRIBUTION =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const MAP_TILES = {
	dark: {
		url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
		casing: '#0a1412',
	},
	light: {
		url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
		casing: '#fffdf8',
	},
} as const;

export type MapTheme = keyof typeof MAP_TILES;

export function mapThemeFromMedia(dark: boolean): MapTheme {
	return dark ? 'dark' : 'light';
}
