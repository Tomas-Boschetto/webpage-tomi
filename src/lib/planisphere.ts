/** Equirectangular fit of `world.svg` (viewBox 0 0 1000 500). */
export function projectLatLng(lat: number, lng: number): { x: number; y: number } {
	return {
		x: ((lng + 180) / 360) * 1000,
		y: ((90 - lat) / 180) * 500,
	};
}

export function geoCentroid(
	points: Array<{ lat: number; lng: number }>,
): { lat: number; lng: number } | null {
	if (!points.length) return null;
	const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
	const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;
	return { lat, lng };
}

export type TripMapPin = {
	id: string;
	title: string;
	summary: string;
	href: string;
	countries: string[];
	lat: number;
	lng: number;
	byCountry: Record<string, { lat: number; lng: number }>;
};

export function tripSummaryTeaser(summary: string, words = 16): string {
	const parts = summary.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '';
	if (parts.length <= words) return parts.join(' ');
	return `${parts.slice(0, words).join(' ')}…`;
}
