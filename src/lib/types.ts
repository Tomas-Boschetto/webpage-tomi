export type RecommendationType = 'movie' | 'book';

export type PlaceType =
	| 'restaurant'
	| 'historic'
	| 'attraction'
	| 'recreational'
	| 'lodging'
	| 'other';

export type TransportMode =
	| 'walk'
	| 'transit'
	| 'taxi'
	| 'car'
	| 'bike'
	| 'flight'
	| 'boat'
	| 'other';

export interface Recommendation {
	id: string;
	type: RecommendationType;
	title: string;
	summary: string;
	commentary: string | null;
	url: string | null;
	image_url: string | null;
	rating: number | null;
	genre: string | null;
	director: string | null;
	cast_members: string | null;
	imdb_url: string | null;
	goodreads_url: string | null;
	experienced_at: string | null;
	edition_published_at: string | null;
	original_published_at: string | null;
	accolades: string | null;
	external_ratings: string | null;
	published: number;
	created_at: string;
	updated_at: string;
}

export interface RecommendationInput {
	type: RecommendationType;
	title: string;
	summary: string;
	commentary?: string | null;
	url?: string | null;
	image_url?: string | null;
	rating?: number | null;
	genre?: string | null;
	director?: string | null;
	cast_members?: string | null;
	imdb_url?: string | null;
	goodreads_url?: string | null;
	experienced_at?: string | null;
	edition_published_at?: string | null;
	original_published_at?: string | null;
	accolades?: string | null;
	external_ratings?: string | null;
	published?: boolean;
}

export interface Trip {
	id: string;
	title: string;
	summary: string;
	image_url: string | null;
	published: number;
	created_at: string;
	updated_at: string;
}

export interface TripInput {
	title: string;
	summary: string;
	image_url?: string | null;
	published?: boolean;
}

export interface ItineraryItem {
	id: string;
	trip_id: string;
	place_name: string;
	place_type: PlaceType;
	transport_mode: TransportMode;
	how_i_got_there: string;
	visited_at: string;
	notes: string | null;
	url: string | null;
	image_url: string | null;
	lat: number | null;
	lng: number | null;
	country_code: string;
	country_name: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

export interface ItineraryItemInput {
	place_name: string;
	place_type: PlaceType;
	transport_mode: TransportMode;
	how_i_got_there?: string;
	visited_at: string;
	notes?: string | null;
	url?: string | null;
	lat?: number | null;
	lng?: number | null;
	country_code: string;
	country_name: string;
	sort_order?: number;
}

export interface TripWithItems extends Trip {
	items: ItineraryItem[];
}

export interface VisitedCountry {
	country_code: string;
	name: string;
	notes: string | null;
	created_at: string;
}

export interface VisitedCountryInput {
	country_code: string;
	name: string;
	notes?: string | null;
}

export const RECOMMENDATION_TYPES: RecommendationType[] = ['movie', 'book'];

export const PLACE_TYPES: PlaceType[] = [
	'restaurant',
	'historic',
	'attraction',
	'recreational',
	'lodging',
	'other',
];

export const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
	restaurant: 'Restaurant',
	historic: 'Historic marker',
	attraction: 'Attraction',
	recreational: 'Recreational',
	lodging: 'Lodging',
	other: 'Other',
};

export const TRANSPORT_MODES: TransportMode[] = [
	'walk',
	'transit',
	'taxi',
	'car',
	'bike',
	'flight',
	'boat',
	'other',
];

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
	walk: 'Walk',
	transit: 'Transit',
	taxi: 'Taxi / rideshare',
	car: 'Car',
	bike: 'Bike',
	flight: 'Flight',
	boat: 'Boat',
	other: 'Other',
};

/** Stroke styles for Leaflet paths between stops. */
export const TRANSPORT_MODE_MAP_STYLE: Record<
	TransportMode,
	{ color: string; dashArray?: string; weight: number }
> = {
	walk: { color: '#c4a574', dashArray: '2 8', weight: 3 },
	transit: { color: '#d9773a', weight: 4 },
	taxi: { color: '#e8b84a', dashArray: '8 6', weight: 3 },
	car: { color: '#7a9e8e', weight: 4 },
	bike: { color: '#6b9f7a', dashArray: '6 4', weight: 3 },
	flight: { color: '#8b9dc3', dashArray: '12 8', weight: 3 },
	boat: { color: '#5b8fa8', dashArray: '10 5', weight: 3 },
	other: { color: '#9a9588', dashArray: '4 6', weight: 3 },
};

export function isRecommendationType(value: unknown): value is RecommendationType {
	return value === 'movie' || value === 'book';
}

export function isPlaceType(value: unknown): value is PlaceType {
	return PLACE_TYPES.includes(value as PlaceType);
}

export function isTransportMode(value: unknown): value is TransportMode {
	return TRANSPORT_MODES.includes(value as TransportMode);
}

export function formatRating(rating: number | null | undefined): string | null {
	if (rating == null || Number.isNaN(rating)) return null;
	const clamped = Math.min(5, Math.max(0, rating));
	return `${clamped.toFixed(clamped % 1 === 0 ? 0 : 1)} / 5`;
}

/** Short genre line for cards/headers (full string stays in admin / filters). */
export function formatGenreBrief(genre: string | null | undefined, maxParts = 2): string {
	if (!genre?.trim()) return '';
	const parts = genre
		.split(/[,/|]/)
		.map((p) => p.trim())
		.filter(Boolean);
	if (!parts.length) return '';
	if (parts.length <= maxParts) return parts.join(', ');
	return `${parts.slice(0, maxParts).join(', ')}…`;
}

export function formatExperiencedAt(
	value: string | null | undefined,
	opts: { monthOnly?: boolean } = {},
): string {
	if (!value) return '';
	const raw = value.trim();
	const day = /^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : raw.slice(0, 10);
	const date = new Date(`${day}T12:00:00`);
	if (Number.isNaN(date.getTime())) return raw;
	if (opts.monthOnly) {
		return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
	}
	return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function formatEditionPublished(value: string | null | undefined): string {
	if (!value) return '';
	const day = value.trim().slice(0, 10);
	if (/^\d{4}-01-01$/.test(day)) return day.slice(0, 4);
	if (/^\d{4}-\d{2}-01$/.test(day)) {
		const date = new Date(`${day}T12:00:00`);
		if (!Number.isNaN(date.getTime())) {
			return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
		}
	}
	const date = new Date(`${day}T12:00:00`);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}
